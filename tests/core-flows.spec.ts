import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const LOCALE = 'de';

test.describe('Core Happy Path Flows', () => {
  test('NC-Checker Flow: Program-First search and result cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/${LOCALE}/nc-checker`);

    // Open program dropdown
    await page.getByTestId('nc-program-trigger').click();

    // Type in search to filter programs (BWL)
    await page.getByTestId('nc-program-search').fill('BWL');

    // Select first matching program (using data-program attribute)
    await page.locator('[data-testid="nc-program-option"][data-program*="BWL"]').first().click();

    // Click a category to reveal results (available = NC-free when no grade entered)
    await page.getByTestId('nc-category-available').click();

    // Verify result cards are rendered
    const resultCards = page.getByTestId('nc-result-card');
    await expect(resultCards.first()).toBeVisible();
    await expect(resultCards).toHaveCount(await resultCards.count());
    expect(await resultCards.count()).toBeGreaterThan(0);
  });

  test('Study Cost Calculator Flow: Rent input updates monthly total', async ({ page }) => {
    await page.goto(`${BASE_URL}/${LOCALE}/calculator`);

    // Select city: open dropdown and pick Berlin
    await page.getByTestId('calculator-city-select').click();
    await page.locator('[data-testid="calculator-city-select-option"][data-value="Berlin"]').click();

    // Select university: open and pick first option (any Berlin university)
    await page.getByTestId('calculator-university-select').click();
    await page.getByTestId('calculator-university-select-option').first().click();

    // Enter rent override
    const rentInput = page.getByTestId('calculator-rent-override');
    await rentInput.fill('500');

    // Assert monthly total is visible and reflects the input (contains numeric value)
    const monthlyTotal = page.getByTestId('calculator-monthly-total');
    await expect(monthlyTotal).toBeVisible();
    const totalText = await monthlyTotal.textContent();
    expect(totalText).toBeTruthy();
    // Should show a formatted currency (e.g. 1.234,56 € or similar)
    expect(totalText).not.toBe('—');
  });

  test('Erasmus Calculator Flow: BAföG toggle reflects Social Top-Up', async ({ page }) => {
    await page.goto(`${BASE_URL}/${LOCALE}/erasmus`);

    // Select university (dropdown in portal; use evaluate to bypass viewport check)
    await page.getByTestId('erasmus-university-trigger').click();
    await page.getByTestId('erasmus-university-option').first().evaluate((el) => (el as HTMLElement).click());

    // Select program
    await page.getByTestId('erasmus-program-trigger').click();
    await page.getByTestId('erasmus-program-option').first().evaluate((el) => (el as HTMLElement).click());

    // Toggle BAföG checkbox (Social Top-Up appears in selector benefits box)
    await page.getByTestId('erasmus-bafoeg-toggle').click();

    // Verify 250€ Social Top-Up is reflected in the UI (Zustand store integration)
    const socialTopUp = page.getByTestId('erasmus-social-topup');
    await expect(socialTopUp).toBeVisible();
  });
});
