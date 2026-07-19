import { APP_VERSION } from "../config";
import { centsToDisplay } from "./money";
import type { Reconciliation, Preflight } from "./analyze";
import type { AccountSettings, ColumnMapping, ConversionResult } from "./types";

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Mask an account number to its last 4 characters. */
export function maskAccount(id: string): string {
  const t = id.trim();
  if (!t) return "(not set)";
  return t.length <= 4 ? `••${t}` : `••••${t.slice(-4)}`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface ProofReportInput {
  sourceName: string;
  sourceText: string;
  outputName: string;
  outputText: string;
  format: string;
  mapping: ColumnMapping;
  headers: string[];
  account: AccountSettings;
  result: ConversionResult;
  recon: Reconciliation;
  preflight: Preflight;
  rowOffset: number;
}

/** Self-contained printable HTML Conversion Proof Report. */
export async function generateProofReport(inp: ProofReportInput): Promise<string> {
  const srcHash = await sha256Hex(inp.sourceText);
  const outHash = await sha256Hex(inp.outputText);
  const now = new Date();
  const colName = (i: number) => (i >= 0 ? escapeHtml(inp.headers[i]?.trim() || `Column ${i + 1}`) : "—");
  const excludedRows = inp.result.transactions.filter((t) => t.excluded);
  const money = (c: number) => centsToDisplay(c);

  const mappingRows = [
    ["Date", colName(inp.mapping.date)],
    ["Description", colName(inp.mapping.description)],
    inp.mapping.amountMode === "debitCredit"
      ? ["Amount", `Debit: ${colName(inp.mapping.debit)} / Credit: ${colName(inp.mapping.credit)}`]
      : ["Amount", colName(inp.mapping.amount)],
    ["Check #", colName(inp.mapping.checkNumber)],
    ["Memo", colName(inp.mapping.memo)],
    ["Balance", colName(inp.mapping.balance)],
    ["Date format", inp.mapping.dateFormat.toUpperCase()],
    ["Signs flipped", inp.mapping.flipSign ? "Yes" : "No"],
  ];

  const bp = inp.recon.balanceProof;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Conversion Proof — ${escapeHtml(inp.sourceName)}</title>
<style>
body{font-family:Georgia,serif;color:#1c2431;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.5}
h1{font-size:1.6rem;border-bottom:3px solid #0e7a5f;padding-bottom:.4rem}
h2{font-size:1.05rem;margin-top:1.6rem;text-transform:uppercase;letter-spacing:.05em;color:#0a5c48;font-family:system-ui,sans-serif;font-size:.85rem}
table{border-collapse:collapse;width:100%;font-family:system-ui,sans-serif;font-size:.9rem}
td,th{border:1px solid #ddd8cc;padding:.35rem .6rem;text-align:left;vertical-align:top}
th{background:#f1efe9}
.num{font-family:ui-monospace,monospace;text-align:right;white-space:nowrap}
.ok{color:#0a5c48;font-weight:700}.warn{color:#9a6b00;font-weight:700}.bad{color:#b3452c;font-weight:700}
.hash{font-family:ui-monospace,monospace;font-size:.72rem;word-break:break-all}
.meta{color:#666;font-size:.85rem;font-family:system-ui,sans-serif}
@media print{body{margin:0}}
</style></head><body>
<h1>Ledgerport Conversion Proof</h1>
<p class="meta">Generated ${now.toISOString()} · Ledgerport v${APP_VERSION} · processed entirely on the user's device</p>

<h2>Files</h2>
<table>
<tr><th>Source file</th><td>${escapeHtml(inp.sourceName)}</td></tr>
<tr><th>Source SHA-256</th><td class="hash">${srcHash}</td></tr>
<tr><th>Output file</th><td>${escapeHtml(inp.outputName)} (${escapeHtml(inp.format.toUpperCase())})</td></tr>
<tr><th>Output SHA-256</th><td class="hash">${outHash}</td></tr>
<tr><th>Account</th><td>${escapeHtml(inp.account.accountType)} · ${escapeHtml(maskAccount(inp.account.accountId))} · ${escapeHtml(inp.account.currency)}</td></tr>
</table>

<h2>Column mapping used</h2>
<table>${mappingRows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>

<h2>Reconciliation</h2>
<table>
<tr><th>Source data rows</th><td class="num">${inp.recon.sourceRows}</td></tr>
<tr><th>Exported transactions</th><td class="num">${inp.recon.included}</td></tr>
<tr><th>Excluded transactions</th><td class="num">${inp.recon.excluded}</td></tr>
<tr><th>Unconvertible rows</th><td class="num">${inp.recon.failedRows}</td></tr>
<tr><th>Blank rows</th><td class="num">${inp.recon.emptyRows}</td></tr>
<tr><th>Every source row accounted for</th><td>${inp.recon.oneToOne ? '<span class="ok">Yes</span>' : '<span class="bad">No</span>'}</td></tr>
<tr><th>Money in</th><td class="num">${money(inp.recon.moneyInCents)}</td></tr>
<tr><th>Money out</th><td class="num">${money(inp.recon.moneyOutCents)}</td></tr>
<tr><th>Net movement</th><td class="num">${money(inp.recon.netCents)}</td></tr>
<tr><th>Date range</th><td>${inp.recon.earliest ?? "—"} → ${inp.recon.latest ?? "—"}</td></tr>
${bp ? `<tr><th>Balance proof</th><td>${bp.matches ? '<span class="ok">PASSED</span>' : '<span class="bad">FAILED</span>'} — opening ${money(bp.openingCents)} + net ${money(inp.recon.netCents)} vs closing ${money(bp.closingCents)}</td></tr>` : ""}
</table>

<h2>Preflight: ${escapeHtml(inp.preflight.headline)}</h2>
${inp.preflight.items.length === 0 ? "<p>No findings.</p>" : `<table><tr><th>Severity</th><th>Finding</th><th>Rows</th><th>Auto-handled</th></tr>
${inp.preflight.items
  .map(
    (i) =>
      `<tr><td class="${i.severity === "error" ? "bad" : i.severity === "warning" ? "warn" : ""}">${i.severity}</td><td>${escapeHtml(i.message)}</td><td>${i.rows ? escapeHtml(i.rows.slice(0, 25).join(", ")) + (i.rows.length > 25 ? "…" : "") : ""}</td><td>${i.autoFixed ? "yes" : ""}</td></tr>`
  )
  .join("")}</table>`}

<h2>Excluded rows (${excludedRows.length})</h2>
${excludedRows.length === 0 ? "<p>None.</p>" : `<table><tr><th>Row</th><th>Date</th><th>Amount</th><th>Description</th><th>Reason</th></tr>
${excludedRows
  .slice(0, 200)
  .map(
    (t) =>
      `<tr><td class="num">${t.rawIndex + inp.rowOffset}</td><td>${t.date}</td><td class="num">${money(t.cents)}</td><td>${escapeHtml(t.description.slice(0, 60))}</td><td>${escapeHtml(t.excludeReason ?? "")}</td></tr>`
  )
  .join("")}</table>${excludedRows.length > 200 ? `<p class="meta">…and ${excludedRows.length - 200} more.</p>` : ""}`}

<p class="meta">This report was generated locally by Ledgerport. It contains transaction data — treat it with the same
care as the statement itself. Full account numbers are never included. Ledgerport is not affiliated with Intuit.
Destination software applies its own validation; this preflight checks format compatibility, not the destination's
private rules.</p>
</body></html>`;
}
