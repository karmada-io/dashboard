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

  await page.getByTestId('login-input').fill('{token placeholder}')

  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL(/overview/, {
    timeout: 5* 1000
  })
});
*/
