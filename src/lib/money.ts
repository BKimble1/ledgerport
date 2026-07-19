/**
 * Decimal-safe money helpers. All aggregation happens in integer cents;
 * floats exist only at the parse and display edges.
 */

/** Dollars (already rounded to 2dp by parseAmount) → integer cents. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Integer cents → "1234.56" (no thousands separators; for file output). */
export function centsToFixed(cents: number): string {
  const c = cents === 0 ? 0 : cents; // normalize -0
  const sign = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Integer cents → "$1,234.56" / "-$1,234.56" for display. */
export function centsToDisplay(cents: number, currency = "$"): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  return `${sign}${currency}${whole}.${String(abs % 100).padStart(2, "0")}`;
}

/** Sum an array of cent values safely. */
export function sumCents(values: number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
