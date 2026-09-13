import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE_NAME = "mealprep_session";
export const SESSION_EXPIRY_DAYS = 30;

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  status: "active" | "suspended";
  emailVerified: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

/**
 * Computes SHA-256 hash of a session token
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Extracts raw session token from Request or Next.js headers/cookies
 */
export async function getSessionToken(req?: Request): Promise<string | null> {
  // 1. Check Authorization header (Bearer token)
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) return token;
    }
  }

  // 2. Check Request Cookie header
  if (req) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const cookiesArr = cookieHeader.split(";");
      for (const c of cookiesArr) {
        const [name, ...val] = c.trim().split("=");
        if (name === SESSION_COOKIE_NAME) {
          return decodeURIComponent(val.join("="));
        }
      }
    }
  }

  // 3. Fallback to Next.js cookies() API
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) return token;
  } catch {
    // cookies() might not be available in all contexts
  }

  return null;
}

/**
 * Creates a new secure server-managed session
 */
export async function createSession(userId: string, req?: Request) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  if (req) {
    ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null;
    userAgent = req.headers.get("user-agent") || null;
  }

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return { session, rawToken, expiresAt };
}

/**
 * Retrieves the currently authenticated user, or null if not authenticated / expired / suspended
 */
export async function getCurrentUser(req?: Request): Promise<SafeUser | null> {
  const rawToken = await getSessionToken(req);
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });

  if (!session) return null;

  // Verify expiration
  if (new Date() > session.expiresAt) {
    // Delete expired session asynchronously
    prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Verify user is active
  if (session.user.status !== "active") {
    return null;
  }

  // Periodically touch lastActiveAt (at most once every 5 minutes to avoid DB pressure)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (session.lastActiveAt < fiveMinAgo) {
    prisma.session
      .update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => {});
  }

  const { passwordHash: _, ...safeUser } = session.user;
  return safeUser as SafeUser;
}

/**
 * Enforces authentication. Throws AuthError(401) if unauthenticated.
 */
export async function requireAuth(req?: Request): Promise<SafeUser> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new AuthError(401, "Authentication required. Please log in.");
  }
  return user;
}

/**
 * Enforces admin authorization. Throws AuthError(401) if unauthenticated or AuthError(403) if not an admin.
 */
export async function requireAdmin(req?: Request): Promise<SafeUser> {
  const user = await requireAuth(req);
  if (user.role !== "admin") {
    throw new AuthError(403, "Access denied. Administrator privileges required.");
  }
  return user;
}

/**
 * Invalidates a single session by raw token (e.g. on logout)
 */
export async function invalidateSession(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}

/**
 * Invalidates all active sessions for a user (e.g. on password change or account compromise)
 */
export async function invalidateAllUserSessions(userId: string, keepTokenHash?: string): Promise<void> {
  if (keepTokenHash) {
    await prisma.session.deleteMany({
      where: {
        userId,
        tokenHash: { not: keepTokenHash },
      },
    });
  } else {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }
}

/**
 * Sets the session cookie on a NextResponse
 */
export function setSessionCookie(response: NextResponse, rawToken: string, expiresAt: Date) {
  // Mark cookie as Secure whenever the app is served over HTTPS (incl. Cloudflare tunnel in dev)
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const isSecure = appUrl.startsWith("https://") || process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Clears the session cookie on a NextResponse
 */
export function clearSessionCookie(response: NextResponse) {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const isSecure = appUrl.startsWith("https://") || process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}
