import { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { convertRows, guessMapping, looksLikeHeader } from "./lib/convert";
import { generateOfx, generateQbo } from "./lib/ofx";
import { generateCleanCsv, generateQif } from "./lib/qif";
import { loadPreset, savePreset } from "./lib/presets";
import { SAMPLE_CSV, SAMPLE_FILENAME } from "./lib/sample";
import { formatAmount } from "./lib/amount";
import {
  DEFAULT_ACCOUNT,
  type AccountSettings,
  type ColumnMapping,
} from "./lib/types";

interface LoadedFile {
  name: string;
  headers: string[];
  rows: string[][];
  hasHeader: boolean;
  presetApplied: boolean;
}

const PREVIEW_LIMIT = 200;

/** Drop leading preamble lines (e.g. "Account: 1234") before the real table. */
function trimPreamble(rows: string[][]): string[][] {
  const firstTableRow = rows.findIndex(
    (r) => r.filter((c) => String(c ?? "").trim() !== "").length >= 2
  );
  return firstTableRow > 0 ? rows.slice(firstTableRow) : rows;
}

function baseName(file: string): string {
  return file.replace(/\.[^.]+$/, "") || "statement";
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function Converter() {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [account, setAccount] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  const loadText = useCallback((text: string, name: string) => {
    setLoadError(null);
    setStatus(null);
    const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
      skipEmptyLines: "greedy",
    });
    let rows = trimPreamble(
      (parsed.data as string[][]).map((r) => r.map((c) => String(c ?? "")))
    );
    rows = rows.filter((r) => r.some((c) => c.trim() !== ""));
    if (rows.length === 0) {
      setLoadError("That file appears to be empty — no rows of data were found.");
      return;
    }
    const hasHeader = looksLikeHeader(rows[0]) && rows.length > 1;
    const headers = hasHeader
      ? rows[0]
      : rows[0].map((_, i) => `Column ${i + 1}`);
    const dataRows = hasHeader ? rows.slice(1) : rows;
    if (dataRows.length === 0) {
      setLoadError("Only a header row was found — the file has no transactions.");
      return;
    }
    if (headers.length < 2) {
      setLoadError(
        "Only one column was detected. This doesn't look like a transaction CSV — check that the file is comma, semicolon, or tab separated."
      );
      return;
    }
    const preset = hasHeader ? loadPreset(rows[0]) : null;
    setFile({
      name,
      headers,
      rows: dataRows,
      hasHeader,
      presetApplied: !!preset,
    });
    setMapping(preset ? preset.mapping : guessMapping(headers, dataRows));
    if (preset) setAccount(preset.account);
  }, []);

  const loadFile = useCallback(
    (f: File) => {
      if (f.size > 20 * 1024 * 1024) {
        setLoadError("That file is larger than 20 MB. Bank statement exports are normally well under 1 MB — is this the right file?");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => loadText(String(reader.result ?? ""), f.name);
      reader.onerror = () => setLoadError("The file could not be read. Try re-saving it as .csv and loading it again.");
      reader.readAsText(f);
    },
    [loadText]
  );

  const result = useMemo(() => {
    if (!file || !mapping) return null;
    if (mapping.date < 0) return null;
    return convertRows(file.rows, mapping);
  }, [file, mapping]);

  const totals = useMemo(() => {
    if (!result) return { in: 0, out: 0 };
    let tin = 0,
      tout = 0;
    for (const t of result.transactions) {
      if (t.amount >= 0) tin += t.amount;
      else tout += t.amount;
    }
    return { in: tin, out: tout };
  }, [result]);

  const doExport = (format: "qbo" | "ofx" | "qif" | "csv") => {
    if (!file || !mapping || !result || result.transactions.length === 0) return;
    try {
      const base = baseName(file.name);
      if (format === "qbo")
        download(generateQbo(result.transactions, account), `${base}.qbo`, "application/vnd.intu.qbo");
      else if (format === "ofx")
        download(generateOfx(result.transactions, account), `${base}.ofx`, "application/x-ofx");
      else if (format === "qif")
        download(generateQif(result.transactions, account), `${base}.qif`, "application/qif");
      else
        download(generateCleanCsv(result.transactions), `${base}-clean.csv`, "text/csv");
      if (file.hasHeader) {
        savePreset(file.headers, mapping, account);
        setStatus(`Exported ${result.transactions.length} transactions as .${format === "csv" ? "csv" : format}. Your column mapping was saved for next time.`);
      } else {
        setStatus(`Exported ${result.transactions.length} transactions as .${format === "csv" ? "csv" : format}.`);
      }
    } catch (e) {
      setStatus(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const reset = () => {
    setFile(null);
    setMapping(null);
    setAccount(DEFAULT_ACCOUNT);
    setLoadError(null);
    setStatus(null);
    setShowPaste(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  /* ---------------- upload screen ---------------- */
  if (!file || !mapping) {
    return (
      <div id="convert">
        <div
          className={`dropzone${dragging ? " drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) loadFile(f);
          }}
        >
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)" }}>
            Drop your bank CSV here
          </p>
          <p>or</p>
          <div className="dz-actions">
            <button className="btn btn-primary" onClick={() => fileInput.current?.click()}>
              Choose a CSV file
            </button>
            <button className="btn" onClick={() => setShowPaste((v) => !v)}>
              Paste CSV text
            </button>
            <button className="btn btn-ghost" onClick={() => loadText(SAMPLE_CSV, SAMPLE_FILENAME)}>
              Try with sample data
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.txt,.tsv,text/csv"
            className="sr-only"
            aria-label="Choose a CSV file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
            }}
          />
          <p style={{ fontSize: "0.82rem", marginTop: "1rem" }}>
            Your file is processed on this device only — it is never uploaded.
          </p>
        </div>
        {showPaste && (
          <div className="paste-area">
            <label htmlFor="paste-box" className="sr-only">
              Paste CSV text
            </label>
            <textarea
              id="paste-box"
              ref={pasteRef}
              placeholder={"Date,Description,Amount\n06/01/2026,COFFEE SHOP,-4.50"}
            />
            <div style={{ marginTop: "0.5rem" }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const text = pasteRef.current?.value ?? "";
                  if (!text.trim()) {
                    setLoadError("Paste some CSV text first, then press Convert pasted text.");
                    return;
                  }
                  loadText(text, "pasted-data.csv");
                }}
              >
                Convert pasted text
              </button>
            </div>
          </div>
        )}
        <div aria-live="polite" style={{ maxWidth: 680, margin: "0 auto" }}>
          {loadError && <p className="notice notice-err">{loadError}</p>}
        </div>
      </div>
    );
  }

  /* ---------------- workspace ---------------- */
  const cols = file.headers;
  const issueRowOffset = file.hasHeader ? 2 : 1; // human row number in original file
  const canExport = !!result && result.transactions.length > 0;

  const colSelect = (
    id: string,
    label: string,
    value: number,
    onChange: (v: number) => void,
    optional = false
  ) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {optional && <option value={-1}>— none —</option>}
        {!optional && value < 0 && <option value={-1}>— choose —</option>}
        {cols.map((h, i) => (
          <option key={i} value={i}>
            {h?.trim() || `Column ${i + 1}`}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="workspace wrap" id="convert">
      <div className="ws-top">
        <div>
          <h2 style={{ margin: 0 }}>Review &amp; export</h2>
          <span className="file-label">
            {file.name} · {file.rows.length} data rows
          </span>
        </div>
        <button className="btn" onClick={reset}>
          ← Start over with another file
        </button>
      </div>

      {file.presetApplied && (
        <p className="notice notice-ok">
          Recognized this CSV layout — your saved column mapping and account settings were applied.
        </p>
      )}
      {file.name === SAMPLE_FILENAME && (
        <p className="notice notice-warn">
          You're looking at clearly-labeled <strong>sample data</strong>, not real transactions.
        </p>
      )}

      <div className="grid-2">
        <div className="panel">
          <h2>1 · Columns</h2>
          <p className="panel-note">
            We guessed these from your file — correct anything that's wrong. The preview updates live.
          </p>
          <div className="field-row">
            {colSelect("map-date", "Date column", mapping.date, (v) => setMapping({ ...mapping, date: v }))}
            {colSelect("map-desc", "Description column", mapping.description, (v) =>
              setMapping({ ...mapping, description: v })
            )}
            <div className="field">
              <label htmlFor="map-mode">Amount layout</label>
              <select
                id="map-mode"
                value={mapping.amountMode}
                onChange={(e) =>
                  setMapping({ ...mapping, amountMode: e.target.value as ColumnMapping["amountMode"] })
                }
              >
                <option value="single">One signed amount column</option>
                <option value="debitCredit">Separate debit / credit columns</option>
              </select>
            </div>
            {mapping.amountMode === "single" &&
              colSelect("map-amount", "Amount column", mapping.amount, (v) =>
                setMapping({ ...mapping, amount: v })
              )}
            {mapping.amountMode === "debitCredit" && (
              <>
                {colSelect("map-debit", "Debit (money out)", mapping.debit, (v) =>
                  setMapping({ ...mapping, debit: v })
                )}
                {colSelect("map-credit", "Credit (money in)", mapping.credit, (v) =>
                  setMapping({ ...mapping, credit: v })
                )}
              </>
            )}
            <div className="field">
              <label htmlFor="map-datefmt">Date format</label>
              <select
                id="map-datefmt"
                value={mapping.dateFormat}
                onChange={(e) => setMapping({ ...mapping, dateFormat: e.target.value })}
              >
                <option value="auto">Auto-detect</option>
                <option value="MDY">Month / Day / Year (US)</option>
                <option value="DMY">Day / Month / Year</option>
                <option value="YMD">Year / Month / Day</option>
              </select>
            </div>
            {colSelect("map-check", "Check # column", mapping.checkNumber, (v) =>
              setMapping({ ...mapping, checkNumber: v }), true
            )}
            {colSelect("map-memo", "Memo column", mapping.memo, (v) => setMapping({ ...mapping, memo: v }), true)}
            <div className="field field-check">
              <input
                id="map-flip"
                type="checkbox"
                checked={mapping.flipSign}
                onChange={(e) => setMapping({ ...mapping, flipSign: e.target.checked })}
              />
              <label htmlFor="map-flip">Flip signs (spending shows as positive in my CSV)</label>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>2 · Account</h2>
          <p className="panel-note">
            Written into the exported file so your accounting software matches it to the right account.
          </p>
          <div className="field-row">
            <div className="field">
              <label htmlFor="acct-type">Account type</label>
              <select
                id="acct-type"
                value={account.accountType}
                onChange={(e) =>
                  setAccount({ ...account, accountType: e.target.value as AccountSettings["accountType"] })
                }
              >
                <option value="CHECKING">Checking</option>
                <option value="SAVINGS">Savings</option>
                <option value="CREDITCARD">Credit card</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="acct-id">Account number</label>
              <input
                id="acct-id"
                value={account.accountId}
                placeholder="last digits are fine"
                maxLength={22}
                onChange={(e) => setAccount({ ...account, accountId: e.target.value })}
              />
            </div>
            {account.accountType !== "CREDITCARD" && (
              <div className="field">
                <label htmlFor="acct-bank">Routing number</label>
                <input
                  id="acct-bank"
                  value={account.bankId}
                  placeholder="optional"
                  maxLength={9}
                  onChange={(e) => setAccount({ ...account, bankId: e.target.value.replace(/\D/g, "") })}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="acct-cur">Currency</label>
              <input
                id="acct-cur"
                value={account.currency}
                maxLength={3}
                onChange={(e) => setAccount({ ...account, currency: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
              />
            </div>
          </div>
          <details className="advanced">
            <summary>Advanced: QuickBooks bank identity (INTU.BID)</summary>
            <p className="panel-note">
              QuickBooks Desktop checks the <code>INTU.BID</code> inside every .qbo file against its bank
              directory. The default (3000) works for many setups; if QuickBooks rejects the file, look up
              your bank's BID and enter it here. OFX/QIF exports don't use this.
            </p>
            <div className="field-row">
              <div className="field">
                <label htmlFor="acct-bid">INTU.BID</label>
                <input
                  id="acct-bid"
                  value={account.intuBid}
                  maxLength={8}
                  onChange={(e) => setAccount({ ...account, intuBid: e.target.value.replace(/\D/g, "") })}
                />
              </div>
              <div className="field">
                <label htmlFor="acct-org">FI name (ORG)</label>
                <input
                  id="acct-org"
                  value={account.org}
                  maxLength={32}
                  onChange={(e) => setAccount({ ...account, org: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="acct-fid">FID</label>
                <input
                  id="acct-fid"
                  value={account.fid}
                  maxLength={8}
                  onChange={(e) => setAccount({ ...account, fid: e.target.value.replace(/\D/g, "") })}
                />
              </div>
            </div>
          </details>
        </div>
      </div>

      <div className="panel">
        <h2>3 · Preview</h2>
        {result && mapping.date < 0 && (
          <p className="notice notice-err">Choose a date column to continue.</p>
        )}
        {result && (
          <>
            <div className="stats">
              <div className="stat">
                <div className="stat-label">Transactions</div>
                <div className="stat-value">{result.transactions.length}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Money in</div>
                <div className="stat-value pos">{formatAmount(totals.in)}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Money out</div>
                <div className="stat-value neg">{formatAmount(totals.out)}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Net</div>
                <div className="stat-value">{formatAmount(totals.in + totals.out)}</div>
              </div>
              {result.issues.length > 0 && (
                <div className="stat">
                  <div className="stat-label">Skipped rows</div>
                  <div className="stat-value neg">{result.issues.length}</div>
                </div>
              )}
            </div>

            {result.transactions.length === 0 ? (
              <p className="notice notice-err">
                No rows could be converted with the current column choices. Check that the date and
                amount columns are set correctly — the skipped-row details below show what went wrong.
              </p>
            ) : (
              <div className="table-scroll" tabIndex={0} aria-label="Converted transactions preview">
                <table className="txns">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Description</th>
                      <th scope="col">Memo</th>
                      <th scope="col">Check #</th>
                      <th scope="col" style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.transactions.slice(0, PREVIEW_LIMIT).map((t) => (
                      <tr key={t.fitid}>
                        <td className="date">{t.date}</td>
                        <td>{t.description}</td>
                        <td>{t.memo}</td>
                        <td>{t.checkNumber}</td>
                        <td className={`num${t.amount < 0 ? " neg" : ""}`}>{formatAmount(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {result.transactions.length > PREVIEW_LIMIT && (
              <p className="panel-note">
                Showing the first {PREVIEW_LIMIT} of {result.transactions.length} transactions. All of
                them are included in the export.
              </p>
            )}
            {result.issues.length > 0 && (
              <details className="issues">
                <summary>
                  {result.issues.length} row{result.issues.length === 1 ? "" : "s"} will be skipped — review
                </summary>
                <ul>
                  {result.issues.slice(0, 50).map((iss, i) => (
                    <li key={i}>
                      Row {iss.row + issueRowOffset}: {iss.message}
                    </li>
                  ))}
                  {result.issues.length > 50 && <li>…and {result.issues.length - 50} more.</li>}
                </ul>
              </details>
            )}
          </>
        )}
      </div>

      <div className="panel export-panel">
        <h2>4 · Export</h2>
        <div className="export-grid">
          <div className="export-card">
            <strong>.QBO</strong>
            <span>QuickBooks Desktop (Web Connect). The format QuickBooks can't live without.</span>
            <button className="btn btn-primary" disabled={!canExport} onClick={() => doExport("qbo")}>
              Download .qbo
            </button>
          </div>
          <div className="export-card">
            <strong>.OFX</strong>
            <span>Open Financial Exchange — Xero, GnuCash, Wave, Banktivity, MoneyMoney.</span>
            <button className="btn btn-primary" disabled={!canExport} onClick={() => doExport("ofx")}>
              Download .ofx
            </button>
          </div>
          <div className="export-card">
            <strong>.QIF</strong>
            <span>Quicken Interchange Format — Quicken, YNAB4, and most legacy tools.</span>
            <button className="btn btn-primary" disabled={!canExport} onClick={() => doExport("qif")}>
              Download .qif
            </button>
          </div>
          <div className="export-card">
            <strong>Clean .CSV</strong>
            <span>Normalized 4-column layout QuickBooks Online imports directly.</span>
            <button className="btn btn-primary" disabled={!canExport} onClick={() => doExport("csv")}>
              Download .csv
            </button>
          </div>
        </div>
        <div aria-live="polite">
          {status && <p className="export-note">{status}</p>}
        </div>
        <p className="export-note">
          Files are generated and downloaded on this device. Nothing is uploaded anywhere.
        </p>
      </div>
    </div>
  );
}
