/**
 * Parse the amount formats that real bank CSVs produce.
 * Returns a number (2-decimal precision) or null when unparseable.
 *
 * Handles: "1,234.56"  "$1,234.56"  "(45.00)"  "45.00-"  "-45.00"
 *          "1.234,56" (European)  "1 234,56"  "€45,00"  "45"  ""
 */
export function parseAmount(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (s === "") return null;

  let negative = false;

  // Parentheses accounting negative: (45.00)
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  // Leading sign
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  // Trailing sign: "45.00-"
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }

  // Strip currency symbols, letters ("USD"), spaces (incl. NBSP thin-space group separators)
  s = s.replace(/[^\d.,]/g, "");
  if (s === "" || !/\d/.test(s)) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    // Both present: the later one is the decimal separator.
    if (lastDot > lastComma) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(/\./g, "").replace(",", ".");
    }
  } else if (lastComma !== -1) {
    // Comma only: decimal if exactly one comma followed by 1-2 digits, else thousands.
    const decimals = s.length - lastComma - 1;
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount === 1 && decimals >= 1 && decimals <= 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastDot !== -1) {
    // Dot only: decimal if last group is 1-2 digits, else thousands ("1.234.567" or "1.234").
    const decimals = s.length - lastDot - 1;
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1 || (decimals === 3 && dotCount === 1)) {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const value = negative ? -n : n;
  return Math.round(value * 100) / 100;
}

/** Format a signed amount for OFX/QIF output: fixed 2 decimals, no thousands separators. */
export function formatAmount(n: number): string {
  // Avoid "-0.00"
  const v = Math.round(n * 100) / 100;
  return (Object.is(v, -0) ? 0 : v).toFixed(2);
}
