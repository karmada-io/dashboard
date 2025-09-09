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
import { setupDashboardAuthentication, generateTestJobYaml, createK8sJob, getJobNameFromYaml, deleteK8sJob } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should view job details', async ({ page }) => {
    // Create a test job directly via API to set up test data
    const testJobYaml = generateTestJobYaml();
    const jobName = getJobNameFromYaml(testJobYaml);

    // Setup: Create job using kubectl
    await createK8sJob(testJobYaml);

    // Navigate to workload page
    await page.click('text=Workloads');
    
    // Click visible Job tab
    const jobTab = page.locator('role=option[name="Job"]');
    await jobTab.waitFor({ state: 'visible', timeout: 30000 });
    await jobTab.click();
    
    // Verify selected state
    await expect(jobTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // Wait for job to appear in list
    const table = page.locator('table');
    await expect(table.locator(`text=${jobName}`)).toBeVisible({ timeout: 30000 });

    // Find row containing test job name
    const targetRow = page.locator(`table tbody tr:has-text("${jobName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    // Find View button in that row and click
    const viewButton = targetRow.getByText('View');
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // Verify details page is displayed
    await page.waitForLoadState('networkidle');

    // Cleanup: Delete the created job
    try {
        await deleteK8sJob(jobName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup job ${jobName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-job-view.png', fullPage: true });
    }
});
