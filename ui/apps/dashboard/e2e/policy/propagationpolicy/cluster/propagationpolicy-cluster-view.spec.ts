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
import { setupDashboardAuthentication, generateTestClusterPropagationPolicyYaml, createK8sClusterPropagationPolicy, getClusterPropagationPolicyNameFromYaml, deleteK8sClusterPropagationPolicy } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view cluster propagationpolicy details', async ({ page }) => {
    // Create a test cluster propagationpolicy directly via API to set up test data
    const testClusterPropagationPolicyYaml = generateTestClusterPropagationPolicyYaml();
    const clusterPropagationPolicyName = getClusterPropagationPolicyNameFromYaml(testClusterPropagationPolicyYaml);

    // Setup: Create cluster propagationpolicy using API
    await createK8sClusterPropagationPolicy(testClusterPropagationPolicyYaml);

    // Open Policies menu
    await page.click('text=Policies');

    // Click Propagation Policy menu item
    const propagationPolicyMenuItem = page.locator('text=Propagation Policy');
    await propagationPolicyMenuItem.waitFor({ state: 'visible', timeout: 30000 });
    await propagationPolicyMenuItem.click();

    // Click Cluster level tab
    const clusterLevelTab = page.locator('role=option[name="Cluster level"]');
    await clusterLevelTab.waitFor({ state: 'visible', timeout: 30000 });
    await clusterLevelTab.click();

    // Verify selected state
    await expect(clusterLevelTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for cluster propagationpolicy to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${clusterPropagationPolicyName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test cluster propagationpolicy name
    const targetRow = page.locator(`table tbody tr:has-text("${clusterPropagationPolicyName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');

    // Cleanup: Delete the created cluster propagationpolicy
    try {
        await deleteK8sClusterPropagationPolicy(clusterPropagationPolicyName);
    } catch (error) {
        console.warn(`Failed to cleanup cluster propagationpolicy ${clusterPropagationPolicyName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-cluster-propagationpolicy-view.png', fullPage: true });
    }
});
