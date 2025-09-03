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

// Set server address and base path
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 5173;
const baseURL = `http://${HOST}:${PORT}`;
const basePath = '/multicloud-resource-manage';
const token = process.env.KARMADA_TOKEN || '';

// Generate test YAML with timestamp
function generateTestDeploymentYaml() {
    const timestamp = Date.now();
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-deployment-${timestamp}
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80`;
}

test.beforeEach(async ({ page }) => {
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.goto(`${baseURL}${basePath}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Overview', { timeout: 30000 });
});

test('should delete deployment successfully', async ({ page }) => {
    // Navigate to workload page
    await page.click('text=Workloads');
    await expect(page.getByRole('radio', { name: 'Deployment' })).toBeChecked();
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
    
    // Create a test deployment
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
    
    // Wait for submit button to become enabled
    await expect(page.locator('[role="dialog"] button:has-text("Submit")')).toBeEnabled();
    await page.click('[role="dialog"] button:has-text("Submit")');
    
    // Wait for API call to succeed
    const response = await apiRequestPromise;
    expect(response.status()).toBe(200);
    
    // Get the created deployment name
    const deploymentName = testDeploymentYaml.match(/name: (.+)/)?.[1];
    if (!deploymentName) {
        throw new Error('Could not extract deployment name from YAML');
    }
    
    // Wait for success message to appear
    try {
        await expect(page.locator('text=Workloads Newly Added Success')).toBeVisible({ timeout: 5000 });
    } catch (e) {
        // Success message may not appear, continue execution
    }
    
    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 10000 }).catch(() => {});
    
    // Wait for deployment to appear in list
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });
    
    // Try multiple times to find deployment with more flexible selector
    let deploymentFound = false;
    for (let i = 0; i < 10; i++) {
        try {
            const deploymentElement = page.locator(`table tbody tr:has-text("${deploymentName}")`);
            await expect(deploymentElement).toBeVisible({ timeout: 3000 });
            deploymentFound = true;
            break;
        } catch (e) {
            await page.waitForTimeout(2000); // Wait 2 seconds then retry
        }
    }
    
    if (!deploymentFound) {
        throw new Error(`Deployment ${deploymentName} not found in the table after multiple attempts`);
    }
    
    // Find row containing test deployment name
    const targetRow = page.locator(`table tbody tr:has-text("${deploymentName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });
    
    // Find Delete button in that row and click
    const deleteButton = targetRow.locator('button[type="button"]').filter({ hasText: /^(删除|Delete)$/ });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    
    // Listen for delete API call
    const deleteApiPromise = page.waitForResponse(response => {
        return response.url().includes('/_raw/deployment') && 
               response.url().includes(`name/${deploymentName}`) &&
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
    const deleteResponse = await deleteApiPromise;
    expect(deleteResponse.status()).toBe(200);
    
    // Wait for tooltip to close
    await page.waitForSelector('[role="tooltip"]', { state: 'detached', timeout: 10000 }).catch(() => {});
    
    // Verify deployment no longer exists in table
    await expect(table.locator(`text=${deploymentName}`)).toHaveCount(0, { timeout: 10000 });

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-deployment-delete.png', fullPage: true });
    }
});