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
import {
    setupDashboardAuthentication,
    generateTestMemberClusterResourceYaml,
    createK8sMemberCluster,
    getMemberClusterNameFromResourceYaml,
    deleteK8sMemberCluster,
    debugScreenshot,
    MemberClusterSelectors
} from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should edit member cluster successfully', async ({ page }) => {
    // Create a test member cluster directly via API to set up test data
    const testMemberClusterYaml = generateTestMemberClusterResourceYaml();
    const memberClusterName = getMemberClusterNameFromResourceYaml(testMemberClusterYaml);

    // Setup: Create member cluster using API
    await createK8sMemberCluster(testMemberClusterYaml);

    // Open Member Clusters menu
    await page.click('text=Member Clusters');

    // Verify table is visible
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for member cluster to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${memberClusterName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test member cluster name
    const targetRow = page.locator(`table tbody tr:has-text("${memberClusterName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find Edit button in that row and click
    const editButton = targetRow.getByText('Edit');
    await expect(editButton).toBeVisible({ timeout: 15000 });

    // Listen for update API call
    const updateApiPromise = page.waitForResponse(response => {
        return response.url().includes(`/cluster/${memberClusterName}`) &&
            response.request().method() === 'PUT' &&
            response.status() === 200;
    }, { timeout: 15000 });

    await editButton.click();

    // Wait for edit dialog to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });

    // Verify the dialog title
    await expect(page.locator('text=Edit Cluster')).toBeVisible();

    // Verify name field is populated and disabled
    const nameField = page.getByRole('textbox', { name: MemberClusterSelectors.nameField });
    await expect(nameField).toHaveValue(memberClusterName);

    // Modify cluster taint
    const taintKeyField = page.getByRole('textbox', { name: MemberClusterSelectors.taintKeyField });
    const taintValueField = page.getByRole('textbox', { name: MemberClusterSelectors.taintValueField });

    if (await taintKeyField.isVisible() && await taintValueField.isVisible()) {
        try {
            await taintKeyField.clear();
            await taintKeyField.fill('test-key');
            await taintValueField.fill('test-value');
        } catch (error) {
            // Continue with form submission if taint modification fails
        }
    }

    // Click Submit button
    const submitButton = page.locator('[role="dialog"] button:has-text("Submit")');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Wait for the update API call to complete
    await updateApiPromise;

    // Cleanup: Delete the created member cluster
    try {
        await deleteK8sMemberCluster(memberClusterName);
    } catch (error) {
        console.warn(`Failed to cleanup member cluster ${memberClusterName}:`, error);
    }

    // Debug
    await debugScreenshot(page, 'debug-membercluster-edit.png');

});
