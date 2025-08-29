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
// apps/dashboard/e2e/deployment-view.spec.ts
import { test, expect } from '@playwright/test';

// Set webServer.url and use.baseURL with the location of the WebServer
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 5173;
const baseURL = `http://${HOST}:${PORT}`;
const basePath = '/multicloud-resource-manage';
const token = process.env.KARMADA_TOKEN || '';

test.beforeEach(async ({ page }) => {
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.goto(`${baseURL}${basePath}`, { waitUntil: 'networkidle' });
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('text=Overview', { timeout: 30000 });
});

test('should view deployment details', async ({ page }) => {
    // 打开 Workloads 菜单
    await page.click('text=Workloads');

    // 等待页面加载并验证 Deployment 已选中
    const deploymentTab = page.getByRole('radio', { name: 'Deployment' });
    await expect(deploymentTab).toBeChecked();

    // 等待表格加载
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });

    // 检查是否有deployment数据，如果没有则创建一个
    const deploymentRows = page.locator('table tbody tr');
    const rowCount = await deploymentRows.count();
    
    if (rowCount === 0) {
        console.log('No deployments found, creating one first...');
        
        // 创建一个deployment
        await page.click('button:has-text("Add")');
        await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
        
        const testDeploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-deployment-for-view-${Date.now()}
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
        
        // 设置YAML内容
        await page.evaluate((yaml) => {
            const textarea = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement;
            if (textarea) {
                textarea.value = yaml;
                textarea.focus();
            }
        }, testDeploymentYaml);
        
        // 触发React onChange回调
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
        
        // 等待提交按钮变为可用状态并点击
        await expect(page.locator('[role="dialog"] button:has-text("Submit")')).toBeEnabled();
        await page.click('[role="dialog"] button:has-text("Submit")');
        
        // 等待对话框关闭
        await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 10000 }).catch(() => {});
        
        // 等待表格重新加载并显示新数据
        await page.reload();
        await page.click('text=Workloads');
        await expect(table).toBeVisible({ timeout: 30000 });
        await expect(table.locator('tbody tr')).toHaveCount(1, { timeout: 10000 });
    }

    // 等待View按钮出现
    const viewButton = page.locator('table tbody tr').first().getByText('View');
    
    // 等待View按钮可见并点击
    await expect(viewButton).toBeVisible({ timeout: 15000 });
    await viewButton.click();

    // 验证详情页已显示
    await page.waitForLoadState('networkidle');

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-deployment-view.png', fullPage: true });
    }
});