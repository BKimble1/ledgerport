import { formatAmount } from "./amount";
import { isoToQifDate } from "./dates";
import type { AccountSettings, Transaction } from "./types";

/**
 * .qif — Quicken Interchange Format. Accepted by Quicken, GnuCash,
 * Banktivity, YNAB4, and many legacy tools.
 */
export function generateQif(txns: Transaction[], acct: AccountSettings): string {
  if (txns.length === 0) throw new Error("No transactions to export");
  const header = acct.accountType === "CREDITCARD" ? "!Type:CCard" : "!Type:Bank";
  const blocks = txns.map((t) => {
    const lines = [
      `D${isoToQifDate(t.date)}`,
      `T${formatAmount(t.amount)}`,
      `P${sanitize(t.description)}`,
    ];
    if (t.checkNumber) lines.push(`N${sanitize(t.checkNumber)}`);
    if (t.memo) lines.push(`M${sanitize(t.memo)}`);
    lines.push("^");
    return lines.join("\r\n");
  });
  return [header, ...blocks].join("\r\n") + "\r\n";
}

/** QIF is line-oriented: strip newlines from field values. */
function sanitize(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Clean CSV export (QuickBooks Online 4-column layout: Date, Description, Credit, Debit).
 */
export function generateCleanCsv(txns: Transaction[]): string {
  const escapeCell = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows = txns.map((t) => {
    const credit = t.amount > 0 ? formatAmount(t.amount) : "";
    const debit = t.amount < 0 ? formatAmount(Math.abs(t.amount)) : "";
    const desc = [t.description, t.memo].filter(Boolean).join(" — ");
    return [isoToQifDate(t.date), escapeCell(desc), credit, debit].join(",");
  });
  return ["Date,Description,Credit,Debit", ...rows].join("\r\n") + "\r\n";
}
