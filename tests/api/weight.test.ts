import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { BASE, login } from "./helpers";
import { addDays, todayLocal } from "@/lib/dates";
import type { DayData, MonthHistoryResponse, WeightEntry, WeightPageData } from "@/lib/domain";

/**
 * Weight API against the isolated meal_test database (see helpers.ts safety guard).
 * Uses the two dedicated isolation users so it never touches the shared e2e account's data.
 */
// The test database is remote, and the sync tests make many sequential round trips.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const A = { email: "test-user-a@mealprep.test", password: "TestPassword123!" };
const B = { email: "test-user-b@mealprep.test", password: "TestPassword123!" };
let cookieA = "";
let cookieB = "";

async function req<T = unknown>(cookie: string, path: string, init?: { method?: string; json?: unknown; raw?: BodyInit; headers?: Record<string, string> }) {
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: { cookie, ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.raw,
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

const post = (c: string, json: unknown) => req<WeightEntry & { error?: string; code?: string }>(c, "/api/weight", { method: "POST", json });
const put = (c: string, json: unknown) => req<WeightEntry & { error?: string; code?: string }>(c, "/api/weight", { method: "PUT", json });
const del = (c: string, id: string) => req<{ success?: boolean; error?: string }>(c, `/api/weight?id=${id}`, { method: "DELETE" });
const page = async (c: string, from?: string) => (await req<WeightPageData>(c, `/api/weight${from ? `?from=${from}` : ""}`)).body;
const currentKg = async (c: string) => (await req<{ currentWeightKg: number | null }>(c, "/api/settings")).body.currentWeightKg;

async function wipe(c: string) {
  let data = await page(c);
  let all = [...data.entries, ...data.inbody];
  while (all.length > 0) {
    for (let i = 0; i < all.length; i += 5) {
      await Promise.all(all.slice(i, i + 5).map((e) => del(c, e.id)));
    }
    data = await page(c);
    if (data.entries.length + data.inbody.length === all.length) break;
    all = [...data.entries, ...data.inbody];
  }
  if (data.entries.length === 0) {
    await req(c, "/api/settings", { method: "PUT", json: { currentWeightKg: null } });
  }
}

const TODAY = todayLocal();
const PAST = "2001-01-15";

beforeAll(async () => {
  cookieA = await login(A.email, A.password);
  cookieB = await login(B.email, B.password);
  await wipe(cookieA);
  await wipe(cookieB);
});

afterAll(async () => {
  await wipe(cookieA);
  await wipe(cookieB);
});

describe("Weight API validation", () => {
  const base = { date: PAST, weightKg: 80 };
  const cases: Array<[string, Record<string, unknown>]> = [
    ["weight 'abc'", { weightKg: "abc" }],
    ["weight 'Infinity'", { weightKg: "Infinity" }],
    ["weight 'NaN'", { weightKg: "NaN" }],
    ["weight null", { weightKg: null }],
    ["weight 0", { weightKg: 0 }],
    ["weight negative", { weightKg: -3 }],
    ["5 kg is below the 20 kg minimum", { weightKg: 5 }],
    ["99999 kg", { weightKg: 99999 }],
    ["500.5 kg", { weightKg: 500.5 }],
    ["invalid date", { date: "garbage" }],
    ["impossible date", { date: "2026-02-30" }],
    ["missing date", { date: undefined }],
    ["future date 2099", { date: "2099-01-01" }],
    ["two days ahead", { date: addDays(TODAY, 3) }],
    ["time 'abc'", { time: "abc" }],
    ["time 25:00", { time: "25:00" }],
    ["time 8:30 (not zero-padded)", { time: "8:30" }],
    ["entryType 'foo'", { entryType: "foo" }],
    ["notes over 500 characters", { notes: "x".repeat(501) }],
    ["InBody body fat out of range", { entryType: "inbody", bodyFatPct: 90 }],
    ["InBody bmi not a number", { entryType: "inbody", bmi: "abc" }],
  ];

  for (const [name, over] of cases) {
    it(`POST rejects ${name} with a clean 400`, async () => {
      const r = await post(cookieA, { ...base, ...over });
      expect(r.status).toBe(400);
      expect(r.body.code).toBe("validation");
      expect(typeof r.body.error).toBe("string");
    });
  }

  it("rejects a non-JSON body with 400", async () => {
    const r = await req(cookieA, "/api/weight", { method: "POST", raw: "not json", headers: { "Content-Type": "application/json" } });
    expect(r.status).toBe(400);
  });

  it("PUT applies the same validation, and 404s for unknown ids", async () => {
    const created = await post(cookieA, base);
    expect(created.status).toBe(201);
    const id = created.body.id;
    for (const patch of [{ weightKg: 5 }, { weightKg: "abc" }, { date: "2099-01-01" }, { date: "garbage" }, { time: "abc" }, { entryType: "foo" }, { notes: "x".repeat(501) }]) {
      const r = await put(cookieA, { id, ...patch });
      expect(r.status, JSON.stringify(patch)).toBe(400);
    }
    expect((await put(cookieA, { id: "does-not-exist", weightKg: 80 })).status).toBe(404);
    expect((await put(cookieA, { weightKg: 80 })).status).toBe(400);
    await del(cookieA, id);
  });

  it("DELETE needs an id and 404s for unknown ones", async () => {
    expect((await req(cookieA, "/api/weight", { method: "DELETE" })).status).toBe(400);
    expect((await del(cookieA, "does-not-exist")).status).toBe(404);
  });

  it("accepts the boundary weights and 500-character notes, and stores blank notes/time as null", async () => {
    const lo = await post(cookieA, { date: PAST, weightKg: 20, notes: "x".repeat(500), time: "" });
    const hi = await post(cookieA, { date: PAST, weightKg: 500, notes: "   " });
    expect([lo.status, hi.status]).toEqual([201, 201]);
    expect(lo.body.notes).toHaveLength(500);
    expect(lo.body.time).toBeNull();
    expect(hi.body.notes).toBeNull();
    await del(cookieA, lo.body.id);
    await del(cookieA, hi.body.id);
  });

  it("requires authentication", async () => {
    expect((await fetch(`${BASE}/api/weight`)).status).toBe(401);
    expect((await fetch(`${BASE}/api/weight`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: PAST, weightKg: 80 }) })).status).toBe(401);
  });
});

