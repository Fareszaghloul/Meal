import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import * as argon2 from '@node-rs/argon2';
import { assertTestDatabase } from '../src/lib/testing/safety-guard.ts';

// 1. Resolve test database URL from .env.test or .env
let testDbUrl = process.env.TEST_DATABASE_URL;
if (!testDbUrl) {
  if (fs.existsSync('.env.test')) {
    const envText = fs.readFileSync('.env.test', 'utf8');
    const m = envText.match(/TEST_DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (m) testDbUrl = m[1];
  }
}
if (!testDbUrl) {
  if (fs.existsSync('.env')) {
    const envText = fs.readFileSync('.env', 'utf8');
    const m = envText.match(/TEST_DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (m) testDbUrl = m[1];
  }
}

if (!testDbUrl) {
  console.error('[CRITICAL] No TEST_DATABASE_URL found. Aborting test database setup.');
  process.exit(1);
}

async function main() {
  console.log('=== TEST DATABASE SETUP ===');
  console.log('Validating test database safety...');
  const target = await assertTestDatabase(testDbUrl);
  console.log(`[Safety Guard Passed] Target database: "${target.database}", schema: "${target.schema}"`);

  if (target.database !== 'meal_test' && !target.database.endsWith('_test')) {
    throw new Error(`Refusing to reset: database name "${target.database}" does not end with _test!`);
  }

  // 2. Reset public schema in test database
  console.log(`Resetting public schema in ${target.database}...`);
  const client = new PrismaClient({ datasourceUrl: testDbUrl });
  try {
    await client.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await client.$executeRawUnsafe('CREATE SCHEMA public');

    // Baseline legacy SQLite migration in _prisma_migrations so postgres migration chain executes
    await client.$executeRawUnsafe(`
      CREATE TABLE "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `);

    await client.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
      VALUES (
        'b13d2521-84ad-4aca-8e61-2f22a59167ee',
        '0e2fe7fe3311b6024bbb1997509308f59a290707088078c412cea5ec61299510',
        now(),
        '20260913000000_init',
        0
      )
    `);
    console.log('Initialized clean schema and baselined legacy init migration.');
  } finally {
    await client.$disconnect();
  }

  // 3. Run prisma migrate deploy using schema.test.prisma
  console.log('Running prisma migrate deploy on isolated test database...');
  const deployOut = execSync('npx.cmd prisma migrate deploy --schema=prisma/schema.test.prisma', {
    env: { ...process.env, TEST_DATABASE_URL: testDbUrl },
    stdio: 'pipe',
  }).toString();
  console.log(deployOut);

  // 4. Verify migration status
  const statusOut = execSync('npx.cmd prisma migrate status --schema=prisma/schema.test.prisma', {
    env: { ...process.env, TEST_DATABASE_URL: testDbUrl },
    stdio: 'pipe',
  }).toString();
  console.log(statusOut);

  // 5. Seed test users
  console.log('Seeding dedicated test users in test database...');
  const testPrisma = new PrismaClient({ datasourceUrl: testDbUrl });
  try {
    const passwordHashA = await argon2.hash('TestPassword123!');
    const passwordHashB = await argon2.hash('TestPassword123!');
    const passwordHashE2E = await argon2.hash('E2eTestPassword!2026');

    // Test User A
    const userA = await testPrisma.user.upsert({
      where: { email: 'test-user-a@mealprep.test' },
      update: {},
      create: {
        id: 'usr_test_a_id',
        email: 'test-user-a@mealprep.test',
        displayName: 'Test User A',
        passwordHash: passwordHashA,
        role: 'user',
        status: 'active',
      },
    });

    await testPrisma.userSettings.upsert({
      where: { userId: userA.id },
      update: {},
      create: {
        userId: userA.id,
        dailyCalories: 2200,
        dailyProtein: 160,
        dailyCarbs: 220,
        dailyFat: 70,
      },
    });

    // Test User B
    const userB = await testPrisma.user.upsert({
      where: { email: 'test-user-b@mealprep.test' },
      update: {},
      create: {
        id: 'usr_test_b_id',
        email: 'test-user-b@mealprep.test',
        displayName: 'Test User B',
        passwordHash: passwordHashB,
        role: 'user',
        status: 'active',
      },
    });

    await testPrisma.userSettings.upsert({
      where: { userId: userB.id },
      update: {},
      create: {
        userId: userB.id,
        dailyCalories: 2500,
        dailyProtein: 180,
        dailyCarbs: 250,
        dailyFat: 80,
      },
    });

    // E2E Test User
    const userE2E = await testPrisma.user.upsert({
      where: { email: 'e2e-test@mealprep.local' },
      update: {},
      create: {
        id: 'usr_e2e_test_id',
        email: 'e2e-test@mealprep.local',
        displayName: 'E2E Test User',
        passwordHash: passwordHashE2E,
        role: 'user',
        status: 'active',
      },
    });

    await testPrisma.userSettings.upsert({
      where: { userId: userE2E.id },
      update: {},
      create: {
        userId: userE2E.id,
        dailyCalories: 2300,
        dailyProtein: 180,
        dailyCarbs: 220,
        dailyFat: 70,
      },
    });

    // Deterministic sample food log entry for October 3, 2026 (used by History E2E tests)
    await testPrisma.foodLogEntry.upsert({
      where: { id: 'log_e2e_oct3_sample' },
      update: {},
      create: {
        id: 'log_e2e_oct3_sample',
        userId: userE2E.id,
        date: '2026-10-03',
        mealCategory: 'breakfast',
        name: 'Oatmeal with Berries',
        servings: 1,
        servingUnit: 'bowl',
        calories: 350,
        protein: 12,
        carbs: 60,
        fat: 6,
        fiber: 8,
      },
    });

    const foodCount = await testPrisma.food.count();
    const userCount = await testPrisma.user.count();
    console.log(`Test database ready! Seeded ${userCount} test users. Built-in food library count: ${foodCount}`);
  } finally {
    await testPrisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[FAILED] Test database setup error:', err);
  process.exit(1);
});
