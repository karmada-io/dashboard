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

// apps/dashboard/e2e/namespace-create.spec.ts
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

test('should create a new namespace', async ({ page }) => {
    // 打开 Namespaces 页面
    await page.waitForSelector('text=Namespaces', { timeout: 60000 });
    await page.click('text=Namespaces');

    // 点击 "Add" 创建新 namespace
    await page.waitForSelector('button:has-text("Add")', { timeout: 30000 });
    await page.click('button:has-text("Add")');

    // 填写唯一 namespace 名称
    const namespaceName = `test-${Date.now()}`;
    await page.waitForSelector('#name', { timeout: 30000 });
    await page.fill('#name', namespaceName);

    // 提交创建
    await page.click('label:has-text("No")');
    await page.click('button:has-text("Submit")');

    // 搜索并验证 namespace 已创建
    const searchBox = page.getByPlaceholder('Search by Name');
    await searchBox.fill(namespaceName);
    await searchBox.press('Enter');
    await page.waitForTimeout(1000);

    await page.waitForSelector(`tr:has-text("${namespaceName}")`, { timeout: 60000 });
    await expect(page.locator('table')).toContainText(namespaceName);

    await page.screenshot({ path: 'debug-namespace-create.png', fullPage: true });
});