describe("current weight synchronization", () => {
  beforeAll(async () => {
    await wipe(cookieA);
  });
  afterAll(async () => {
    await wipe(cookieA);
  });

  it("create → update → delete keeps UserSettings.currentWeightKg on the latest daily reading", async () => {
    // Create: first reading becomes current.
    const old = await post(cookieA, { date: PAST, time: "08:00", weightKg: 80 });
    expect(old.status).toBe(201);
    expect(await currentKg(cookieA)).toBe(80);

    // A newer reading takes over.
    const today = await post(cookieA, { date: TODAY, time: "08:00", weightKg: 82.4 });
    expect(await currentKg(cookieA)).toBe(82.4);

    // REGRESSION: editing a 2001 entry must not change the current weight while newer readings exist.
    const edited = await put(cookieA, { id: old.body.id, weightKg: 60 });
    expect(edited.status).toBe(200);
    expect(edited.body.weightKg).toBe(60);
    expect(await currentKg(cookieA)).toBe(82.4);

    // Editing the latest reading does update it.
    await put(cookieA, { id: today.body.id, weightKg: 83.1 });
    expect(await currentKg(cookieA)).toBe(83.1);

    // Same day, later time wins; an earlier time inserted afterwards does not (time before createdAt).
    const evening = await post(cookieA, { date: TODAY, time: "20:00", weightKg: 84 });
    expect(await currentKg(cookieA)).toBe(84);
    const early = await post(cookieA, { date: TODAY, time: "06:00", weightKg: 81 });
    expect(await currentKg(cookieA)).toBe(84);

    // Deleting a non-latest reading changes nothing.
    await del(cookieA, early.body.id);
    expect(await currentKg(cookieA)).toBe(84);

    // Deleting the latest falls back to the next latest valid daily reading.
    await del(cookieA, evening.body.id);
    expect(await currentKg(cookieA)).toBe(83.1);
    await del(cookieA, today.body.id);
    expect(await currentKg(cookieA)).toBe(60); // the edited 2001 reading is now the only one

    // Deleting the last one leaves no stale value behind: current weight becomes null.
    await del(cookieA, old.body.id);
    expect(await currentKg(cookieA)).toBeNull();
    const empty = await page(cookieA);
    expect(empty.summary.latestKg).toBeNull();
    expect(empty.entries).toEqual([]);
  });

  it("moving the latest reading to an older date re-derives the current weight", async () => {
    const a = await post(cookieA, { date: addDays(TODAY, -5), time: "08:00", weightKg: 90 });
    const b = await post(cookieA, { date: addDays(TODAY, -1), time: "08:00", weightKg: 91 });
    expect(await currentKg(cookieA)).toBe(91);
    await put(cookieA, { id: b.body.id, date: addDays(TODAY, -9) });
    expect(await currentKg(cookieA)).toBe(90);
    await del(cookieA, a.body.id);
    await del(cookieA, b.body.id);
  });

  it("same date and time: the most recently created reading is current; a timed reading beats an untimed one", async () => {
    const first = await post(cookieA, { date: TODAY, weightKg: 70 });
    const second = await post(cookieA, { date: TODAY, weightKg: 71 });
    expect(await currentKg(cookieA)).toBe(71);
    const timed = await post(cookieA, { date: TODAY, time: "00:01", weightKg: 72 });
    expect(await currentKg(cookieA)).toBe(72);
    for (const e of [first, second, timed]) await del(cookieA, e.body.id);
  });

  it("a manual settings edit is ignored while weigh-ins exist, and honoured when none do", async () => {
    const r = await post(cookieA, { date: TODAY, weightKg: 77 });
    const blocked = await req<{ currentWeightKg: number; currentWeightFromLog: boolean }>(cookieA, "/api/settings", { method: "PUT", json: { currentWeightKg: 55 } });
    expect(blocked.body.currentWeightKg).toBe(77);
    expect(blocked.body.currentWeightFromLog).toBe(true);
    await del(cookieA, r.body.id);
    const free = await req<{ currentWeightKg: number; currentWeightFromLog: boolean }>(cookieA, "/api/settings", { method: "PUT", json: { currentWeightKg: 79 } });
    expect(free.body.currentWeightKg).toBe(79);
    expect(free.body.currentWeightFromLog).toBe(false);
    await req(cookieA, "/api/settings", { method: "PUT", json: { currentWeightKg: null } });
  });
});

