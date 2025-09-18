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
import { setupDashboardAuthentication, generateTestStatefulSetYaml, createK8sStatefulSet, getStatefulSetNameFromYaml, deleteK8sStatefulSet } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view statefulset details', async ({ page }) => {
    // Create a test statefulset directly via API to set up test data
    const testStatefulSetYaml = generateTestStatefulSetYaml();
    const statefulSetName = getStatefulSetNameFromYaml(testStatefulSetYaml);

    // Setup: Create statefulset using kubectl
    await createK8sStatefulSet(testStatefulSetYaml);

    // Navigate to workload page
    await page.click('text=Workloads');
    
    // Click visible Statefulset tab
    const statefulsetTab = page.locator('role=option[name="Statefulset"]');
    await statefulsetTab.waitFor({ state: 'visible', timeout: 30000 });
    await statefulsetTab.click();
    
    // Verify selected state
    await expect(statefulsetTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for statefulset to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${statefulSetName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test statefulset name
    const targetRow = page.locator(`table tbody tr:has-text("${statefulSetName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');

    // Cleanup: Delete the created statefulset
    try {
        await deleteK8sStatefulSet(statefulSetName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup statefulset ${statefulSetName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-statefulset-view.png', fullPage: true });
    }
});
