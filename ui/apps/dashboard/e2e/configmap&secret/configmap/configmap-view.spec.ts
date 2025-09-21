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
import { setupDashboardAuthentication, generateTestConfigMapYaml, createK8sConfigMap, getConfigMapNameFromYaml, deleteK8sConfigMap } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view configmap details', async ({ page }) => {
    // Create a test configmap directly via API to set up test data
    const testConfigMapYaml = generateTestConfigMapYaml();
    const configMapName = getConfigMapNameFromYaml(testConfigMapYaml);

    // Setup: Create configmap using kubectl
    await createK8sConfigMap(testConfigMapYaml);

    // Navigate to configmap page
    await page.click('text=ConfigMaps & Secrets');

    // Click visible ConfigMap tab
    const configMapTab = page.locator('role=option[name="ConfigMap"]');
    await configMapTab.waitFor({ state: 'visible', timeout: 30000 });
    await configMapTab.click();

    // Verify selected state
    await expect(configMapTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for configmap to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${configMapName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test configmap name
    const targetRow = page.locator(`table tbody tr:has-text("${configMapName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');

    // Cleanup: Delete the created configmap
    try {
        await deleteK8sConfigMap(configMapName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup configmap ${configMapName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-configmap-view.png', fullPage: true });
    }
});