describe("InBody separation", () => {
  beforeAll(async () => {
    await wipe(cookieA);
  });
  afterAll(async () => {
    await wipe(cookieA);
  });

  it("an InBody scan never becomes the current weigh-in, the daily trend, the day weight or the History badge", async () => {
    const day = addDays(TODAY, -3);
    const daily = await post(cookieA, { date: day, time: "08:00", weightKg: 80 });
    // Inserted later AND dated later than the daily reading: still must not win.
    const scan = await post(cookieA, { date: TODAY, time: "09:00", entryType: "inbody", weightKg: 90, bodyFatPct: 15.4, smmKg: 34.8, bmi: 23.5 });
    expect(scan.status).toBe(201);
    expect(scan.body).toMatchObject({ entryType: "inbody", bodyFatPct: 15.4, smmKg: 34.8, bmi: 23.5 });
    expect(await currentKg(cookieA)).toBe(80);

    const p = await page(cookieA);
    expect(p.entries.map((e) => e.id)).toEqual([daily.body.id]);
    expect(p.inbody.map((e) => e.id)).toEqual([scan.body.id]);
    expect(p.summary.latestKg).toBe(80);
    expect(p.summary.latestDate).toBe(day);

    // The scan's own metrics are exposed in its dedicated view and feed the profile's body-composition numbers.
    const s = (await req<{ currentBodyFatPct: number; currentSmmKg: number }>(cookieA, "/api/settings")).body;
    expect(s.currentBodyFatPct).toBe(15.4);
    expect(s.currentSmmKg).toBe(34.8);

    // Today dashboard and History ignore it too.
    const dayData = (await req<DayData>(cookieA, `/api/day?date=${TODAY}`)).body;
    expect(dayData.weight.latestKg).toBe(80);
    expect(dayData.weight.latestDate).toBe(day);
    const month = (await req<MonthHistoryResponse>(cookieA, `/api/history/month?month=${TODAY.slice(0, 7)}`)).body;
    expect(month.days[TODAY]?.weightKg ?? null).toBeNull();

    // Daily-only fields are not accepted on a daily row.
    const noisy = await post(cookieA, { date: day, time: "09:30", weightKg: 80.2, bodyFatPct: 10, smmKg: 30, bmi: 22 });
    expect(noisy.body).toMatchObject({ entryType: "daily", bodyFatPct: null, smmKg: null, bmi: null });

    for (const id of [daily.body.id, scan.body.id, noisy.body.id]) await del(cookieA, id);
  });
});

