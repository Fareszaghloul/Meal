/**
 * API tests run against a live server (default http://localhost:3100) with the
 * throwaway test account created by `node scratch/create-test-user.mjs`.
 */
export const BASE = process.env.TEST_BASE_URL || "http://localhost:3100";
const EMAIL = process.env.TEST_EMAIL || "e2e-test@mealprep.local";
const PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassword!2026";

let cookie: string | null = null;

export async function login(): Promise<string> {
  if (cookie) return cookie;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  const set = res.headers.get("set-cookie") ?? "";
  const m = set.match(/mealprep_session=([^;]+)/);
  if (!m) throw new Error("no session cookie");
  cookie = `mealprep_session=${m[1]}`;
  return cookie;
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
