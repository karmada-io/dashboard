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
import { setupDashboardAuthentication, generateTestDaemonSetYaml, createK8sDaemonSet, getDaemonSetNameFromYaml, deleteK8sDaemonSet } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view daemonset details', async ({ page }) => {
    // Create a test daemonset directly via API to set up test data
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

    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');

    // Cleanup: Delete the created daemonset
    try {
        await deleteK8sDaemonSet(daemonSetName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup daemonset ${daemonSetName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-daemonset-view.png', fullPage: true });
    }
});
