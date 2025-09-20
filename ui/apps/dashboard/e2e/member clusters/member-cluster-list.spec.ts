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

// apps/dashboard/e2e/member-cluster-list.spec.ts
import { test, expect } from '@playwright/test';
import { setupDashboardAuthentication } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should display member cluster list', async ({ page }) => {
    // Open Member Clusters menu
    await page.click('text=Member Clusters');

    // // Click Member Clusters menu item
    // const memberClustersMenuItem = page.locator('text=Member Clusters');
    // await memberClustersMenuItem.waitFor({ state: 'visible', timeout: 30000 });
    // await memberClustersMenuItem.click();

    // Verify Member Clusters list table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Verify table headers for member clusters
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Kubernetes version")')).toBeVisible();
    await expect(page.locator('th:has-text("Cluster Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Access Mode")')).toBeVisible();
    await expect(page.locator('th:has-text("Node Status")')).toBeVisible();

    // Debug
    if (process.env.DEBUG === 'true') {
        await page.screenshot({ path: 'debug-member-cluster-list.png', fullPage: true });
    }
});
