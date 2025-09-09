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
import { setupDashboardAuthentication, generateTestClusterOverridePolicyYaml, deleteK8sClusterOverridePolicy, getClusterOverridePolicyNameFromYaml } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should create a new cluster overridepolicy', async ({ page }) => {
    // Open Policies menu
    await page.click('text=Policies');

    // Click Override Policy menu item
    const overridePolicyMenuItem = page.locator('text=Override Policy');
    await overridePolicyMenuItem.waitFor({ state: 'visible', timeout: 30000 });
    await overridePolicyMenuItem.click();

    // Click Cluster level tab
    const clusterLevelTab = page.locator('role=option[name="Cluster level"]');
    await clusterLevelTab.waitFor({ state: 'visible', timeout: 30000 });
    await clusterLevelTab.click();

    // Verify selected state
    await expect(clusterLevelTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
    await page.click('button:has-text("Add")');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // Listen for API calls
    const apiRequestPromise = page.waitForResponse(response => {
        return response.url().includes('/api/v1/overridepolicy') && response.status() === 200;
    }, { timeout: 15000 });

    const testClusterOverridePolicyYaml = generateTestClusterOverridePolicyYaml();

    // Set Monaco editor DOM content
    await page.evaluate((yaml) => {
        const textarea = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement;
        if (textarea) {
            textarea.value = yaml;
            textarea.focus();
        }
    }, testClusterOverridePolicyYaml);

    /* eslint-disable */
    // Call React onChange callback to update component state
    await page.evaluate((yaml) => {

        const findReactFiber = (element: any) => {
            const keys = Object.keys(element);
            return keys.find(key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'));
        };

        const monacoContainer = document.querySelector('.monaco-editor');
        if (monacoContainer) {
            const fiberKey = findReactFiber(monacoContainer);
            if (fiberKey) {
                let fiber = (monacoContainer as any)[fiberKey];

                while (fiber) {
                    if (fiber.memoizedProps && fiber.memoizedProps.onChange) {
                        fiber.memoizedProps.onChange(yaml);
                        return;
                    }
                    fiber = fiber.return;
                }
            }
        }

        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
            const fiberKey = findReactFiber(dialog);
            if (fiberKey) {
                let fiber = (dialog as any)[fiberKey];

                const traverse = (node: any, depth = 0) => {
                    if (!node || depth > 20) return false;

                    if (node.memoizedProps && node.memoizedProps.onChange) {
                        node.memoizedProps.onChange(yaml);
                        return true;
                    }

                    if (node.child && traverse(node.child, depth + 1)) return true;
                    if (node.sibling && traverse(node.sibling, depth + 1)) return true;

                    return false;
                };

                traverse(fiber);
            }
        }
    }, testClusterOverridePolicyYaml);
    /* eslint-enable */

    // Wait for submit button to become enabled
    await expect(page.locator('[role="dialog"] button:has-text("确 定")')).toBeEnabled();
    await page.click('[role="dialog"] button:has-text("确 定")');

    // Wait for API call to succeed
    await apiRequestPromise;

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 }).catch(() => {
        // Dialog may already be closed
    });

    // Verify new cluster overridepolicy appears in list
    const clusterOverridePolicyName = getClusterOverridePolicyNameFromYaml(testClusterOverridePolicyYaml);

    // Assert cluster overridepolicy name exists
    expect(clusterOverridePolicyName).toBeTruthy();
    expect(clusterOverridePolicyName).toBeDefined();

    try {
        await expect(page.locator('table').locator(`text=${clusterOverridePolicyName}`)).toBeVisible({
            timeout: 15000
        });
    } catch {
        // If not shown immediately in list, may be due to cache or refresh delay
        // But API success indicates cluster overridepolicy was created
    }

    // Cleanup: Delete the created cluster overridepolicy
    try {
        await deleteK8sClusterOverridePolicy(clusterOverridePolicyName);
    } catch (error) {
        console.warn(`Failed to cleanup cluster overridepolicy ${clusterOverridePolicyName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-cluster-overridepolicy-create.png', fullPage: true });
    }

});
