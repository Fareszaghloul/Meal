import { expect, test, type Page } from "@playwright/test";

/**
 * Weight tracking, end to end, on the isolated test server (meal_test).
 * Runs in both the desktop and the iPhone 13 project. Uses the shared e2e account and clears its weight rows first.
 */
const EMAIL = process.env.TEST_EMAIL || "e2e-test@mealprep.local";
const PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassword!2026";

let sharedCookie: { name: string; value: string; domain: string; path: string } | null = null;

async function signIn(page: Page) {
  if (!sharedCookie) {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
    const session = (await page.context().cookies()).find((c) => c.name === "mealprep_session");
    if (session) sharedCookie = { name: session.name, value: session.value, domain: session.domain, path: session.path };
  } else {
    await page.context().addCookies([sharedCookie]);
  }
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return ymd(d);
};
const TODAY = daysAgo(0);

interface Entry {
  id: string;
  date: string;
  time: string | null;
  weightKg: number;
}

async function api(page: Page, method: "GET" | "POST" | "PUT" | "DELETE", url: string, data?: unknown) {
  const res = await page.request.fetch(url, { method, data });
  const text = await res.text();
  return { status: res.status(), body: text ? JSON.parse(text) : null };
}

async function wipeWeights(page: Page) {
  const { body } = await api(page, "GET", "/api/weight");
  // Deleting row by row is slow against the remote test database; do it in parallel batches.
  const all = [...body.entries, ...body.inbody] as Entry[];
  for (let i = 0; i < all.length; i += 10) await Promise.all(all.slice(i, i + 10).map((e) => api(page, "DELETE", `/api/weight?id=${e.id}`)));
}

/** Bulk-create readings in one request (the test database is remote; one POST per row is slow). */
async function seed(page: Page, rows: Array<{ date: string; time: string; weightKg: number }>) {
  const file = { app: "mealprep", version: 1, exportedAt: new Date().toISOString(), weight: rows.map((r) => ({ ...r, entryType: "daily" })) };
  const res = await api(page, "POST", "/api/import?dryRun=false", file);
  expect(res.status).toBe(200);
}

const currentKg = async (page: Page) => (await api(page, "GET", "/api/settings")).body.currentWeightKg as number | null;
const setUnits = (page: Page, system: "metric" | "imperial") => api(page, "PUT", "/api/settings", { measurementSystem: system });
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Log (or edit, when `editRow` is given) a reading through the real dialog. */
async function fillAndSave(page: Page, v: { date?: string; time?: string; weight?: string; notes?: string }, save = /^save/i) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  if (v.date) await dialog.getByLabel("Date").fill(v.date);
  if (v.time) await dialog.getByLabel("Time").fill(v.time);
  if (v.weight !== undefined) await dialog.getByLabel(/^Weight \(/).fill(v.weight);
  if (v.notes !== undefined) await dialog.getByLabel(/^Notes/).fill(v.notes);
  await dialog.getByRole("button", { name: save }).click();
  await expect(dialog).toBeHidden();
}

const logWeight = async (page: Page, v: Parameters<typeof fillAndSave>[1]) => {
  await page.getByRole("button", { name: /^log weight$/i }).first().click();
  await fillAndSave(page, v);
};

async function openRowMenu(page: Page, date: string, time: string, item: "Edit" | "Delete") {
  await page.getByRole("button", { name: `Actions for ${date} ${time}` }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

/** The weight row of the Today summary card (the sidebar also links to /weight). */
const todayWeight = (page: Page) => page.locator('section[aria-label="Daily nutrition summary"] a[href="/weight"]');
const summary = (page: Page) => page.locator('section[aria-label="Weight summary"]');

test.beforeEach(async ({ page }) => {
  // Weight writes for one user are serialised (Phase 9 row lock that keeps currentWeightKg from going stale under
  // concurrent writes), so the parallel wipe below of up to ~50 rows takes longer against the remote test database.
  test.setTimeout(150_000);
  await signIn(page);
  await wipeWeights(page);
  await setUnits(page, "metric");
  await api(page, "PUT", "/api/settings", { goalWeightKg: null });
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ baseURL: "http://localhost:3101" });
  await signIn(page);
  await wipeWeights(page);
  await setUnits(page, "metric");
  await page.close();
});

