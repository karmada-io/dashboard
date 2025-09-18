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
import { setupDashboardAuthentication, generateTestDaemonSetYaml, createK8sDaemonSet, getDaemonSetNameFromYaml} from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should delete daemonset successfully', async ({ page }) => {
    // Create a test daemonset directly via kubectl to set up test data
    const testDaemonSetYaml = generateTestDaemonSetYaml();
    const daemonSetName = getDaemonSetNameFromYaml(testDaemonSetYaml);

    // Setup: Create daemonset using kubectl
    await createK8sDaemonSet(testDaemonSetYaml);

    // Navigate to workload page
    await page.click('text=Workloads');
    
    // Click visible Daemonset tab
    const daemonsetTab = page.locator('role=option[name="Daemonset"]');
    await daemonsetTab.waitFor({ state: 'visible', timeout: 30000 });
    await daemonsetTab.click();
    
    // Verify selected state
    await expect(daemonsetTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for daemonset to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${daemonSetName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test daemonset name
    const targetRow = page.locator(`table tbody tr:has-text("${daemonSetName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find Delete button in that row and click
    const deleteButton = targetRow.locator('button[type="button"]').filter({ hasText: /^(Delete)$/ });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });

    // Listen for delete API call
    const deleteApiPromise = page.waitForResponse(response => {
        return response.url().includes('/_raw/daemonset') &&
            response.url().includes(`name/${daemonSetName}`) &&
            response.request().method() === 'DELETE' &&
            response.status() === 200;
    }, { timeout: 15000 });

    await deleteButton.click();

    // Wait for delete confirmation tooltip to appear
    await page.waitForSelector('[role="tooltip"]', { timeout: 10000 });

    // Click Confirm button to confirm deletion
    const confirmButton = page.locator('[role="tooltip"] button').filter({ hasText: /^(Confirm)$/ });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Wait for delete API call to succeed
    await deleteApiPromise;

    // Wait for tooltip to close
    await page.waitForSelector('[role="tooltip"]', { state: 'detached', timeout: 10000 }).catch(() => {});

    // Refresh page to ensure UI is updated after deletion
    await page.reload();
    await page.click('text=Workloads');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Verify daemonset no longer exists in table
    await expect(table.locator(`text=${daemonSetName}`)).toHaveCount(0, { timeout: 30000 });

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-daemonset-delete-kubectl.png', fullPage: true });
    }
});
