const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/** Formats an amount with the hotel's currency, e.g. formatMoney(12500, 'INR') -> "₹12,500". */
export function formatMoney(amount: number | null | undefined, currency = 'INR'): string {
  const value = Number(amount ?? 0);
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const grouped = value.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    maximumFractionDigits: 2,
  });
  return `${symbol}${grouped}`;
}
