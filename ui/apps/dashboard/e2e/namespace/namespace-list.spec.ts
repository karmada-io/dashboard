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

// apps/dashboard/e2e/namespace-list.spec.ts
import { test, expect } from '@playwright/test';

// Set webServer.url and use.baseURL with the location of the WebServer
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 5173;
const baseURL = `http://${HOST}:${PORT}`;
const basePath = '/multicloud-resource-manage';
const token = process.env.KARMADA_TOKEN || '';

test.beforeEach(async ({ page }) => {
    await page.goto(`${baseURL}${basePath}`, { waitUntil: 'networkidle' });
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('text=Dashboard', { timeout: 30000 });
});

test('should display namespace list', async ({ page }) => {
    // 打开 Namespaces 页面
    await page.waitForSelector('text=Namespaces', { timeout: 60000 });
    await page.click('text=Namespaces');

    // 获取表格元素并验证可见
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });

    // 验证表格中包含默认 namespace
    await expect(table).toContainText('default');

    await page.screenshot({ path: 'debug-namespace-list.png', fullPage: true });
});
