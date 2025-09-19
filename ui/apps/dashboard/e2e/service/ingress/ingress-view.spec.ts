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
import { setupDashboardAuthentication, generateTestIngressYaml, createK8sIngress, getIngressNameFromYaml, deleteK8sIngress } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view ingress details', async ({ page }) => {
    // Create a test ingress directly via API to set up test data
    const testIngressYaml = generateTestIngressYaml();
    const ingressName = getIngressNameFromYaml(testIngressYaml);

    // Setup: Create ingress using kubectl
    await createK8sIngress(testIngressYaml);

    // Navigate to services page
    await page.click('text=Services');
    
    // Click visible Ingress tab
    const ingressTab = page.locator('role=option[name="Ingress"]');
    await ingressTab.waitFor({ state: 'visible', timeout: 30000 });
    await ingressTab.click();
    
    // Verify selected state
    await expect(ingressTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for ingress to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${ingressName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test ingress name
    const targetRow = page.locator(`table tbody tr:has-text("${ingressName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');

    // Cleanup: Delete the created ingress
    try {
        await deleteK8sIngress(ingressName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup ingress ${ingressName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-ingress-view.png', fullPage: true });
    }
});
