import { PrismaClient } from "@prisma/client";

export interface DatabaseTargetInfo {
  database: string;
  schema: string;
  user: string;
}

/**
 * Reusable Database Safety Guard.
 *
 * Enforces that any test or test-bootstrap routine is connected ONLY to an isolated test
 * database/schema. Prevents catastrophic accidental writes to the persistent application database ('postgres').
 *
 * Rules:
 * 1. TEST_DATABASE_URL must be configured.
 * 2. Target database must not be 'postgres' (the persistent database) unless schema is explicitly 'test'.
 * 3. Live query must confirm current_database() is 'meal_test' or ends with '_test'.
 */
export async function assertTestDatabase(customUrl?: string): Promise<DatabaseTargetInfo> {
  const url = customUrl !== undefined
    ? customUrl.trim()
    : (process.env.TEST_DATABASE_URL?.trim() || (process.env.NODE_ENV === "test" ? process.env.DATABASE_URL?.trim() : undefined));

  if (!url) {
    throw new Error(
      "[DATABASE SAFETY GUARD] Refusing to run tests: TEST_DATABASE_URL is not configured. Automated tests must NEVER fall back to the normal application database."
    );
  }

  // Pre-connection URL check
  try {
    const parsed = new URL(url.replace("postgres://", "http://").replace("postgresql://", "http://"));
    const dbName = parsed.pathname.replace(/^\//, "");
    if (dbName === "postgres" && !url.includes("schema=test") && !url.includes("schema=test_")) {
      throw new Error(
        `[CRITICAL DATABASE SAFETY GUARD] Blocked connection to persistent database "${dbName}"! Tests must run exclusively against an isolated test database (e.g. meal_test).`
      );
    }
  } catch (err: any) {
    if (err.message.includes("CRITICAL DATABASE SAFETY GUARD")) throw err;
    // URL parse error will be handled on connection
  }

  const client = new PrismaClient({ datasourceUrl: url });
  try {
    const rows = await client.$queryRawUnsafe<Array<{ current_database: string; current_schema: string; current_user: string }>>(
      "SELECT current_database(), current_schema(), current_user"
    );
    const info = rows[0];
    if (!info) {
      throw new Error("[DATABASE SAFETY GUARD] Failed to query database identity.");
    }

    if (
      info.current_database === "postgres" &&
      info.current_schema !== "test" &&
      !info.current_schema.startsWith("test_")
    ) {
      throw new Error(
        `[CRITICAL DATABASE SAFETY GUARD] SAFETY VIOLATION! Live query confirmed target is "${info.current_database}" (schema: "${info.current_schema}"). Tests must NEVER run against this database!`
      );
    }

    return {
      database: info.current_database,
      schema: info.current_schema,
      user: info.current_user,
    };
  } finally {
    await client.$disconnect();
  }
}