describe("Today and History reflect the right reading per date", () => {
  const d1 = addDays(TODAY, -6);
  const d2 = addDays(TODAY, -4);
  const ids: string[] = [];

  beforeAll(async () => {
    await wipe(cookieA);
    for (const r of [
      { date: d1, time: "07:00", weightKg: 80 },
      { date: d1, time: "21:00", weightKg: 82 }, // latest actual reading of d1 (day mean would be 81)
      { date: d1, time: "13:00", weightKg: 81.5 }, // inserted last but not the latest time
      { date: d2, time: "07:00", weightKg: 79 },
    ]) ids.push((await post(cookieA, r)).body.id);
  });
  afterAll(async () => {
    await wipe(cookieA);
  });

  it("the day endpoint reports the viewed date's latest reading, never a later one", async () => {
    const onD1 = (await req<DayData>(cookieA, `/api/day?date=${d1}`)).body.weight;
    expect(onD1.latestKg).toBe(82);
    expect(onD1.latestDate).toBe(d1);
    const onD2 = (await req<DayData>(cookieA, `/api/day?date=${d2}`)).body.weight;
    expect(onD2.latestKg).toBe(79);
    expect(onD2.latestDate).toBe(d2);
    // Between the two: no reading that day, the most recent earlier one is reported WITH its own date.
    const between = (await req<DayData>(cookieA, `/api/day?date=${addDays(d1, 1)}`)).body.weight;
    expect(between.latestDate).toBe(d1);
    expect(between.latestKg).toBe(82);
    // Before any reading: nothing.
    const before = (await req<DayData>(cookieA, `/api/day?date=${addDays(d1, -1)}`)).body.weight;
    expect(before.latestKg).toBeNull();
    expect(before.latestDate).toBeNull();
  });

  it("History shows the latest daily reading of each date (not the mean, not an arbitrary row) and the user's unit", async () => {
    const m = d1.slice(0, 7);
    const month = (await req<MonthHistoryResponse>(cookieA, `/api/history/month?month=${m}`)).body;
    expect(month.days[d1].weightKg).toBe(82);
    expect(month.weightUnit).toBe("kg");
    if (d2.slice(0, 7) === m) expect(month.days[d2].weightKg).toBe(79);
  });

  it("History follows the unit preference without touching stored values", async () => {
    await req(cookieA, "/api/settings", { method: "PUT", json: { measurementSystem: "imperial" } });
    try {
      const month = (await req<MonthHistoryResponse>(cookieA, `/api/history/month?month=${d1.slice(0, 7)}`)).body;
      expect(month.weightUnit).toBe("lbs");
      expect(month.days[d1].weightKg).toBe(82); // still canonical kg
      const p = await page(cookieA);
      expect(p.summary.unit).toBe("lbs");
      expect(p.entries.find((e) => e.id === ids[1])?.weightKg).toBe(82);
    } finally {
      await req(cookieA, "/api/settings", { method: "PUT", json: { measurementSystem: "metric" } });
    }
  });
});

