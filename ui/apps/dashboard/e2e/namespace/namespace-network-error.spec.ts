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

// apps/dashboard/e2e/namespace/namespace-network-error.spec.ts
import { test, expect } from '@playwright/test';

// Set webServer.url and use.baseURL with the location of the WebServer
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 5173;
const baseURL = `http://${HOST}:${PORT}`;
const basePath = '/multicloud-resource-manage';
const token = process.env.KARMADA_TOKEN || '';

test('Namespace network failure with refresh', async ({ page }) => {
    // 阻塞 Namespace API 请求
    await page.route('**/api/v1/namespaces', route => route.abort());

    // 导航到页面
    await page.goto(`${baseURL}${basePath}`, { waitUntil: 'networkidle' });

    // 设置 token 并刷新，保证登录状态
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.reload({ waitUntil: 'networkidle' });

    // 等待关键元素加载完成，宽松等待 Namespaces 文字
    await page.waitForSelector('text=Namespaces', { timeout: 15000 });

    // 验证表格或错误显示
    const tableRows = page.locator('table tbody tr');
    const errorMsg = page.locator('.error-message');

    const rowCount = await tableRows.count();
    const errorCount = await errorMsg.count();

    console.log(`Table rows: ${rowCount}, Error messages: ${errorCount}`);

    // 最终断言：要么表格为空，要么显示网络错误
    expect(rowCount === 0 || errorCount > 0).toBeTruthy();

    // 截图调试
    await page.screenshot({ path: 'debug-namespace-network-failure.png', fullPage: true });
});