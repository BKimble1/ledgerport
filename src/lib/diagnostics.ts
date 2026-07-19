import { APP_VERSION } from "../config";
import type { Preflight, Reconciliation } from "./analyze";
import type { ColumnMapping, ConversionResult } from "./types";

/**
 * Privacy-safe support diagnostics. Contains structure only — never
 * descriptions, amounts, dates of individual transactions, or raw rows.
 */
export function buildDiagnostics(opts: {
  headers: string[];
  mapping: ColumnMapping;
  result: ConversionResult;
  recon: Reconciliation;
  preflight: Preflight;
}): string {
  const ua = navigator.userAgent;
  const browser =
    /Firefox\//.test(ua) ? "Firefox" : /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : /Android|iPhone|iPad/.test(ua) ? "Mobile" : "Other";

  return JSON.stringify(
    {
      app: `Ledgerport v${APP_VERSION}`,
      environment: { browser, os },
      columnHeaders: opts.headers.map((h) => h.trim().slice(0, 40)),
      mapping: opts.mapping,
      counts: {
        transactions: opts.result.transactions.length,
        included: opts.recon.included,
        excluded: opts.recon.excluded,
        failedRows: opts.recon.failedRows,
        emptyRows: opts.recon.emptyRows,
      },
      issueMessages: [...new Set(opts.result.issues.map((i) => i.message.replace(/"[^"]*"/g, '"…"')))].slice(0, 20),
      preflight: {
        level: opts.preflight.level,
        items: opts.preflight.items.map((i) => ({ severity: i.severity, message: i.message })),
      },
      note: "This diagnostic contains file structure only — no transaction descriptions, amounts, dates, or account numbers.",
    },
    null,
    2
  );
}
