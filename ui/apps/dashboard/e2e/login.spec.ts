/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { test, expect } from '@playwright/test';

test('should navigate to the login page', async ({ page }) => {
  // Navigate to the home page
  await page.goto('/');

  await page.waitForTimeout(2 * 1000);

  await expect(page.getByText('Sign in')).toBeVisible({
    timeout: 10000,
  });
});

/*
test('should navigate to overview after login', async ({ page }) => {
  // Navigate to the home page
  await page.goto('/');

  await page.waitForTimeout(2 * 1000);

  await page.getByTestId('login-input').fill('{token placeholder}')

  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL(/overview/, {
    timeout: 5* 1000
  })
});
*/
EOF && cat > ui/apps/dashboard/playwright.config.ts << 'EOF'
/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { defineConfig, devices } from '@playwright/test';

// Use process.env.PORT by default and fallback to port 5173
const PORT = process.env.PORT || 5173;

// Set webServer.url and use.baseURL with the location of the WebServer
const baseURL = `http://localhost:${PORT}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Timeout per test
  timeout: 30 * 1000,

  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: 'e2e',

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  // Artifacts folder where screenshots, videos, and traces are stored.
  outputDir: 'test-results/',

  use: {
    // Use baseURL so to make navigations relative.
    // More information: https://playwright.dev/docs/api/class-page#page-goto
    baseURL,

    // Retry a test if its failing with enabled tracing. This allows you to analyse the DOM, console logs,
    network traffic etc.
    // More information: https://playwright.dev/docs/trace-viewer
    trace: 'retry-with-trace',

    // All available context options: https://playwright.dev/docs/api/class-browser#browser-new-context
    // contextOptions: {
    //   ignoreHTTPSErrors: true,
    // },
  },

  // Configure projects for major browsers.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Run your local dev server before starting the tests:
  // https://playwright.dev/docs/test-advanced#launching-a-development-web-server-during-the-tests
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
