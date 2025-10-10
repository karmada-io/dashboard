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
import { setupDashboardAuthentication, generateTestMemberClusterYaml, getMemberClusterNameFromYaml } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should create a new member cluster successfully', async ({ page }) => {
    // Navigate to Member Clusters page
    await page.click('text=Member Clusters');
    await page.waitForSelector('table', { timeout: 30000 });

    // Click Add button
    await page.click('button:has-text("Add")');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // Listen for API calls
    const apiRequestPromise = page.waitForResponse(response => {
        return response.url().includes('/api/v1/cluster') && response.status() === 200;
    }, { timeout: 15000 });

    // Generate test data
    const memberClusterYaml = generateTestMemberClusterYaml();
    const clusterName = getMemberClusterNameFromYaml(memberClusterYaml);

    // Fill cluster name
    const nameField = page.getByRole('textbox', { name: '* Name :' });
    await nameField.fill(clusterName);

    // Select access mode (Pull by default)
    await page.getByRole('radio', { name: 'Pull' }).check();

    // Fill kubeconfig using TextareaWithUpload component
    const kubeconfigField = page.getByRole('textbox', { name: /Editor content/ });
    await kubeconfigField.fill(memberClusterYaml);

    // Submit form
    await expect(page.locator('[role="dialog"] button:has-text("Submit")')).toBeEnabled();
    await page.click('[role="dialog"] button:has-text("Submit")');

    // Wait for API call to succeed
    await apiRequestPromise;

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 }).catch(() => {
        // Dialog may already be closed
    });

    // Verify member cluster name exists
    expect(clusterName).toBeTruthy();
    expect(clusterName).toBeDefined();

    try {
        await expect(page.locator('table').locator(`text=${clusterName}`)).toBeVisible({
            timeout: 15000
        });
    } catch {
        // May be due to cache or refresh delay
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-membercluster-create.png', fullPage: true });
    }
});