test("lifecycle: log, edit history, edit today, second weigh-in, Today, History, delete, reload", async ({ page }) => {
  const HIST = daysAgo(3);
  const GAP = daysAgo(1); // between HIST and today: no reading
  const BEFORE = daysAgo(5); // before the first reading

  await page.goto("/weight");
  await expect(page.getByText("No weigh-ins yet")).toBeVisible();

  // Log a historical weight, then today's.
  await logWeight(page, { date: HIST, time: "07:00", weight: "80" });
  await expect(summary(page)).toContainText(/Latest\s*80\.0/);
  await logWeight(page, { date: TODAY, time: "08:00", weight: "82.4" });
  await expect(summary(page)).toContainText(/Latest\s*82\.4/);
  expect(await currentKg(page)).toBe(82.4);

  // Editing the historical entry must not change the current weight.
  await openRowMenu(page, HIST, "07:00", "Edit");
  await fillAndSave(page, { weight: "79" }, /save changes/i);
  await expect(page.getByTestId("weigh-in-row").filter({ hasText: "79.0 kg" })).toHaveCount(1);
  await expect(summary(page)).toContainText(/Latest\s*82\.4/);
  expect(await currentKg(page)).toBe(82.4);

  // Editing today's entry updates it.
  await openRowMenu(page, TODAY, "08:00", "Edit");
  await fillAndSave(page, { weight: "83" }, /save changes/i);
  await expect(summary(page)).toContainText(/Latest\s*83\.0/);
  expect(await currentKg(page)).toBe(83);

  // A second weigh-in the same day: both readings are kept, the trend counts the day once.
  await logWeight(page, { date: TODAY, time: "20:00", weight: "85" });
  await expect(page.getByTestId("weigh-in-row")).toHaveCount(3);
  await expect(summary(page)).toContainText(/Latest\s*85\.0/); // latest actual reading, not the mean
  // 7 days ending today: 79 (HIST) and today's mean (83+85)/2 = 84 → 81.5. (A mean of readings would be 82.3.)
  await expect(summary(page)).toContainText(/7-day average\s*81\.5/);
  expect(await currentKg(page)).toBe(85);

  // Today: this date's latest reading.
  await page.goto("/");
  const todayRow = todayWeight(page);
  await expect(todayRow).toContainText("85.0 kg");
  // A past date shows that date's weight, not the globally latest one.
  await page.goto(`/?date=${HIST}`);
  await expect(todayWeight(page)).toContainText("79.0 kg");
  await expect(todayWeight(page)).not.toContainText("85.0");
  for (const d of [GAP, BEFORE]) {
    await page.goto(`/?date=${d}`);
    await expect(todayWeight(page)).toContainText("No weight logged");
  }

  // History: the selected day's latest daily reading.
  await page.goto(`/history?month=${HIST.slice(0, 7)}&date=${HIST}`);
  await expect(page.getByTestId("history-weight")).toContainText("79.0 kg");
  await page.goto(`/history?month=${TODAY.slice(0, 7)}&date=${TODAY}`);
  await expect(page.getByTestId("history-weight")).toContainText("85.0 kg");

  // Delete the latest reading: falls back to the next latest.
  await page.goto("/weight");
  page.once("dialog", (d) => void d.accept());
  await openRowMenu(page, TODAY, "20:00", "Delete");
  await expect(page.getByTestId("weigh-in-row")).toHaveCount(2);
  await expect(summary(page)).toContainText(/Latest\s*83\.0/);
  expect(await currentKg(page)).toBe(83);

  // Persists across a reload.
  await page.reload();
  await expect(page.getByTestId("weigh-in-row")).toHaveCount(2);
  await expect(summary(page)).toContainText(/Latest\s*83\.0/);
  expect(await noOverflow(page)).toBeLessThanOrEqual(0);
});

