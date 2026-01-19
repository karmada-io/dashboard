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

// apps/dashboard/e2e/namespace-delete.spec.ts
import { test, expect } from '@playwright/test';
import { setupDashboardAuthentication } from '../test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should delete a namespace', async ({ page }) => {
    await page.waitForSelector('text=Namespaces', { timeout: 60000 });
    await page.click('text=Namespaces');

    // Create temporary namespace
    const namespaceName = `test-to-delete-${Date.now()}`;
    await page.click('button:has-text("Add")');
    await page.fill('#name', namespaceName);
    await page.click('label:has-text("No")');
    await page.click('button:has-text("Submit")');


    const namespaceModal = page.getByText('AddNameSkip automatic')
    await expect(namespaceModal).toBeHidden({
        timeout: 60000,
    });

    // Use search box to confirm creation success
    const searchBox = page.getByPlaceholder('Search by Name');
    await searchBox.fill(namespaceName);
    await searchBox.press('Enter');
    await page.waitForSelector(`tr:has-text("${namespaceName}")`, { timeout: 30000 });

    // Delete namespace
    await page.click(`tr:has-text("${namespaceName}") button:has-text("Delete")`);
    await page.click('button:has-text("Confirm")');

    // Refresh page to ensure table gets latest data
    await page.reload({ waitUntil: 'networkidle' });

    // Use search box to confirm deletion
    await searchBox.fill(namespaceName);
    await searchBox.press('Enter');

    // Confirm namespace is deleted
    const table = page.locator('table');
    const start = Date.now();
    let gone = false;

    while (Date.now() - start < 120000) { // Wait up to 120 seconds
        const content = await table.innerText();
        if (!content.includes(namespaceName)) {
            gone = true;
            break;
        }
        await page.waitForTimeout(5000); // Check every 5 seconds
        await page.reload({ waitUntil: 'networkidle' }); // Force refresh to get latest data
        await searchBox.fill(namespaceName);
        await searchBox.press('Enter');
    }

    // Confirm final deletion (fails if timeout)
    expect(gone).toBeTruthy();

    // Clear search box
    await searchBox.clear();

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-namespace-delete.png', fullPage: true });
    }
});
