import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { requireAuth, type SafeUser } from "@/lib/auth/session";
import { Prisma } from "@prisma/client";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "error") {
    super(message);
    this.name = "HttpError";
  }
}

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: Request, user: SafeUser, params: P) => Promise<Response>;

/**
 * Wraps a route: authenticates, runs the handler, and turns thrown errors into
 * consistent JSON `{ error, code }` responses. Unknown errors are logged and returned as 500.
 */
export function withAuth<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: Request, ctx?: Ctx<P>): Promise<Response> => {
    try {
      const user = await requireAuth(req);
      const params = ctx ? await ctx.params : ({} as P);
      return await handler(req, user, params);
    } catch (error: unknown) {
      return errorResponse(error, req);
    }
  };
}

export function errorResponse(error: unknown, req?: Request): Response {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const path = first?.path?.length ? `${first.path.join(".")}: ` : "";
    return NextResponse.json(
      { error: `${path}${first?.message ?? "Invalid input"}`, code: "validation", issues: error.issues },
      { status: 400 }
    );
  }
  if (error && typeof error === "object" && (error as { name?: string }).name === "AuthError") {
    const e = error as { status: number; message: string };
    return NextResponse.json({ error: e.message, code: "unauthorized" }, { status: e.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "That already exists.", code: "duplicate" }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
    }
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error(`[${req?.method} ${req?.url}] database unavailable:`, error.message);
    return NextResponse.json(
      { error: "The database is unavailable. Your entry was kept on this device and will retry.", code: "db_unavailable" },
      { status: 503 }
    );
  }
  console.error(`[${req?.method} ${req?.url}]`, error);
  return NextResponse.json({ error: "Something went wrong on the server.", code: "server_error" }, { status: 500 });
}

/** Parse JSON body against a schema; throws ZodError / HttpError for the wrapper to format. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON.", "bad_json");
  }
  return schema.parse(json);
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const { searchParams } = new URL(req.url);
  return schema.parse(Object.fromEntries(searchParams.entries()));
}

export const json = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);