test("kg/lb: display follows the preference, stored kg never drifts", async ({ page }) => {
  await api(page, "POST", "/api/weight", { date: TODAY, time: "08:00", weightKg: 82.4 });
  const stored = async () => ((await api(page, "GET", "/api/weight")).body.entries as Entry[])[0].weightKg;

  await page.goto("/weight");
  await expect(page.getByTestId("weigh-in-row").first()).toContainText("82.4 kg");

  await setUnits(page, "imperial");
  await page.reload();
  await expect(page.getByTestId("weigh-in-row").first()).toContainText("181.7 lbs"); // 82.4 × 2.2046226218
  expect(await stored()).toBe(82.4);

  // Edit only the note while in lb: the weight is not re-sent, so no round-trip drift.
  await openRowMenu(page, TODAY, "08:00", "Edit");
  await expect(page.getByRole("dialog").getByLabel(/^Weight \(lbs\)/)).toHaveValue("181.7");
  await fillAndSave(page, { notes: "after training" }, /save changes/i);
  expect(await stored()).toBe(82.4);

  // Entering a new value in lb converts once.
  await openRowMenu(page, TODAY, "08:00", "Edit");
  await fillAndSave(page, { weight: "182" }, /save changes/i);
  await expect(page.getByTestId("weigh-in-row").first()).toContainText("182.0 lbs");
  const kg = await stored();
  expect(kg).toBeCloseTo(82.554, 3);

  // Switching back and forth never rewrites the stored value.
  await setUnits(page, "metric");
  await page.reload();
  await expect(page.getByTestId("weigh-in-row").first()).toContainText("82.6 kg");
  await setUnits(page, "imperial");
  await setUnits(page, "metric");
  expect(await stored()).toBe(kg);

  // Today and History use the same unit.
  await setUnits(page, "imperial");
  await page.goto("/");
  await expect(todayWeight(page)).toContainText("182.0 lbs");
  await page.goto(`/history?month=${TODAY.slice(0, 7)}&date=${TODAY}`);
  await expect(page.getByTestId("history-weight")).toContainText("182.0 lbs");
});

test("dialog: semantics, Escape, focus restore, validation messages", async ({ page }) => {
  await page.goto("/weight");
  const opener = page.getByRole("button", { name: /^log weight$/i }).first();
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.getByRole("heading", { name: "Log weight" })).toBeVisible();
  await expect(dialog.getByLabel(/^Weight \(kg\)/)).toBeFocused();

  // Touch targets are comfortable.
  for (const name of [/^save/i, /^cancel/i]) {
    const box = await dialog.getByRole("button", { name }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(36);
  }
  const input = await dialog.getByLabel(/^Weight \(kg\)/).boundingBox();
  expect(input!.height).toBeGreaterThanOrEqual(40);

  // Client-side range message, then a server-side rejection for a future date.
  await dialog.getByLabel(/^Weight \(kg\)/).fill("5");
  await dialog.getByRole("button", { name: /^save/i }).click();
  await expect(dialog.getByRole("alert")).toContainText(/between 20 and 500 kg/);
  await dialog.getByLabel(/^Weight \(kg\)/).fill("80");
  await dialog.getByLabel("Date").fill(daysAgo(-30));
  await dialog.getByRole("button", { name: /^save/i }).click();
  await expect(dialog.getByRole("alert")).toContainText(/future/i);
  expect((await api(page, "GET", "/api/weight")).body.entries).toHaveLength(0);

  // Tab stays inside the dialog.
  for (let i = 0; i < 14; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);

  // Escape closes and returns focus to the opener.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("InBody: stays out of the daily list, trend and current weight", async ({ page }) => {
  await api(page, "POST", "/api/weight", { date: daysAgo(2), time: "08:00", weightKg: 80 });
  await page.goto("/weight");
  await page.getByRole("button", { name: /add inbody scan/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /inbody/i })).toBeVisible();
  await dialog.getByLabel(/^Weight \(/).fill("90");
  await dialog.getByLabel("Body fat").fill("15.4");
  await dialog.getByRole("button", { name: /^save/i }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByTestId("inbody-row")).toContainText("Body fat 15.4%");
  await expect(page.getByTestId("weigh-in-row")).toHaveCount(1);
  await expect(summary(page)).toContainText(/Latest\s*80\.0/);
  expect(await currentKg(page)).toBe(80);
  // No BMI category language anywhere on the Profile page.
  await page.goto("/profile");
  await expect(page.getByText(/underweight|overweight|obese|normal \(18/i)).toHaveCount(0);
});

test("chart: unique readings, legible at 375/390/430, goal never sets the scale, no horizontal overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  // 45 days of readings, two on one day (duplicate-date keys used to warn), around 80 kg.
  await seed(page, [
    ...Array.from({ length: 45 }, (_, i) => ({ date: daysAgo(i), time: "07:30", weightKg: Math.round((80 + Math.sin(i / 3) * 0.6) * 100) / 100 })),
    { date: daysAgo(2), time: "19:00", weightKg: 80.8 },
  ]);
  await api(page, "PUT", "/api/settings", { goalWeightKg: 40 }); // far below the data

  for (const width of [375, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/weight");
    const svg = page.locator('svg[role="img"]').first();
    await expect(svg).toBeVisible();
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);

    // Drawn 1:1 (viewBox == pixel size), so 11px text really is 11px.
    await expect.poll(async () => {
      return await svg.evaluate((el) => el.getBoundingClientRect().width / (el as SVGSVGElement).viewBox.baseVal.width);
    }).toBeGreaterThan(0.99);
    await expect.poll(async () => {
      return await svg.evaluate((el) => el.getBoundingClientRect().width / (el as SVGSVGElement).viewBox.baseVal.width);
    }).toBeLessThan(1.01);
    const sizes = await svg.locator("text").evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);

    // The y axis hugs the data (≈ 79–82), not the 40 kg goal.
    const ticks = (await svg.locator("text.tabular").allTextContents()).map(Number).filter((n) => !Number.isNaN(n));
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(Math.min(...ticks)).toBeGreaterThan(70);
    expect(Math.max(...ticks) - Math.min(...ticks)).toBeLessThan(10);
    // ...and does not blow a tiny wobble up to full height: the span is at least 2 kg.
    expect(Math.max(...ticks) - Math.min(...ticks)).toBeGreaterThanOrEqual(1.5);
  }
  expect(errors.filter((e) => /same key|unique "key"|Encountered two children/i.test(e))).toEqual([]);
});

