export class ApiError extends Error {
  constructor(public status: number, message: string, public code = "error") {
    super(message);
    this.name = "ApiError";
  }
  /** Network failures and server errors are worth retrying; validation errors are not. */
  get retryable() {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown; timeoutMs?: number }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? 15_000);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    });
  } catch (e) {
    clearTimeout(timer);
    const aborted = e instanceof DOMException && e.name === "AbortError";
    throw new ApiError(0, aborted ? "The request timed out." : "You appear to be offline.", aborted ? "timeout" : "offline");
  }
  clearTimeout(timer);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const body = (data ?? {}) as { error?: string; code?: string };
    if (res.status === 401 && typeof window !== "undefined") {
      const here = window.location.pathname;
      // Session expired mid-use: a full navigation is intended (client state is stale).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (!here.startsWith("/login")) window.location.assign(`/login?from=${encodeURIComponent(here)}`);
    }
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.code);
  }
  return data as T;
}
