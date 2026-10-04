import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { expect, type Page } from "@playwright/test";
import { assertTestDatabase } from "../../../src/lib/testing/safety-guard";

/**
 * Direct meal_test access for E2E specs that need a throwaway account (destructive flows such as restore
 * must never run on the shared e2e user). Refuses to run unless the safety guard confirms the test database.
 */
function testDbUrl() {
  const fromEnv = process.env.TEST_DATABASE_URL;
  if (fromEnv) return fromEnv;
  const m = fs.readFileSync(".env.test", "utf8").match(/TEST_DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (!m) throw new Error("TEST_DATABASE_URL is not configured");
  return m[1];
}

export async function testDb() {
  const url = testDbUrl();
  await assertTestDatabase(url);
  return new PrismaClient({ datasourceUrl: url });
}

export const E2E_PASSWORD = "P9-E2ePassword!2026";

export async function createThrowawayUser(db: PrismaClient, label: string) {
  const email = `p9e2e-${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}@mealprep.test`;
  const passwordHash = await hash(E2E_PASSWORD, { memoryCost: 65536, timeCost: 3, parallelism: 4, outputLen: 32 });
  const user = await db.user.create({ data: { email, displayName: `P9 ${label}`, passwordHash, role: "user" } });
  return { id: user.id, email };
}

export async function signInAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** Console errors after sign-in, ignoring the expected pre-login 401 probe. */
export function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !/401 \(Unauthorized\)/.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

export async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
