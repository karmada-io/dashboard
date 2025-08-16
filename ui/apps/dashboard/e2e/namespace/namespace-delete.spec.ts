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

// apps/dashboard/e2e/namespace-delete.spec.ts
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

test('should delete a namespace', async ({ page }) => {
    await page.waitForSelector('text=Namespaces', { timeout: 60000 });
    await page.click('text=Namespaces');

    // 创建临时 namespace
    const namespaceName = `test-to-delete-${Date.now()}`;
    await page.click('button:has-text("Add")');
    await page.fill('#name', namespaceName);
    await page.click('label:has-text("No")');
    await page.click('button:has-text("Submit")');

    // 使用搜索框确认创建成功
    const searchBox = page.getByPlaceholder('Search by Name');
    await searchBox.fill(namespaceName);
    await searchBox.press('Enter');
    await page.waitForTimeout(1000);

    await page.waitForSelector(`tr:has-text("${namespaceName}")`, { timeout: 30000 });

    // 删除 namespace
    await page.click(`tr:has-text("${namespaceName}") button:has-text("Delete")`);
    await page.click('button:has-text("Confirm")');

    // 刷新页面，确保表格拉取最新数据
    await page.reload({ waitUntil: 'networkidle' });

    // 使用搜索框确认删除
    await searchBox.fill('');
    await searchBox.fill(namespaceName);
    await searchBox.press('Enter');

    // // 确认 namespace 已删除
    // await expect(page.locator('table')).not.toContainText(namespaceName, { timeout: 60000 });

    const table = page.locator('table');
    const start = Date.now();
    let gone = false;

    while (Date.now() - start < 120000) { // 最多等 120 秒
        const content = await table.innerText();
        if (!content.includes(namespaceName)) {
            console.log(`Namespace ${namespaceName} 已彻底删除`);
            gone = true;
            break;
        } else if (content.includes('Terminating')) {
            console.log(`Namespace ${namespaceName} Terminating`);
        } else {
            console.log(`Namespace ${namespaceName} 仍然存在`);
        }
        await page.waitForTimeout(5000); // 每 5 秒检查一次
        await page.reload({ waitUntil: 'networkidle' }); // 强制刷新，拿最新数据
        await searchBox.fill(namespaceName);
        await searchBox.press('Enter');
    }

    // 确认最终被删除（如果超时则失败）
    expect(gone).toBeTruthy();

    // 清空搜索框
    await searchBox.clear();

    await page.screenshot({ path: 'debug-namespace-delete.png', fullPage: true });
});
