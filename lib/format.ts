/**
 * Centralized formatting utilities for consistent display across components.
 */

import type { CurrencyCode } from '@/contexts/CurrencyContext';

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '€',
  USD: '$',
  INR: '₹',
  CNY: '¥',
  GBP: '£',
};

/**
 * Format a number as currency for display.
 * @param amount - Amount in the source currency (typically EUR)
 * @param currency - Target currency code (default EUR)
 * @param conversionRate - Optional multiplier for currency conversion (default 1)
 * @param symbolPosition - 'prefix' (e.g. "€ 1.200,50") or 'suffix' (e.g. "1.200,50 €") for German-style
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'EUR',
  conversionRate: number = 1,
  symbolPosition: 'prefix' | 'suffix' = 'prefix'
): string {
  const converted = amount * conversionRate;
  const rounded = Math.round(converted * 100) / 100;
  const wholePart = Math.floor(rounded);
  const centsPart = Math.round((rounded - wholePart) * 100);
  const formattedWhole = wholePart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const symbol = CURRENCY_SYMBOLS[currency] || '€';
  const formatted = `${formattedWhole},${centsPart.toString().padStart(2, '0')}`;
  return symbolPosition === 'suffix' ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
}
