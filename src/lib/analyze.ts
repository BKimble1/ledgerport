import { parseAmount } from "./amount";
import { parseDate, detectExcelSerialColumn } from "./dates";
import { sumCents } from "./money";
import type { ColumnMapping, ConversionResult, Transaction } from "./types";

/* ---------------- detection confidence / nonfinancial guard ---------------- */

export interface DetectionAssessment {
  /** 0..1 — share of sampled rows whose mapped date cell parses */
  dateRate: number;
  /** 0..1 — share of sampled rows with a parseable amount under the mapping */
  amountRate: number;
  /** verdict: does this look like financial transaction data at all? */
  financial: boolean;
  reasons: string[];
}

/** Judge whether the mapped file plausibly contains bank transactions. */
export function assessDetection(rows: string[][], mapping: ColumnMapping): DetectionAssessment {
  const sample = rows.slice(0, 50).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  const reasons: string[] = [];
  if (sample.length === 0) {
    return { dateRate: 0, amountRate: 0, financial: false, reasons: ["The file has no data rows."] };
  }

  const serial = mapping.date >= 0 && detectExcelSerialColumn(sample.map((r) => String(r[mapping.date] ?? "")));
  let dateHits = 0;
  let amountHits = 0;
  for (const r of sample) {
    const d = mapping.date >= 0 ? String(r[mapping.date] ?? "") : "";
    if (serial || parseDate(d, "MDY") || parseDate(d, "DMY")) dateHits++;
    if (mapping.amountMode === "debitCredit") {
      const de = mapping.debit >= 0 ? parseAmount(String(r[mapping.debit] ?? "")) : null;
      const cr = mapping.credit >= 0 ? parseAmount(String(r[mapping.credit] ?? "")) : null;
      if (de !== null || cr !== null) amountHits++;
    } else if (mapping.amount >= 0 && parseAmount(String(r[mapping.amount] ?? "")) !== null) {
      amountHits++;
    }
  }
  const dateRate = dateHits / sample.length;
  const amountRate = amountHits / sample.length;

  if (mapping.date < 0 || dateRate < 0.3) reasons.push("No column contains recognizable transaction dates.");
  if ((mapping.amount < 0 && mapping.debit < 0 && mapping.credit < 0) || amountRate < 0.3)
    reasons.push("No column contains recognizable money amounts.");

  return { dateRate, amountRate, financial: reasons.length === 0, reasons };
}

/* ---------------- ambiguous date-order detection ---------------- */

/** True when every numeric date could be read as either MDY or DMY (e.g. 03/04/2026). */
export function datesAmbiguous(rows: string[][], mapping: ColumnMapping): boolean {
  if (mapping.dateFormat !== "auto") return false;
  let sawNumeric = false;
  for (const r of rows.slice(0, 100)) {
    const s = String(r[mapping.date] ?? "").trim();
    const m = s.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
    if (!m) continue;
    sawNumeric = true;
    if (Number(m[1]) > 12 || Number(m[2]) > 12) return false; // disambiguated
  }
  return sawNumeric;
}

/* ---------------- reconciliation ---------------- */

export interface Reconciliation {
  sourceRows: number;
  included: number;
  excluded: number;
  failedRows: number;
  emptyRows: number;
  moneyInCents: number;
  moneyOutCents: number;
  netCents: number;
  earliest: string | null;
  latest: string | null;
  /** every included transaction maps 1:1 to an exported record */
  oneToOne: boolean;
  /** balance proof (only when a balance column is mapped and parseable) */
  balanceProof: {
    openingCents: number;
    closingCents: number;
    expectedClosingCents: number;
    matches: boolean;
  } | null;
}