describe("trend summary and bounded history", () => {
  const dates = [-40, -34, -5, -3, -1].map((n) => addDays(TODAY, n));

  beforeAll(async () => {
    await wipe(cookieA);
    // Three weigh-ins on one day must count once in the trend.
    for (const r of [
      { date: dates[0], time: "07:00", weightKg: 90 },
      { date: dates[1], time: "07:00", weightKg: 88 },
      { date: dates[2], time: "07:00", weightKg: 80 },
      { date: dates[2], time: "12:00", weightKg: 80 },
      { date: dates[2], time: "18:00", weightKg: 80 },
      { date: dates[3], time: "07:00", weightKg: 86 },
      { date: dates[4], time: "07:00", weightKg: 84 },
    ]) await post(cookieA, r);
  });
  afterAll(async () => {
    await wipe(cookieA);
  });

  it("keeps every reading but collapses a day to its mean for the trend", async () => {
    const p = await page(cookieA);
    expect(p.entries).toHaveLength(7); // nothing merged or dropped
    expect(p.summary.latestKg).toBe(84);
    expect(p.summary.latestDate).toBe(dates[4]);
    // 7 days ending at dates[4]: day values 80 (3 readings → one day), 86, 84 → (80+86+84)/3, not (3×80+86+84)/5
    expect(p.summary.avg7Kg).toBeCloseTo(83.3, 1);
    expect(p.summary.startKg).toBe(90);
    expect(p.summary.change30Kg).not.toBeNull();
    expect(p.summary.goalKg === null || typeof p.summary.goalKg === "number").toBe(true);
  });

  it("supports bounded history: ?from returns only that window (plus the 6-day trend lead-in) but the summary stays all-time", async () => {
    const p = await page(cookieA, addDays(TODAY, -10)); // window start -10, lead-in -16
    expect(p.entries.map((e) => e.date >= addDays(TODAY, -16))).not.toContain(false);
    expect(p.entries.length).toBe(5);
    expect(p.summary.startKg).toBe(90); // all-time, independent of range
    const wide = await page(cookieA, addDays(TODAY, -33)); // lead-in -39: includes -34, excludes -40
    expect(wide.entries.length).toBe(6);
    // Returned ascending: date, then time.
    const keys = wide.entries.map((e) => `${e.date} ${e.time ?? ""}`);
    expect(keys).toEqual([...keys].sort());
  });

  it("rejects a malformed ?from", async () => {
    expect((await req(cookieA, "/api/weight?from=yesterday")).status).toBe(400);
  });
});

describe("Weight user isolation", () => {
  let aEntry: WeightEntry;
  beforeAll(async () => {
    await wipe(cookieA);
    await wipe(cookieB);
    aEntry = (await post(cookieA, { date: PAST, weightKg: 80, notes: "private" })).body;
  });
  afterAll(async () => {
    await wipe(cookieA);
    await wipe(cookieB);
  });

  it("user B cannot read user A's weights", async () => {
    const b = await page(cookieB);
    expect(JSON.stringify(b)).not.toContain(aEntry.id);
    expect(b.entries).toEqual([]);
    expect(b.summary.latestKg).toBeNull();
  });

  it("user B cannot update or delete user A's entry, and A's data and current weight are untouched", async () => {
    const before = await currentKg(cookieA);
    expect((await put(cookieB, { id: aEntry.id, weightKg: 60 })).status).toBe(404);
    expect((await put(cookieB, { id: aEntry.id, weightKg: 150 })).status).toBe(404);
    expect((await del(cookieB, aEntry.id)).status).toBe(404);
    const a = await page(cookieA);
    expect(a.entries.find((e) => e.id === aEntry.id)).toMatchObject({ weightKg: 80, notes: "private" });
    expect(await currentKg(cookieA)).toBe(before);
  });

  it("user B's own writes never affect user A", async () => {
    const before = await currentKg(cookieA);
    const mine = await post(cookieB, { date: TODAY, weightKg: 95 });
    expect(await currentKg(cookieB)).toBe(95);
    expect(await currentKg(cookieA)).toBe(before);
    await del(cookieB, mine.body.id);
  });

  it("a client-supplied userId is ignored", async () => {
    const r = await post(cookieB, { date: PAST, weightKg: 70, userId: "usr_test_a_id" });
    expect(r.status).toBe(201);
    expect((await page(cookieA)).entries.some((e) => e.id === r.body.id)).toBe(false);
    expect((await page(cookieB)).entries.some((e) => e.id === r.body.id)).toBe(true);
  });
});

