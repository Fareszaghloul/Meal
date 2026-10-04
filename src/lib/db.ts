import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "test") {
    const testUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!testUrl) {
      throw new Error(
        "[DATABASE SAFETY GUARD] Refusing to initialize database in test environment: TEST_DATABASE_URL is not configured. Automated tests must NEVER fall back to the persistent database."
      );
    }
    if (testUrl.includes("/postgres") && !testUrl.includes("schema=test") && !testUrl.includes("schema=test_")) {
      throw new Error(
        `[CRITICAL DATABASE SAFETY GUARD] Blocked connection: NODE_ENV is "test" but database URL targets persistent database "postgres"! Automated tests must run exclusively against an isolated test database (e.g. meal_test).`
      );
    }
    return new PrismaClient({
      datasourceUrl: testUrl,
      log: ["error"],
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
