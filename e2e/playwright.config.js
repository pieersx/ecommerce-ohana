// E2E de Ohana Moments: levanta backend (puerto 4100) y frontend (puerto 5273)
// contra una base de datos dedicada `ohana_moments_e2e` recreada en cada corrida.
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

const BACKEND_PORT = 4100;
const FRONTEND_PORT = 5273;
const E2E_DB = 'ohana_moments_e2e';
const DATABASE_URL = `postgresql://ohana_user:ohana_password@localhost:5432/${E2E_DB}`;

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node tests/setup-db.js && node src/server.js',
      cwd: path.join(__dirname, '..', 'backend'),
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        NODE_ENV: 'test',
        TEST_DB_NAME: E2E_DB,
        PORT: String(BACKEND_PORT),
        DATABASE_URL,
        JWT_SECRET: 'ohana_e2e_secret',
        FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`,
        PAYMENT_PROVIDER: 'external',
        PAYMENT_CHECKOUT_BASE_URL: '',
      },
    },
    {
      command: `pnpm exec vite --port ${FRONTEND_PORT} --strictPort`,
      cwd: path.join(__dirname, '..', 'frontend'),
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        VITE_API_URL: `http://localhost:${BACKEND_PORT}/api`,
      },
    },
  ],
});
