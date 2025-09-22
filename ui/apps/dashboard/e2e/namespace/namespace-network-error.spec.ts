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

// apps/dashboard/e2e/namespace/namespace-network-error.spec.ts
import { test, expect } from '@playwright/test';
import { setupDashboardAuthentication } from '../test-utils';

test('Namespace network failure with refresh', async ({ page }) => {
    // Block Namespace API requests
    await page.route('**/api/v1/namespaces', route => route.abort());

    await setupDashboardAuthentication(page);

    // Wait for key elements to load
    await page.waitForSelector('text=Namespaces', { timeout: 15000 });

    // Verify table
    const tableRows = page.locator('table tbody tr');
    // Final assertion: table should be empty when network error occurs
    await expect(tableRows).toHaveCount(0);

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-namespace-network-failure.png', fullPage: true });
    }
});
