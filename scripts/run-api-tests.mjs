import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import { assertTestDatabase } from '../src/lib/testing/safety-guard.ts';

// 1. Resolve test database URL
let testDbUrl = process.env.TEST_DATABASE_URL;
if (!testDbUrl && fs.existsSync('.env.test')) {
  const envText = fs.readFileSync('.env.test', 'utf8');
  const m = envText.match(/TEST_DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (m) testDbUrl = m[1];
}

if (!testDbUrl) {
  console.error('[CRITICAL] Refusing to run API tests: TEST_DATABASE_URL is not configured.');
  process.exit(1);
}

// 2. Validate safety guard
const target = await assertTestDatabase(testDbUrl);
console.log(`[API Tests Safety Guard] Verified isolated test database: "${target.database}"`);

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    if (await checkPort(port)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

let spawnedServer = null;

try {
  const isRunning = await checkPort(3101);
  if (!isRunning) {
    console.log('[API Tests] Starting test server on port 3101 backed by meal_test...');
    spawnedServer = spawn('node', ['scripts/start-test-server.mjs'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '3101',
        DATABASE_URL: testDbUrl,
        PRISMA_DATABASE_URL: testDbUrl,
        TEST_DATABASE_URL: testDbUrl,
        ALLOW_TEST_DATABASE_MUTATION: 'true',
      },
      stdio: 'pipe',
    });

    const ready = await waitForPort(3101);
    if (!ready) {
      throw new Error('Test server failed to start on port 3101 within 30 seconds.');
    }
    console.log('[API Tests] Test server is ready on port 3101.');
  } else {
    console.log('[API Tests] Reusing existing test server on port 3101.');
  }

  // Run vitest API suite
  const testTarget = process.argv.slice(2).join(' ') || 'tests/api';
  console.log(`[API Tests] Running vitest run ${testTarget}...`);
  execSync(`npx.cmd vitest run ${testTarget}`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      TEST_BASE_URL: 'http://localhost:3101',
      DATABASE_URL: testDbUrl,
      PRISMA_DATABASE_URL: testDbUrl,
      TEST_DATABASE_URL: testDbUrl,
      ALLOW_TEST_DATABASE_MUTATION: 'true',
    },
  });
} finally {
  if (spawnedServer && spawnedServer.pid) {
    console.log('[API Tests] Shutting down spawned test server...');
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${spawnedServer.pid} /T /F`, { stdio: 'ignore' });
      } else {
        spawnedServer.kill();
      }
    } catch {
      // ignore if already exited
    }
  }
}
