export type DateOrder = "auto" | "MDY" | "DMY" | "YMD";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
};

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function valid(y: number, m: number, d: number): boolean {
  return (
    y >= 1950 && y <= 2100 &&
    m >= 1 && m <= 12 &&
    d >= 1 && d <= daysInMonth(y, m)
  );
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function expandYear(y: number): number {
  if (y >= 100) return y;
  return y <= 49 ? 2000 + y : 1900 + y;
}

/**
 * Parse one date string into ISO YYYY-MM-DD.
 * `order` disambiguates numeric forms like 03/04/2026.
 * Month-name forms ("Jan 5, 2026", "05-Jan-26") parse regardless of order.
 */
export function parseDate(raw: string, order: Exclude<DateOrder, "auto">): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\s+/g, " ");
  if (!s) return null;

  // ISO with optional time: 2026-01-05 or 2026-01-05T10:00:00
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})([T ].*)?$/);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return valid(y, mo, d) ? toISO(y, mo, d) : null;
  }

  // Month-name forms: "Jan 5, 2026" / "5 Jan 2026" / "05-Jan-2026" / "Jan-05-26"
  m = s.match(/^([A-Za-z]+)[ .\-/]+(\d{1,2})(?:st|nd|rd|th)?[,]?[ .\-/]+(\d{2,4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) {
    const [mo, d, y] = [MONTHS[m[1].toLowerCase()], Number(m[2]), expandYear(Number(m[3]))];
    return valid(y, mo, d) ? toISO(y, mo, d) : null;
  }
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[ .\-/]+([A-Za-z]+)[,]?[ .\-/]+(\d{2,4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const [d, mo, y] = [Number(m[1]), MONTHS[m[2].toLowerCase()], expandYear(Number(m[3]))];
    return valid(y, mo, d) ? toISO(y, mo, d) : null;
  }

  // Numeric with separators: 1/5/2026, 05.01.2026, 1-5-26, 2026/01/05
  m = s.match(/^(\d{1,4})[./\-](\d{1,2})[./\-](\d{1,4})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]), c = Number(m[3]);
    if (m[1].length === 4) {
      return valid(a, b, c) ? toISO(a, b, c) : null; // YMD
    }
    const y = expandYear(c);
    if (order === "DMY") return valid(y, b, a) ? toISO(y, b, a) : null;
    if (order === "YMD") return null; // separator form with 4-digit year handled above
    return valid(y, a, b) ? toISO(y, a, b) : null; // MDY
  }

  // Compact: 20260105 or 01052026
  m = s.match(/^(\d{8})$/);
  if (m) {
    const y4 = Number(s.slice(0, 4)), mo4 = Number(s.slice(4, 6)), d4 = Number(s.slice(6, 8));
    if (y4 >= 1950 && y4 <= 2100 && valid(y4, mo4, d4)) return toISO(y4, mo4, d4);
    const y = Number(s.slice(4, 8));
    const p1 = Number(s.slice(0, 2)), p2 = Number(s.slice(2, 4));
    if (order === "DMY") return valid(y, p2, p1) ? toISO(y, p2, p1) : null;
    return valid(y, p1, p2) ? toISO(y, p1, p2) : null;
  }

  return null;
}

/**
 * Detect the most plausible date order for a column of samples.
 * If any sample's first number exceeds 12, the column must be DMY;
 * if any second number exceeds 12, it must be MDY. Defaults to MDY (US CSVs).
 */
export function detectDateOrder(samples: string[]): Exclude<DateOrder, "auto"> {
  let sawYearFirst = 0, total = 0;
  for (const raw of samples) {
    const s = String(raw ?? "").trim();
    const m = s.match(/^(\d{1,4})[./\-](\d{1,2})[./\-](\d{1,4})$/);
    if (!m) continue;
    total++;
    if (m[1].length === 4) { sawYearFirst++; continue; }
    const a = Number(m[1]), b = Number(m[2]);
    if (a > 12 && b <= 12) return "DMY";
    if (b > 12 && a <= 12) return "MDY";
  }
  if (total > 0 && sawYearFirst === total) return "YMD";
  return "MDY";
}

/** ISO YYYY-MM-DD → OFX date YYYYMMDD (with noon time to dodge timezone shifts). */
export function isoToOfxDate(iso: string): string {
  return iso.replace(/-/g, "") + "120000";
}

/** ISO YYYY-MM-DD → QIF date MM/DD/YYYY. */
export function isoToQifDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}
