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
import { setupDashboardAuthentication, generateTestPropagationPolicyYaml, createK8sPropagationPolicy, getPropagationPolicyNameFromYaml, deleteK8sPropagationPolicy } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view propagationpolicy details', async ({ page }) => {
    // Create a test propagationpolicy directly via API to set up test data
    const testPropagationPolicyYaml = generateTestPropagationPolicyYaml();
    const propagationPolicyName = getPropagationPolicyNameFromYaml(testPropagationPolicyYaml);

    // Setup: Create propagationpolicy using kubectl
    await createK8sPropagationPolicy(testPropagationPolicyYaml);

    // Open Policies menu
    await page.click('text=Policies');

    // Click Propagation Policy menu item
    const propagationPolicyMenuItem = page.locator('text=Propagation Policy');
    await propagationPolicyMenuItem.waitFor({ state: 'visible', timeout: 30000 });
    await propagationPolicyMenuItem.click();

    // Click Namespace level tab
    const namespaceLevelTab = page.locator('role=option[name="Namespace level"]');
    await namespaceLevelTab.waitFor({ state: 'visible', timeout: 30000 });
    await namespaceLevelTab.click();

    // Verify selected state
    await expect(namespaceLevelTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for propagationpolicy to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${propagationPolicyName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test propagationpolicy name
    const targetRow = page.locator(`table tbody tr:has-text("${propagationPolicyName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');

    // Cleanup: Delete the created propagationpolicy
    try {
        await deleteK8sPropagationPolicy(propagationPolicyName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup propagationpolicy ${propagationPolicyName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-propagationpolicy-view.png', fullPage: true });
    }
});
