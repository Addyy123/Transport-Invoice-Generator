/**
 * Converts a numeric amount to Indian English words.
 * Supports up to 999 Crore (≈ ₹9,99,99,99,999).
 * Handles both whole numbers and paise (decimal).
 */
export function amountToWords(amount: number): string {
  if (amount === 0) return 'Zero';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tensWords = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  /** Converts numbers 1–99 to words with a trailing space */
  function twoDigits(n: number): string {
    if (n <= 0) return '';
    if (n < 20) return ones[n] + ' ';
    const t = Math.floor(n / 10);
    const u = n % 10;
    return tensWords[t] + (u ? ' ' + ones[u] : '') + ' ';
  }

  /** Converts numbers 1–999 to words (handles hundreds + "and" grammar correctly) */
  function threeDigits(n: number): string {
    if (n <= 0) return '';
    if (n < 100) return twoDigits(n);
    const h = Math.floor(n / 100);
    const rem = n % 100;
    // "and" is only inserted between hundreds and tens/units
    return ones[h] + ' Hundred ' + (rem > 0 ? 'and ' + twoDigits(rem) : '');
  }

  let words = '';
  let n = Math.floor(amount);

  // Indian grouping: Crores (10M), Lakhs (100K), Thousands (1K), Hundreds, Tens/Units
  const crores = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakhs = Math.floor(n / 100_000);
  n %= 100_000;
  const thousands = Math.floor(n / 1_000);
  n %= 1_000;
  const hundreds = Math.floor(n / 100);
  n %= 100;

  if (crores > 0) words += threeDigits(crores) + 'Crore ';
  if (lakhs > 0) words += twoDigits(lakhs) + 'Lakh ';
  if (thousands > 0) words += twoDigits(thousands) + 'Thousand ';
  if (hundreds > 0) words += ones[hundreds] + ' Hundred ';
  if (n > 0) {
    // "and" is inserted before the last group only when higher groups exist
    if (words !== '') words += 'and ';
    words += twoDigits(n);
  }

  // Handle paise (decimal part)
  const fraction = Math.round((amount - Math.floor(amount)) * 100);
  if (fraction > 0) {
    words += 'and ' + twoDigits(fraction) + 'Paise ';
  }

  return words.trim() + ' Only';
}
