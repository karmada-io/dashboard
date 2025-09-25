/*
Copyright 2025 The Karmada Authors.

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
import { setupDashboardAuthentication, generateTestClusterOverridePolicyYaml, createK8sClusterOverridePolicy, getClusterOverridePolicyNameFromYaml} from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should delete cluster overridepolicy successfully', async ({ page }) => {
    // Create a test cluster overridepolicy directly via API to set up test data
    const testClusterOverridePolicyYaml = generateTestClusterOverridePolicyYaml();
    const clusterOverridePolicyName = getClusterOverridePolicyNameFromYaml(testClusterOverridePolicyYaml);

    // Setup: Create cluster overridepolicy using API
    await createK8sClusterOverridePolicy(testClusterOverridePolicyYaml);

    // Open Policies menu
    await page.click('text=Policies');

    // Click Override Policy menu item
    const overridePolicyMenuItem = page.locator('text=Override Policy');
    await overridePolicyMenuItem.waitFor({ state: 'visible', timeout: 30000 });
    await overridePolicyMenuItem.click();

    // Click Cluster level tab
    const clusterLevelTab = page.locator('role=option[name="Cluster level"]');
    await clusterLevelTab.waitFor({ state: 'visible', timeout: 30000 });
    await clusterLevelTab.click();

    // Verify selected state
    await expect(clusterLevelTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for cluster overridepolicy to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${clusterOverridePolicyName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test cluster overridepolicy name
    const targetRow = page.locator(`table tbody tr:has-text("${clusterOverridePolicyName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find Delete button in that row and click
    const deleteButton = targetRow.locator('button[type="button"]').filter({ hasText: /^(Delete)$/ });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });

    // Listen for delete API call
    const deleteApiPromise = page.waitForResponse(response => {
        return response.url().includes('/overridepolicy') &&
            response.request().method() === 'DELETE' &&
            response.status() === 200;
    }, { timeout: 15000 });

    await deleteButton.click();

    // Wait for delete confirmation tooltip to appear
    await page.waitForSelector('[role="tooltip"]', { timeout: 10000 });

    // Click Confirm button to confirm deletion
    const confirmButton = page.locator('[role="tooltip"] button').filter({ hasText: /^(确\s*认|Confirm)$/ });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Wait for delete API call to succeed
    await deleteApiPromise;

    // Wait for tooltip to close
    await page.waitForSelector('[role="tooltip"]', { state: 'detached', timeout: 10000 }).catch(() => {});

    // Refresh page to ensure UI is updated after deletion
    await page.reload();
    await page.click('text=Policies');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Verify cluster overridepolicy no longer exists in table
    await expect(table.locator(`text=${clusterOverridePolicyName}`)).toHaveCount(0, { timeout: 30000 });

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-cluster-overridepolicy-delete.png', fullPage: true });
    }
});
