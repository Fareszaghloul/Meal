import { assertTestDatabase } from "@/lib/testing/safety-guard";

/**
 * API tests run against an isolated test server (default http://localhost:3101)
 * backed by the dedicated PostgreSQL test database: 'meal_test'.
 */
export const BASE = process.env.TEST_BASE_URL || "http://localhost:3101";
const DEFAULT_EMAIL = process.env.TEST_EMAIL || "e2e-test@mealprep.local";
const DEFAULT_PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassword!2026";

let cookieMap = new Map<string, string>();
let safetyChecked = false;

async function ensureSafety() {
  if (!safetyChecked) {
    await assertTestDatabase();
    safetyChecked = true;
  }
}

export async function login(email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD): Promise<string> {
  await ensureSafety();
  if (cookieMap.has(email)) return cookieMap.get(email)!;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status} ${await res.text()}`);
  const set = res.headers.get("set-cookie") ?? "";
  const m = set.match(/mealprep_session=([^;]+)/);
  if (!m) throw new Error("no session cookie");
  const c = `mealprep_session=${m[1]}`;
  cookieMap.set(email, c);
  return c;
}

export async function call<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<{ status: number; body: T }> {
  const c = await login();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { cookie: c, ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: res.status, body: body as T };
}

/** A date far in the past so test rows never collide with real logging. */
export const TEST_DATE = "2001-01-15";
export const TEST_DATE_NEXT = "2001-01-16";

export async function cleanupTestDates() {
  for (const d of [TEST_DATE, TEST_DATE_NEXT]) {
    const { body } = await call<{ entries: { id: string }[] }>(`/api/food-log?date=${d}`);
    for (const e of body.entries ?? []) await call(`/api/food-log/${e.id}`, { method: "DELETE" });
  }
}
