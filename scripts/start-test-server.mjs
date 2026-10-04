import { spawn } from 'child_process';
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
  console.error('[CRITICAL] Cannot start test server: TEST_DATABASE_URL is not configured.');
  process.exit(1);
}

// 2. Validate safety guard
console.log('[Test Server] Verifying database isolation guard...');
const target = await assertTestDatabase(testDbUrl);
console.log(`[Test Server Safety Passed] Connected to isolated test DB: "${target.database}"`);

// 3. Start Next.js on port 3101 with test env
console.log('[Test Server] Launching Next.js on port 3101 with isolated test DB...');
const server = spawn('npx.cmd', ['next', 'dev', '-p', '3101'], {
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: '3101',
    DATABASE_URL: testDbUrl,
    PRISMA_DATABASE_URL: testDbUrl,
    TEST_DATABASE_URL: testDbUrl,
    ALLOW_TEST_DATABASE_MUTATION: 'true',
    APP_URL: 'http://localhost:3101',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3101',
  },
  stdio: 'inherit',
  shell: true,
});

server.on('exit', (code) => {
  console.log(`[Test Server] Exited with code ${code}`);
  process.exit(code ?? 0);
});

// Forward termination signals
process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));
