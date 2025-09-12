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

// apps/dashboard/e2e/job-list.spec.ts
import { test, expect } from '@playwright/test';
import { setupDashboardAuthentication } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should display job list', async ({ page }) => {
    // Open Workloads menu
    await page.click('text=Workloads');

    // Click visible Job tab
    const jobTab = page.locator('role=option[name="Job"]');
    await jobTab.waitFor({ state: 'visible', timeout: 30000 });
    await jobTab.click();

    // Verify selected state
    await expect(jobTab).toHaveAttribute('aria-selected', 'true');

    // Verify Job list table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Debug
    if (process.env.DEBUG === 'true') {
        await page.screenshot({ path: 'debug-job-list.png', fullPage: true });
    }
});
