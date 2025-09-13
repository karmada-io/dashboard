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
import { setupDashboardAuthentication, generateTestServiceYaml, createK8sService, getServiceNameFromYaml, deleteK8sService } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view service details', async ({ page }) => {
    // Create a test service directly via API to set up test data
    const testServiceYaml = generateTestServiceYaml();
    const serviceName = getServiceNameFromYaml(testServiceYaml);

    // Setup: Create service using kubectl
    await createK8sService(testServiceYaml);

    // Navigate to service page
    await page.click('text=Services');
    
    // Click visible Service tab
    const serviceTab = page.locator('role=option[name="Service"]');
    await serviceTab.waitFor({ state: 'visible', timeout: 30000 });
    await serviceTab.click();
    
    // Verify selected state
    await expect(serviceTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for service to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${serviceName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test service name
    const targetRow = page.locator(`table tbody tr:has-text("${serviceName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');

    // Cleanup: Delete the created service
    try {
        await deleteK8sService(serviceName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup service ${serviceName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-service-view.png', fullPage: true });
    }
});
