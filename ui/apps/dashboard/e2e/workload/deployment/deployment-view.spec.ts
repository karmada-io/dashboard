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

    // 等待至少有一个deployment行存在
    await page.waitForSelector('table tbody tr', { timeout: 30000 });

    // 点击第一个deployment的View按钮
    const firstViewButton = page.locator('table tr:not(:first-child)').first().getByText('View');
    await firstViewButton.click();

    // 验证详情页已显示
    await page.waitForLoadState('networkidle');

    // Debug
    if(process.env.DEBUG === 'true'){
        await page.screenshot({ path: 'debug-deployment-view.png', fullPage: true });
    }
});