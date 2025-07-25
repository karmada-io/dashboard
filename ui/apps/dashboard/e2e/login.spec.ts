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

test('should navigate to the login page', async ({ page }) => {
  // Navigate to the home page
  await page.goto('/');

  await page.waitForTimeout(2 * 1000);

  await expect(page.getByText('Sign in')).toBeVisible({
    timeout: 10000,
  });
});

/*
test('should navigate to overview after login', async ({ page }) => {
  // Navigate to the home page
  await page.goto('/');

  await page.waitForTimeout(2 * 1000);

  await page.getByTestId('login-input').fill('{token placeholder}')

  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL(/overview/, {
    timeout: 5* 1000
  })
});
*/
