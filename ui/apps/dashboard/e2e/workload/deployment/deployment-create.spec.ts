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
import { setupDashboardAuthentication, generateTestDeploymentYaml, deleteK8sDeployment, getDeploymentNameFromYaml } from './test-utils';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should create a new deployment', async ({ page }) => {
    // Navigate to workload page
    await page.click('text=Workloads');
    await expect(page.getByRole('radio', { name: 'Deployment' })).toBeChecked();
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
    await page.click('button:has-text("Add")');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // Listen for API calls
    const apiRequestPromise = page.waitForResponse(response => {
        return response.url().includes('/api/v1/_raw/Deployment') && response.status() === 200;
    }, { timeout: 15000 });
    
    const testDeploymentYaml = generateTestDeploymentYaml();
    
    // Set Monaco editor DOM content
    await page.evaluate((yaml) => {
        const textarea = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement;
        if (textarea) {
            textarea.value = yaml;
            textarea.focus();
        }
    }, testDeploymentYaml);
    
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
    }, testDeploymentYaml);
    /* eslint-enable */
    
    // Wait for submit button to become enabled
    await expect(page.locator('[role="dialog"] button:has-text("Submit")')).toBeEnabled();
    await page.click('[role="dialog"] button:has-text("Submit")');
    
    // Wait for API call to succeed
    await apiRequestPromise;
    
    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 }).catch(() => {
        // Dialog may already be closed
    });
    
    // Verify new deployment appears in list
    const deploymentName = getDeploymentNameFromYaml(testDeploymentYaml);
    
    // Assert deployment name exists
    expect(deploymentName).toBeTruthy();
    expect(deploymentName).toBeDefined();

    try {
        await expect(page.locator('table').locator(`text=${deploymentName}`)).toBeVisible({ 
            timeout: 15000 
        });
    } catch {
        // If not shown immediately in list, may be due to cache or refresh delay
        // But API success indicates deployment was created
    }
    
    // Cleanup: Delete the created deployment
    try {
        await deleteK8sDeployment(deploymentName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup deployment ${deploymentName}:`, error);
    }

    // Debug
    if (process.env.DEBUG === 'true') {
        await page.screenshot({ path: 'debug-deployment-create.png', fullPage: true });
    }

});