test("mobile: log, list, edit, delete, Today and History without overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "iPhone 13 project only");
  await page.goto("/weight");
  await page.getByRole("button", { name: /^log weight$/i }).first().click();
  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);

  // Numeric keyboard + a field that stays reachable above the keyboard.
  const w = dialog.getByLabel(/^Weight \(kg\)/);
  await expect(w).toHaveAttribute("inputmode", "decimal");
  await w.fill("81.3");
  await dialog.getByRole("button", { name: /^save/i }).scrollIntoViewIfNeeded();
  await dialog.getByRole("button", { name: /^save/i }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("weigh-in-row")).toHaveCount(1);
  expect(await noOverflow(page)).toBeLessThanOrEqual(0);

  const time = (await api(page, "GET", "/api/weight")).body.entries[0].time as string;
  await openRowMenu(page, TODAY, time, "Edit");
  await fillAndSave(page, { weight: "81.0" }, /save changes/i);
  await expect(page.getByTestId("weigh-in-row").first()).toContainText("81.0 kg");

  await page.goto("/");
  await expect(todayWeight(page)).toContainText("81.0 kg");
  expect(await noOverflow(page)).toBeLessThanOrEqual(0);
  await page.goto(`/history?month=${TODAY.slice(0, 7)}&date=${TODAY}`);
  await expect(page.getByTestId("history-weight")).toContainText("81.0 kg");
  expect(await noOverflow(page)).toBeLessThanOrEqual(0);

  await page.goto("/weight");
  page.once("dialog", (d) => void d.accept());
  await openRowMenu(page, TODAY, time, "Delete");
  await expect(page.getByText("No weigh-ins yet")).toBeVisible();
  expect(await currentKg(page)).toBeNull();

  // Verify Today shows no weight logged
  await page.goto("/");
  await expect(todayWeight(page)).toContainText("No weight logged");

  // Verify History has no fabricated weight
  await page.goto(`/history?month=${TODAY.slice(0, 7)}&date=${TODAY}`);
  await expect(page.getByTestId("history-weight")).toHaveCount(0);

  // Verify Settings does not show 78 as current
  await page.goto("/settings");
  const weightInput = page.getByLabel(/current weight/i);
  if (await weightInput.count() > 0) {
    await expect(weightInput).toHaveValue("");
  }

  // Re-add a new daily weigh-in
  await page.goto("/weight");
  await page.getByRole("button", { name: /log weight/i }).click();
  const d2 = page.getByRole("dialog");
  await expect(d2).toBeVisible();
  await d2.getByLabel(/^Weight \(kg\)/).fill("82.5");
  await d2.getByRole("button", { name: /^save/i }).click();
  await expect(d2).toBeHidden();
  expect(await currentKg(page)).toBe(82.5);
});

