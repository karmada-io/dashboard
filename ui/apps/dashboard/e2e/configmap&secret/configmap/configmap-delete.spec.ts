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
import { setupDashboardAuthentication, generateTestConfigMapYaml, createK8sConfigMap, getConfigMapNameFromYaml} from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should delete configmap successfully', async ({ page }) => {
    // Create a test configmap directly via kubectl to set up test data
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

    // Find Delete button in that row and click
    const deleteButton = targetRow.locator('button[type="button"]').filter({ hasText: /^(Delete)$/ });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });

    // Listen for delete API call
    const deleteApiPromise = page.waitForResponse(response => {
        return response.url().includes('/_raw/configmap') &&
            response.url().includes(`name/${configMapName}`) &&
            response.request().method() === 'DELETE' &&
            response.status() === 200;
    }, { timeout: 15000 });

    await deleteButton.click();

    // Wait for delete confirmation tooltip to appear
    await page.waitForSelector('[role="tooltip"]', { timeout: 10000 });

    // Click Confirm button to confirm deletion
    const confirmButton = page.locator('[role="tooltip"] button').filter({ hasText: /^(Confirm)$/ });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Wait for delete API call to succeed
    await deleteApiPromise;

    // Wait for tooltip to close
    await page.waitForSelector('[role="tooltip"]', { state: 'detached', timeout: 10000 }).catch(() => {});

    // Refresh page to ensure UI is updated after deletion
    await page.reload();
    await page.click('text=ConfigMaps & Secrets');
    await expect(table).toBeVisible({ timeout: 30000 });

    // Verify configmap no longer exists in table
    await expect(table.locator(`text=${configMapName}`)).toHaveCount(0, { timeout: 30000 });

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-configmap-delete-kubectl.png', fullPage: true });
    }
});