describe("PATCH semantics", () => {
  afterAll(async () => {
    await wipe(cookieA);
  });
  it("fields not mentioned in a PUT are left untouched", async () => {
    const created = (await post(cookieA, { date: PAST, time: "08:15", weightKg: 80, notes: "fasted" })).body;
    const r = await put(cookieA, { id: created.id, weightKg: 79.5 });
    expect(r.body).toMatchObject({ weightKg: 79.5, time: "08:15", notes: "fasted", date: PAST });
    const cleared = await put(cookieA, { id: created.id, notes: "", time: "" });
    expect(cleared.body).toMatchObject({ notes: null, time: null, weightKg: 79.5 });
  });
});

describe("InBody OCR endpoint hardening", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

  const form = (file: Blob, name = "scan.png") => {
    const f = new FormData();
    f.append("image", file, name);
    return f;
  };

  it("requires authentication", async () => {
    expect((await fetch(`${BASE}/api/weight/scan`, { method: "POST", body: form(new Blob([png], { type: "image/png" })) })).status).toBe(401);
  });

  it("only accepts multipart uploads (a JSON body, which used to allow paths/URLs, is refused)", async () => {
    const json = await req<{ code: string }>(cookieA, "/api/weight/scan", { method: "POST", json: { image: "C:/Windows/win.ini" } });
    expect(json.status).toBe(415);
    const missing = await req(cookieA, "/api/weight/scan", { method: "POST", raw: new FormData() });
    expect(missing.status).toBe(400);
  });

  it("rejects non-image MIME types and files whose bytes aren't an image", async () => {
    const text = await req<{ error: string }>(cookieA, "/api/weight/scan", { method: "POST", raw: form(new Blob(["hello"], { type: "text/plain" }), "a.txt") });
    expect(text.status).toBe(415);
    const gif = await req(cookieA, "/api/weight/scan", { method: "POST", raw: form(new Blob([png], { type: "image/gif" }), "a.gif") });
    expect(gif.status).toBe(415);
    const liar = await req<{ error: string }>(cookieA, "/api/weight/scan", { method: "POST", raw: form(new Blob(["<script>alert(1)</script>"], { type: "image/png" })) });
    expect(liar.status).toBe(415);
    expect(JSON.stringify(liar.body)).not.toMatch(/node_modules|\.tsx?:|stack/i);
  });

  it("rejects oversized uploads before processing them", async () => {
    const big = new Blob([new Uint8Array(9 * 1024 * 1024)], { type: "image/png" });
    const r = await req<{ code: string }>(cookieA, "/api/weight/scan", { method: "POST", raw: form(big) });
    expect(r.status).toBe(413);
    expect(r.body.code).toBe("too_large");
  });
});

describe("Weight import", () => {
  afterAll(async () => {
    await wipe(cookieA);
  });

  it("imports a long history in one go, syncs the current weight, and is idempotent", async () => {
    await wipe(cookieA);
    const rows = Array.from({ length: 80 }, (_, i) => ({ date: addDays(TODAY, -i), time: "07:30", entryType: "daily", weightKg: 80 + (i % 5) / 10 }));
    const file = { app: "mealprep", version: 1, exportedAt: new Date().toISOString(), weight: rows };
    const first = await req<{ summary: { weight: number } }>(cookieA, "/api/import?dryRun=false", { method: "POST", json: file });
    expect(first.status).toBe(200);
    expect(first.body.summary.weight).toBe(80);
    expect(await currentKg(cookieA)).toBe(rows[0].weightKg); // today's row is the latest
    const again = await req<{ summary: { weight: number } }>(cookieA, "/api/import?dryRun=false", { method: "POST", json: file });
    expect(again.body.summary.weight).toBe(0);
    expect((await page(cookieA)).entries).toHaveLength(80);
  });

  it("applies the same validation as the weight API (future dates and out-of-range weights are refused)", async () => {
    for (const bad of [{ date: "2099-01-01", weightKg: 80 }, { date: PAST, weightKg: 5 }, { date: PAST, weightKg: 80, entryType: "foo" }]) {
      const r = await req(cookieA, "/api/import?dryRun=false", { method: "POST", json: { app: "mealprep", version: 1, exportedAt: "x", weight: [bad] } });
      expect(r.status).toBe(400);
    }
  });
});

