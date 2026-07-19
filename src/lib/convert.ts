import { parseAmount } from "./amount";
import { parseDate, detectDateOrder, detectExcelSerialColumn, parseExcelSerial, type DateOrder } from "./dates";
import type { ColumnMapping, ConversionResult, RowIssue, Transaction } from "./types";

/** Does the first row look like column headers rather than data? */
export function looksLikeHeader(row: string[]): boolean {
  let dataish = 0;
  for (const cell of row) {
    const s = String(cell ?? "").trim();
    if (!s) continue;
    if (parseAmount(s) !== null && /\d/.test(s) && !/^[A-Za-z]/.test(s)) dataish++;
    if (parseDate(s, "MDY")) dataish++;
  }
  return dataish === 0;
}

const HEADER_HINTS: Array<{ field: keyof typeof HINT_TARGETS; re: RegExp }> = [
  { field: "date", re: /^(trans(action)?[ ._-]?date|post(ed|ing)?[ ._-]?date|date|value[ ._-]?date)$/i },
  { field: "description", re: /^(description|payee|merchant|name|details?|transaction|narrative|memo\/description)$/i },
  { field: "amount", re: /^(amount|transaction[ ._-]?amount|amt|value)$/i },
  { field: "debit", re: /^(debit|withdrawals?|money[ ._-]?out|paid[ ._-]?out|charges?|spent)( ?\(?[-–]?\)?| amount)?$/i },
  { field: "credit", re: /^(credit|deposits?|money[ ._-]?in|paid[ ._-]?in|payments?|received)( ?\(?\+?\)?| amount)?$/i },
  { field: "memo", re: /^(memo|notes?|reference|ref(erence)?[ ._-]?(no|number|#)?|category)$/i },
  { field: "checkNumber", re: /^(check[ ._-]?(no|number|#)?|cheque[ ._-]?(no|number|#)?|chk[ ._-]?#?|slip[ ._-]?#?)$/i },
  { field: "balance", re: /^((running|current|available)[ ._-]?)?balance$|^bal\.?$/i },
];
const HINT_TARGETS = { date: 0, description: 0, amount: 0, debit: 0, credit: 0, memo: 0, checkNumber: 0, balance: 0 };

/**
 * Guess a column mapping from headers + data sampling.
 * Never throws; falls back to positional heuristics for headerless files.
 */
export function guessMapping(headers: string[], rows: string[][]): ColumnMapping {
  const found: Record<string, number> = {};
  headers.forEach((h, i) => {
    const clean = String(h ?? "").trim();
    for (const { field, re } of HEADER_HINTS) {
      if (found[field] === undefined && re.test(clean)) { found[field] = i; break; }
    }
  });

  const sample = rows.slice(0, 25);
  const colCount = Math.max(headers.length, ...sample.map((r) => r.length), 0);

  // Fill date by sampling: column where most cells parse as dates.
  if (found.date === undefined) {
    let best = -1, bestScore = 0;
    for (let c = 0; c < colCount; c++) {
      const score = sample.filter((r) => parseDate(String(r[c] ?? ""), "MDY") || parseDate(String(r[c] ?? ""), "DMY")).length;
      if (score > bestScore) { best = c; bestScore = score; }
    }
    if (best >= 0 && bestScore >= Math.max(1, sample.length / 2)) found.date = best;
  }

  const isNumericCol = (c: number) =>
    sample.length > 0 &&
    sample.filter((r) => {
      const s = String(r[c] ?? "").trim();
      return s === "" || parseAmount(s) !== null;
    }).length === sample.length &&
    sample.some((r) => String(r[c] ?? "").trim() !== "");

  // Fill amount: first numeric column that isn't the date and has signed/varied values.
  if (found.amount === undefined && found.debit === undefined && found.credit === undefined) {
    for (let c = 0; c < colCount; c++) {
      if (c === found.date || c === found.checkNumber || c === found.balance) continue;
      if (isNumericCol(c) && !sample.every((r) => parseDate(String(r[c] ?? ""), "MDY"))) {
        found.amount = c;
        break;
      }
    }
  }

  // Fill description: longest average text column that isn't mapped yet.
  if (found.description === undefined) {
    let best = -1, bestAvg = 0;
    for (let c = 0; c < colCount; c++) {
      if ([found.date, found.amount, found.debit, found.credit, found.memo, found.checkNumber, found.balance].includes(c)) continue;
      const texts = sample.map((r) => String(r[c] ?? "").trim());
      if (!texts.some((t) => t && parseAmount(t) === null)) continue;
      const avg = texts.reduce((a, t) => a + t.length, 0) / Math.max(1, texts.length);
      if (avg > bestAvg) { best = c; bestAvg = avg; }
    }
    if (best >= 0) found.description = best;
  }

  const hasDC = found.debit !== undefined && found.credit !== undefined;
  const dateCol = found.date ?? 0;
  const dateSamples = sample.map((r) => String(r[dateCol] ?? ""));

  return {
    date: dateCol,
    description: found.description ?? -1,
    amountMode: hasDC && found.amount === undefined ? "debitCredit" : "single",
    amount: found.amount ?? -1,
    debit: found.debit ?? -1,
    credit: found.credit ?? -1,
    memo: found.memo ?? -1,
    checkNumber: found.checkNumber ?? -1,
    balance: found.balance ?? -1,
    flipSign: false,
    dateFormat: detectDateOrder(dateSamples),
  };
}

/** Build a stable, per-file-unique FITID from transaction content + occurrence counter. */
function makeFitid(date: string, amount: number, description: string, seq: number): string {
  const base = `${date}${amount}${description}`;
  let h = 5381;
  for (let i = 0; i < base.length; i++) h = ((h << 5) + h + base.charCodeAt(i)) >>> 0;
  return `${date.replace(/-/g, "")}${String(h).padStart(10, "0")}${seq}`;
}

/** Rows whose description marks them as statement furniture rather than transactions. */
const SUMMARY_RE =
  /^\s*((sub)?totals?|(beginning|opening|ending|closing|available|current)\s+balance|balance\s+(forward|brought|carried)( forward)?|statement\s+(total|summary))\b/i;

/** Apply a mapping to parsed rows, producing transactions + per-row issues. */
export function convertRows(rows: string[][], mapping: ColumnMapping): ConversionResult {
  const issues: RowIssue[] = [];
  const transactions: Transaction[] = [];
  let skippedEmpty = 0;

  const order: Exclude<DateOrder, "auto"> =
    mapping.dateFormat === "auto" || !mapping.dateFormat
      ? detectDateOrder(rows.map((r) => String(r[mapping.date] ?? "")))
      : (mapping.dateFormat as Exclude<DateOrder, "auto">);

  const serialDates = detectExcelSerialColumn(rows.map((r) => String(r[mapping.date] ?? "")));

  const fitidCounts = new Map<string, number>();

  rows.forEach((row, i) => {
    if (row.every((c) => String(c ?? "").trim() === "")) {
      skippedEmpty++;
      return;
    }

    const descCell =
      mapping.description >= 0 ? String(row[mapping.description] ?? "").trim() : "";
    const isSummaryText = SUMMARY_RE.test(descCell);

    const rawDate = String(row[mapping.date] ?? "").trim();
    const date = serialDates ? parseExcelSerial(rawDate) : parseDate(rawDate, order);
    if (!date) {
      if (isSummaryText) {
        issues.push({ row: i, field: "row", message: `Skipped summary row ("${descCell.slice(0, 40)}")` });
      } else {
        issues.push({ row: i, field: "date", message: rawDate ? `Unrecognized date "${rawDate}"` : "Missing date" });
      }
      return;
    }

    let amount: number | null = null;
    if (mapping.amountMode === "debitCredit") {
      const debit = mapping.debit >= 0 ? parseAmount(String(row[mapping.debit] ?? "")) : null;
      const credit = mapping.credit >= 0 ? parseAmount(String(row[mapping.credit] ?? "")) : null;
      if (debit !== null && debit !== 0) amount = -Math.abs(debit);
      else if (credit !== null) amount = Math.abs(credit);
      else if (debit !== null) amount = 0;
      if (amount === null) {
        issues.push({ row: i, field: "amount", message: "No value in debit or credit column" });
        return;
      }
    } else {
      const raw = String(row[mapping.amount] ?? "").trim();
      amount = parseAmount(raw);
      if (amount === null) {
        issues.push({ row: i, field: "amount", message: raw ? `Unrecognized amount "${raw}"` : "Missing amount" });
        return;
      }
    }
    if (mapping.flipSign) amount = -amount;
    const cents = Math.round(amount * 100);
    amount = cents / 100;

    const description = descCell || "TRANSACTION";
    const memo = mapping.memo >= 0 ? String(row[mapping.memo] ?? "").trim() : "";
    const checkNumber = mapping.checkNumber >= 0 ? String(row[mapping.checkNumber] ?? "").trim() : "";

    let balanceCents: number | null = null;
    if (mapping.balance >= 0) {
      const b = parseAmount(String(row[mapping.balance] ?? ""));
      if (b !== null) balanceCents = Math.round(b * 100);
    }

    const flags: string[] = [];
    if (!descCell) flags.push("no-description");
    if (cents === 0) flags.push("zero-amount");
    if (/\bpending\b/i.test(descCell)) flags.push("pending");
    if (serialDates) flags.push("serial-date");
    if (isSummaryText) flags.push("summary-row");

    const key = `${date}|${amount}|${description}`;
    const seq = (fitidCounts.get(key) ?? 0) + 1;
    fitidCounts.set(key, seq);

    transactions.push({
      date,
      amount,
      cents,
      description,
      memo,
      checkNumber,
      fitid: makeFitid(date, amount, description, seq),
      rawIndex: i,
      raw: row,
      balanceCents,
      excluded: isSummaryText,
      excludeReason: isSummaryText ? "Looks like a balance/total summary row, not a transaction" : undefined,
      flags,
    });
  });

  return { transactions, issues, skippedEmpty };
}
