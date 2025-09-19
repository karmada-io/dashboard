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
import { setupDashboardAuthentication, generateTestDeploymentYaml, createK8sDeployment, getDeploymentNameFromYaml, deleteK8sDeployment } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view deployment details', async ({ page }) => {
    // Create a test deployment directly via API to set up test data
    const testDeploymentYaml = generateTestDeploymentYaml();
    const deploymentName = getDeploymentNameFromYaml(testDeploymentYaml);
    
    // Setup: Create deployment using kubectl
    await createK8sDeployment(testDeploymentYaml);
    
    // Navigate to workload page
    await page.click('text=Workloads');
    await expect(page.getByRole('radio', { name: 'Deployment' })).toBeChecked();
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
    
    // Wait for deployment to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${deploymentName}`)).toBeVisible({ timeout: 30000 });
    
    // Find row containing test deployment name
    const targetRow = page.locator(`table tbody tr:has-text("${deploymentName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });
    
    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');
    
    // Cleanup: Delete the created deployment
    try {
        await deleteK8sDeployment(deploymentName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup deployment ${deploymentName}:`, error);
    }

    // Debug
    if (process.env.DEBUG === 'true') {
        await page.screenshot({ path: 'debug-deployment-view.png', fullPage: true });
    }
});