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

// 设置服务器地址和基础路径
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 5173;
const baseURL = `http://${HOST}:${PORT}`;
const basePath = '/multicloud-resource-manage';
const token = process.env.KARMADA_TOKEN || '';

// 生成带时间戳的测试YAML
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
    // 导航到工作负载页面
    await page.click('text=Workloads');
    await expect(page.getByRole('radio', { name: 'Deployment' })).toBeChecked();
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
    
    // 创建一个测试用的deployment
    await page.click('button:has-text("Add")');
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    
    // 监听API调用
    const apiRequestPromise = page.waitForResponse(response => {
        return response.url().includes('/api/v1/_raw/Deployment') && response.status() === 200;
    }, { timeout: 15000 });
    
    const testDeploymentYaml = generateTestDeploymentYaml();
    
    // 设置Monaco编辑器的DOM内容
    await page.evaluate((yaml) => {
        const textarea = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement;
        if (textarea) {
            textarea.value = yaml;
            textarea.focus();
        }
    }, testDeploymentYaml);
    
    // 调用React的onChange回调来更新组件状态
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
    
    // 等待提交按钮变为可用状态
    await expect(page.locator('[role="dialog"] button:has-text("Submit")')).toBeEnabled();
    await page.click('[role="dialog"] button:has-text("Submit")');
    
    // 等待API调用成功
    const response = await apiRequestPromise;
    expect(response.status()).toBe(200);
    
    // 获取创建的deployment名称
    const deploymentName = testDeploymentYaml.match(/name: (.+)/)?.[1];
    if (!deploymentName) {
        throw new Error('Could not extract deployment name from YAML');
    }
    
    // 等待成功消息出现
    try {
        await expect(page.locator('text=Workloads Newly Added Success')).toBeVisible({ timeout: 5000 });
    } catch (e) {
        // 成功消息可能没有出现，继续执行
    }
    
    // 等待对话框关闭
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 10000 }).catch(() => {});
    
    // 等待deployment出现在列表中
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });
    
    // 尝试多次查找deployment，使用更灵活的选择器
    let deploymentFound = false;
    for (let i = 0; i < 10; i++) {
        try {
            const deploymentElement = page.locator(`table tbody tr:has-text("${deploymentName}")`);
            await expect(deploymentElement).toBeVisible({ timeout: 3000 });
            deploymentFound = true;
            break;
        } catch (e) {
            await page.waitForTimeout(2000); // 等待2秒后重试
        }
    }
    
    if (!deploymentFound) {
        throw new Error(`Deployment ${deploymentName} not found in the table after multiple attempts`);
    }
    
    // 查找包含测试deployment名称的行
    const targetRow = page.locator(`table tbody tr:has-text("${deploymentName}")`);
    await expect(targetRow).toBeVisible({ timeout: 15000 });
    
    // 找到该行的Delete按钮并点击
    const deleteButton = targetRow.locator('button[type="button"]').filter({ hasText: /^(删除|Delete)$/ });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    
    // 监听删除API调用
    const deleteApiPromise = page.waitForResponse(response => {
        return response.url().includes('/_raw/deployment') && 
               response.url().includes(`name/${deploymentName}`) &&
               response.request().method() === 'DELETE' && 
               response.status() === 200;
    }, { timeout: 15000 });
    
    await deleteButton.click();
    
    // 等待删除确认tooltip出现
    await page.waitForSelector('[role="tooltip"]', { timeout: 10000 });
    
    // 点击Confirm按钮确认删除
    const confirmButton = page.locator('[role="tooltip"] button').filter({ hasText: /^(Confirm)$/ });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();
    
    // 等待删除API调用成功
    const deleteResponse = await deleteApiPromise;
    expect(deleteResponse.status()).toBe(200);
    
    // 等待tooltip关闭
    await page.waitForSelector('[role="tooltip"]', { state: 'detached', timeout: 10000 }).catch(() => {});
    
    // 验证deployment不再存在于表格中
    await expect(table.locator(`text=${deploymentName}`)).toHaveCount(0, { timeout: 10000 });

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-deployment-delete.png', fullPage: true });
    }
});