test("InBody-only account has null current weight and no fabricated weight", async ({ page }) => {
  await wipeWeights(page);
  // Post an InBody scan
  await api(page, "POST", "/api/weight", {
    date: TODAY,
    time: "09:00",
    entryType: "inbody",
    weightKg: 88.0,
    bodyFatPct: 17.5,
    smmKg: 36.0,
    bmi: 23.5,
  });

  expect(await currentKg(page)).toBeNull();

  // Weight page daily view shows no weigh-ins yet
  await page.goto("/weight");
  await expect(page.getByText("No weigh-ins yet")).toBeVisible();

  // Today shows no weight logged
  await page.goto("/");
  await expect(todayWeight(page)).toContainText("No weight logged");

  // History has no fabricated weight badge
  await page.goto(`/history?month=${TODAY.slice(0, 7)}&date=${TODAY}`);
  await expect(page.getByTestId("history-weight")).toHaveCount(0);
});

test("network: request counts for the main flows", async ({ page }) => {
  await seed(page, Array.from({ length: 6 }, (_, i) => ({ date: daysAgo(i * 2), time: "07:30", weightKg: 80 + i * 0.1 })));
  const hits: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith("/api/") && !u.pathname.startsWith("/api/auth")) hits.push(`${r.method()} ${u.pathname}${u.search ? "?…" : ""}`);
  });
  const _count = (re: RegExp) => hits.filter((h) => re.test(h)).length;
  void _count;
  const take = () => hits.splice(0, hits.length);
  const report: Record<string, string[]> = {};

  await page.goto("/weight");
  await expect(page.getByTestId("weigh-in-row").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  report["open Weight"] = take();
  // The page needs the weight payload once, and nothing else weight-related.
  expect(report["open Weight"].filter((h) => h.startsWith("GET /api/weight")).length).toBe(1);

  await page.getByRole("radio", { name: "1M" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("radio", { name: "3M" }).click();
  await page.waitForLoadState("networkidle");
  report["range 3M→1M→3M"] = take();
  expect(report["range 3M→1M→3M"].filter((h) => h.startsWith("GET /api/weight")).length).toBe(1); // 1M fetched once; 3M served from cache

  await logWeight(page, { time: "21:00", weight: "81" });
  await page.waitForLoadState("networkidle");
  report["log"] = take();
  expect(report["log"].filter((h) => h === "POST /api/weight")).toHaveLength(1);
  expect(report["log"].filter((h) => h.startsWith("GET /api/weight"))).toHaveLength(1); // one refetch, not two

  await openRowMenu(page, TODAY, "21:00", "Edit");
  await fillAndSave(page, { weight: "81.2" }, /save changes/i);
  await page.waitForLoadState("networkidle");
  report["edit"] = take();
  expect(report["edit"].filter((h) => h === "PUT /api/weight")).toHaveLength(1);
  expect(report["edit"].filter((h) => h.startsWith("GET /api/weight"))).toHaveLength(1);

  page.once("dialog", (d) => void d.accept());
  await openRowMenu(page, TODAY, "21:00", "Delete");
  await expect(page.getByTestId("weigh-in-row")).toHaveCount(6);
  await page.waitForLoadState("networkidle");
  report["delete"] = take();
  expect(report["delete"].filter((h) => h.startsWith("DELETE /api/weight"))).toHaveLength(1);
  expect(report["delete"].filter((h) => h.startsWith("GET /api/weight"))).toHaveLength(1);

  // Today navigation: one /api/day per date and never the weight history.
  take();
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /previous day/i }).click();
  await page.waitForLoadState("networkidle");
  report["Today + previous day"] = take();
  expect(report["Today + previous day"].some((h) => h.startsWith("GET /api/weight"))).toBe(false);
  expect(report["Today + previous day"].filter((h) => h.startsWith("GET /api/day")).length).toBeLessThanOrEqual(4); // two days + prefetch

  // History: one request per month.
  await page.goto(`/history?month=${TODAY.slice(0, 7)}&date=${TODAY}`);
  await page.waitForLoadState("networkidle");
  report["open History"] = take();
  expect(report["open History"].filter((h) => h.startsWith("GET /api/history/month"))).toHaveLength(1);
  expect(report["open History"].some((h) => h.startsWith("GET /api/weight"))).toBe(false);

  test.info().annotations.push({ type: "requests", description: JSON.stringify(report) });
});