export function reconcile(result: ConversionResult, sourceRowCount: number): Reconciliation {
  const included = result.transactions.filter((t) => !t.excluded);
  const excluded = result.transactions.filter((t) => t.excluded);

  let moneyIn = 0;
  let moneyOut = 0;
  for (const t of included) {
    if (t.cents >= 0) moneyIn += t.cents;
    else moneyOut += t.cents;
  }
  const net = sumCents(included.map((t) => t.cents));

  let earliest: string | null = null;
  let latest: string | null = null;
  for (const t of included) {
    if (!earliest || t.date < earliest) earliest = t.date;
    if (!latest || t.date > latest) latest = t.date;
  }

  // Balance proof: rows are usually chronological (either direction). Use row order.
  let balanceProof: Reconciliation["balanceProof"] = null;
  const withBal = included.filter((t) => t.balanceCents !== null);
  if (withBal.length >= 2 && withBal.length === included.length) {
    const byRow = [...included].sort((a, b) => a.rawIndex - b.rawIndex);
    const first = byRow[0];
    const last = byRow[byRow.length - 1];
    // Detect direction: if first row's balance already includes its amount, opening = first.balance - first.amount.
    const openingIfTopOldest = first.balanceCents! - first.cents;
    const expectedIfTopOldest = openingIfTopOldest + net;
    if (expectedIfTopOldest === last.balanceCents) {
      balanceProof = {
        openingCents: openingIfTopOldest,
        closingCents: last.balanceCents!,
        expectedClosingCents: expectedIfTopOldest,
        matches: true,
      };
    } else {
      // Try newest-first ordering (many banks export descending).
      const openingIfTopNewest = last.balanceCents! - last.cents;
      const expectedIfTopNewest = openingIfTopNewest + net;
      balanceProof = {
        openingCents: expectedIfTopNewest === first.balanceCents ? openingIfTopNewest : openingIfTopOldest,
        closingCents: expectedIfTopNewest === first.balanceCents ? first.balanceCents! : last.balanceCents!,
        expectedClosingCents: expectedIfTopNewest === first.balanceCents ? expectedIfTopNewest : expectedIfTopOldest,
        matches: expectedIfTopNewest === first.balanceCents,
      };
    }
  }

  return {
    sourceRows: sourceRowCount,
    included: included.length,
    excluded: excluded.length,
    failedRows: result.issues.length,
    emptyRows: result.skippedEmpty,
    moneyInCents: moneyIn,
    moneyOutCents: moneyOut,
    netCents: net,
    earliest,
    latest,
    oneToOne: included.length + excluded.length + result.issues.length + result.skippedEmpty === sourceRowCount,
    balanceProof,
  };
}

/* ---------------- preflight ---------------- */

export type PreflightLevel = "ready" | "warnings" | "review" | "blocked";

export interface PreflightItem {
  severity: "error" | "warning" | "info";
  message: string;
  /** 1-based row numbers in the original file, when applicable */
  rows?: number[];
  autoFixed?: boolean;
}

export interface Preflight {
  level: PreflightLevel;
  headline: string;
  items: PreflightItem[];
}

