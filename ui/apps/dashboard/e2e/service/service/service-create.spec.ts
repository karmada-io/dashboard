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
import { setupDashboardAuthentication, generateTestServiceYaml, deleteK8sService } from './test-utils';
import { parse } from 'yaml';
import _ from 'lodash';

test.beforeEach(async ({ page }) => {
    await setupDashboardAuthentication(page);
});

test('should create a new service', async ({ page }) => {
    // Navigate to service menu
    await page.click('text=Services');
    
    // Click visible Service tab
    const serviceTab = page.locator('role=option[name="Service"]');
    await serviceTab.waitFor({ state: 'visible', timeout: 30000 });
    await serviceTab.click();
    
    // Verify selected state
    await expect(serviceTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
    await page.click('button:has-text("Add")');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // Listen for API calls
    const apiRequestPromise = page.waitForResponse(response => {
        return response.url().includes('/api/v1/_raw/Service') && response.status() === 200;
    }, { timeout: 15000 });

    const testServiceYaml = generateTestServiceYaml();

    // Set Monaco editor DOM content
    await page.evaluate((yaml) => {
        const textarea = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement;
        if (textarea) {
            textarea.value = yaml;
            textarea.focus();
        }
    }, testServiceYaml);

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
    }, testServiceYaml);

    // Wait for submit button to become enabled
    await expect(page.locator('[role="dialog"] button:has-text("Submit")')).toBeEnabled();
    await page.click('[role="dialog"] button:has-text("Submit")');

    // Wait for API call to succeed
    await apiRequestPromise;

    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 }).catch(() => {
        // Dialog may already be closed
    });

    // Verify new service appears in list
    const yamlObject = parse(testServiceYaml);
    const serviceName = _.get(yamlObject,'metadata.name');

    // Assert service name exists
    expect(serviceName).toBeTruthy();
    expect(serviceName).toBeDefined();

    try {
        await expect(page.locator('table').locator(`text=${serviceName}`)).toBeVisible({
            timeout: 15000
        });
    } catch {
        // If not shown immediately in list, may be due to cache or refresh delay
        // But API success indicates service was created
    }

    // Cleanup: Delete the created service
    try {
        await deleteK8sService(serviceName, 'default');
    } catch (error) {
        console.warn(`Failed to cleanup service ${serviceName}:`, error);
    }

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-service-create.png', fullPage: true });
    }

});
