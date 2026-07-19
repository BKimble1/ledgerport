/** Friendly rejection messages for files that are not delimited text. */
export function checkFileSupported(name: string, firstBytes: string): string | null {
  const lower = name.toLowerCase();
  if (/\.(xlsx|xls)$/.test(lower) || firstBytes.startsWith("PK")) {
    return "This is an Excel file. Open it in Excel (or Google Sheets) and use File → Save As → CSV, then load the CSV here.";
  }
  if (/\.pdf$/.test(lower) || firstBytes.startsWith("%PDF")) {
    return "This is a PDF statement. Ledgerport converts CSV exports — most banks offer a separate CSV/Excel download next to the PDF.";
  }
  if (/\.(qbo|ofx|qfx)$/.test(lower) || /^OFXHEADER/i.test(firstBytes.trim()) || firstBytes.includes("<OFX>")) {
    return "This file is already in QBO/OFX format — you can import it into your accounting software directly, no conversion needed.";
  }
  if (/\.qif$/.test(lower) || firstBytes.trimStart().startsWith("!Type:")) {
    return "This is already a QIF file — Quicken and most tools can import it directly.";
  }
  if (firstBytes.startsWith("{\\rtf") || /\.(docx?|zip|png|jpe?g)$/.test(lower)) {
    return "This doesn't look like a CSV file. Export your transactions as CSV from your bank and load that file.";
  }
  return null;
}

/** True when running inside an embedded iframe (e.g. a sandboxed preview) where downloads may be blocked. */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
