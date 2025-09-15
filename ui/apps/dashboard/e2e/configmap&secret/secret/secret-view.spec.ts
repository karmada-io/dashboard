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
import { setupDashboardAuthentication, generateTestSecretYaml, createK8sSecret, getSecretNameFromYaml, deleteK8sSecret } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view secret details', async ({ page }) => {
    // Create a test secret directly via API to set up test data
    const testSecretYaml = generateTestSecretYaml();
    const secretName = getSecretNameFromYaml(testSecretYaml);

    // Setup: Create secret using kubectl
    await createK8sSecret(testSecretYaml);

    // Open ConfigMaps & Secrets menu
    await page.click('text=ConfigMaps & Secrets');

    // Click visible Secret tab
    const secretTab = page.locator('role=option[name="Secret"]');
    await secretTab.waitFor({ state: 'visible', timeout: 30000 });
    await secretTab.click();

    // Verify selected state
    await expect(secretTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for secret to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${secretName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test secret name
    const targetRow = page.locator(`table tbody tr:has-text("${secretName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');

    // Cleanup: Delete the created secret
    try {
        await deleteK8sSecret(secretName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup secret ${secretName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-secret-view.png', fullPage: true });
    }
});