export function runPreflight(opts: {
  result: ConversionResult;
  recon: Reconciliation;
  ambiguousDates: boolean;
  accountIdSet: boolean;
  rowOffset: number;
}): Preflight {
  const { result, recon, ambiguousDates, accountIdSet, rowOffset } = opts;
  const items: PreflightItem[] = [];
  const txns = result.transactions;
  const rowsOf = (list: Transaction[]) => list.map((t) => t.rawIndex + rowOffset);

  if (recon.included === 0) {
    items.push({ severity: "error", message: "No transactions would be exported with the current settings." });
  }
  if (result.issues.length > 0) {
    items.push({
      severity: result.issues.length > txns.length ? "error" : "warning",
      message: `${result.issues.length} row${result.issues.length === 1 ? "" : "s"} could not be converted and will be left out`,
      rows: result.issues.map((i) => i.row + rowOffset),
    });
  }
  if (ambiguousDates) {
    items.push({
      severity: "warning",
      message:
        "Every date in this file could be read as either US (month/day) or international (day/month). Confirm the date format before exporting.",
    });
  }
  const exactDups = txns.filter((t) => t.dupStatus === "exact-file");
  if (exactDups.length > 0) {
    items.push({
      severity: "warning",
      message: `${exactDups.length} exact duplicate row${exactDups.length === 1 ? "" : "s"} inside this file — excluded automatically (you can include them)`,
      rows: rowsOf(exactDups),
      autoFixed: true,
    });
  }
  const histDups = txns.filter((t) => t.dupStatus === "history");
  if (histDups.length > 0) {
    items.push({
      severity: "warning",
      message: `${histDups.length} transaction${histDups.length === 1 ? "" : "s"} previously exported from this browser — excluded to prevent double import`,
      rows: rowsOf(histDups),
      autoFixed: true,
    });
  }
  const possibleDups = txns.filter((t) => t.dupStatus === "possible" && !t.excluded);
  if (possibleDups.length > 0) {
    items.push({
      severity: "info",
      message: `${possibleDups.length} same-day same-amount transaction${possibleDups.length === 1 ? "" : "s"} with different descriptions — usually legitimate, worth a glance`,
      rows: rowsOf(possibleDups),
    });
  }
  const summaries = txns.filter((t) => t.flags.includes("summary-row"));
  if (summaries.length > 0) {
    items.push({
      severity: "info",
      message: `${summaries.length} balance/total summary row${summaries.length === 1 ? "" : "s"} excluded`,
      rows: rowsOf(summaries),
      autoFixed: true,
    });
  }
  const noDesc = txns.filter((t) => t.flags.includes("no-description") && !t.excluded);
  if (noDesc.length > 0) {
    items.push({
      severity: "info",
      message: `${noDesc.length} transaction${noDesc.length === 1 ? "" : "s"} without a description (exported as "TRANSACTION")`,
      rows: rowsOf(noDesc),
      autoFixed: true,
    });
  }
  const pending = txns.filter((t) => t.flags.includes("pending") && !t.excluded);
  if (pending.length > 0) {
    items.push({
      severity: "warning",
      message: `${pending.length} transaction${pending.length === 1 ? "" : "s"} look pending — pending items often change or disappear in the final statement`,
      rows: rowsOf(pending),
    });
  }
  const zero = txns.filter((t) => t.flags.includes("zero-amount") && !t.excluded);
  if (zero.length > 0) {
    items.push({
      severity: "info",
      message: `${zero.length} zero-amount transaction${zero.length === 1 ? "" : "s"} included`,
      rows: rowsOf(zero),
    });
  }
  if (txns.some((t) => t.flags.includes("serial-date"))) {
    items.push({
      severity: "info",
      message: "Dates were stored as Excel serial numbers and were converted to real dates",
      autoFixed: true,
    });
  }
  if (!accountIdSet) {
    items.push({
      severity: "info",
      message: "No account number set — QuickBooks will ask which account to link on first import",
    });
  }
  if (recon.balanceProof) {
    items.push(
      recon.balanceProof.matches
        ? { severity: "info", message: "Balance proof passed: opening balance + net movement equals the closing balance", autoFixed: false }
        : {
            severity: "warning",
            message:
              "Balance proof failed: opening balance + net movement does not equal the closing balance. Rows may be missing or the balance column may not be a running balance.",
          }
    );
  }

  const hasError = items.some((i) => i.severity === "error");
  const warnings = items.filter((i) => i.severity === "warning");
  let level: PreflightLevel;
  if (hasError) level = "blocked";
  else if (ambiguousDates || warnings.some((w) => w.message.startsWith("Balance proof failed"))) level = "review";
  else if (warnings.length > 0) level = "warnings";
  else level = "ready";

  const headline =
    level === "ready"
      ? "Import ready"
      : level === "warnings"
        ? "Import ready — with warnings"
        : level === "review"
          ? "Review required before export"
          : "Cannot safely export yet";

  return { level, headline, items };
}