describe("Phase 7.1 — Nullable Current Weight API semantics", () => {
  afterAll(async () => {
    await wipe(cookieA);
    await wipe(cookieB);
  });

  it("settings API returns currentWeightKg: null when user has no WeightEntry records", async () => {
    await wipe(cookieA);
    const settingsRes = await req<{ currentWeightKg: number | null }>(cookieA, "/api/settings");
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.currentWeightKg).toBeNull();
    expect(settingsRes.body.currentWeightKg).not.toBe(78);
  });

  it("InBody-only account maintains currentWeightKg: null in settings", async () => {
    await wipe(cookieA);
    // Post only an InBody measurement
    const scan = await post(cookieA, {
      date: TODAY,
      time: "09:00",
      entryType: "inbody",
      weightKg: 88.5,
      bodyFatPct: 18.0,
      smmKg: 35.0,
      bmi: 24.0,
    });
    expect(scan.status).toBe(201);

    const settingsRes = await req<{ currentWeightKg: number | null; currentBodyFatPct: number | null }>(cookieA, "/api/settings");
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.currentWeightKg).toBeNull();
    expect(settingsRes.body.currentWeightKg).not.toBe(88.5);
    expect(settingsRes.body.currentWeightKg).not.toBe(78);
    expect(settingsRes.body.currentBodyFatPct).toBe(18.0);

    const weightPage = await page(cookieA);
    expect(weightPage.summary.latestKg).toBeNull();
    expect(weightPage.entries).toHaveLength(0);
    expect(weightPage.inbody).toHaveLength(1);

    await del(cookieA, scan.body.id);
  });

  it("import with no weight records does not fabricate 78 kg", async () => {
    await wipe(cookieA);
    const file = {
      app: "mealprep",
      version: 1,
      exportedAt: new Date().toISOString(),
      foods: [{ name: "Phase 7.1 Test Food", caloriesPer100g: 100 }],
      weight: [],
    };
    const res = await req<{ summary: { weight: number } }>(cookieA, "/api/import?dryRun=false", { method: "POST", json: file });
    expect(res.status).toBe(200);
    expect(res.body.summary.weight).toBe(0);

    const settingsRes = await req<{ currentWeightKg: number | null }>(cookieA, "/api/settings");
    expect(settingsRes.body.currentWeightKg).toBeNull();
    expect(settingsRes.body.currentWeightKg).not.toBe(78);
  });

  it("import with daily weight records syncs currentWeightKg to latest daily measurement", async () => {
    await wipe(cookieA);
    const file = {
      app: "mealprep",
      version: 1,
      exportedAt: new Date().toISOString(),
      weight: [
        { date: addDays(TODAY, -2), time: "08:00", entryType: "daily", weightKg: 82.0 },
        { date: TODAY, time: "08:00", entryType: "daily", weightKg: 81.5 },
      ],
    };
    const res = await req<{ summary: { weight: number } }>(cookieA, "/api/import?dryRun=false", { method: "POST", json: file });
    expect(res.status).toBe(200);
    expect(res.body.summary.weight).toBe(2);

    expect(await currentKg(cookieA)).toBe(81.5);
    await wipe(cookieA);
  });

  it("user isolation: User A weight operations never leak into User B", async () => {
    await wipe(cookieA);
    await wipe(cookieB);

    // User A logs weight
    const aRow = await post(cookieA, { date: TODAY, time: "08:00", weightKg: 75.5 });
    expect(await currentKg(cookieA)).toBe(75.5);
    expect(await currentKg(cookieB)).toBeNull();

    // User B logs weight
    const bRow = await post(cookieB, { date: TODAY, time: "08:00", weightKg: 92.0 });
    expect(await currentKg(cookieA)).toBe(75.5);
    expect(await currentKg(cookieB)).toBe(92.0);

    // User A deletes their weight
    await del(cookieA, aRow.body.id);
    expect(await currentKg(cookieA)).toBeNull();
    expect(await currentKg(cookieB)).toBe(92.0);

    // User B deletes their weight
    await del(cookieB, bRow.body.id);
    expect(await currentKg(cookieA)).toBeNull();
    expect(await currentKg(cookieB)).toBeNull();
  });
});

