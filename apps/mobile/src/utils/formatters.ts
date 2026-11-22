/**
 * ResortOS - Formatting Utilities (Indian App Edition)
 * Standardized for Indian Rupee (₹), en-IN numeral system (Lakhs & Crores), and Indian hospitality.
 */

/**
 * Format raw numbers as Indian Rupee currency strings
 * e.g., 38650 -> "₹38,650", 185000 -> "₹1,85,000"
 */
export const formatCurrency = (amount: number): string => {
  if (isNaN(amount)) return '₹0';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
};

/**
 * Format currency with 2 decimal places (for ADR, RevPAR)
 * e.g., 4350.5 -> "₹4,350.50"
 */
export const formatCurrencyDetailed = (amount: number): string => {
  if (isNaN(amount)) return '₹0.00';
  return (
    '₹' +
    amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

/**
 * Format percentages
 * e.g., 65 -> "65%"
 */
export const formatPercentage = (percent: number): string => {
  if (isNaN(percent)) return '0%';
  return `${Math.round(percent)}%`;
};

/**
 * Format compact numbers in Indian system (Lakhs / Crores / Thousands)
 * e.g., 185000 -> "₹1.9 L", 12500000 -> "₹1.25 Cr"
 */
export const formatCompactCurrency = (amount: number): string => {
  if (isNaN(amount)) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return formatCurrency(amount);
};

/**
 * Format simple date string (YYYY-MM-DD to readable Indian format)
 * e.g., 2026-11-16 -> "16 Nov 2026"
 */
export const formatDate = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${monthNames[monthIndex]} ${year}`;
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};
