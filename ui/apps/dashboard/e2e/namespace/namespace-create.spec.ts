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

// apps/dashboard/e2e/namespace-create.spec.ts
import { test, expect } from '@playwright/test';
import { setupDashboardAuthentication } from '../test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should create a new namespace', async ({ page }) => {
    // Open Namespaces page
    await page.waitForSelector('text=Namespaces', { timeout: 60000 });
    await page.click('text=Namespaces');

    // Click "Add" to create new namespace
    await page.waitForSelector('button:has-text("Add")', { timeout: 30000 });
    await page.click('button:has-text("Add")');

    // Fill unique namespace name
    const namespaceName = `test-${Date.now()}`;
    await page.waitForSelector('#name', { timeout: 30000 });
    await page.fill('#name', namespaceName);

    // Submit creation
    await page.click('label:has-text("No")');
    await page.click('button:has-text("Submit")');

    // Search and verify namespace is created
    const searchBox = page.getByPlaceholder('Search by Name');
    await searchBox.fill(namespaceName);
    await searchBox.press('Enter');
    await expect(page.locator('table')).toContainText(namespaceName);

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-namespace-create.png', fullPage: true });
    }
});
