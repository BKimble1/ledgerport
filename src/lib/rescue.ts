/**
 * Import Rescue Mode: parse an existing (possibly broken) QBO/OFX/QIF file,
 * diagnose why the destination may have rejected it, and hand its transactions
 * to the normal pipeline so a clean file can be regenerated.
 */

export interface RescueResult {
  kind: "ofx" | "qif";
  /** synthetic CSV table for the standard pipeline */
  headers: string[];
  rows: string[][];
  /** human-readable findings about the original file */
  findings: string[];
  transactionsFound: number;
}

const OFX_TAG = (block: string, tag: string): string => {
  const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : "";
};

function unescapeOfx(s: string): string {
  return s
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function ofxDateToMdy(d: string): string {
  const m = d.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : d;
}

/** Rescue an OFX/QBO file. Returns null when the text isn't OFX at all. */
export function rescueOfx(text: string): RescueResult | null {
  if (!/<OFX>/i.test(text) && !/^OFXHEADER/im.test(text)) return null;
  const findings: string[] = [];

  const isQboIntent = /INTU\.BID/i.test(text) || /^OFXHEADER/im.test(text);
  if (!/^OFXHEADER/im.test(text) && !/<\?OFX/i.test(text)) {
    findings.push("Missing OFX header block — QuickBooks rejects files without `OFXHEADER:100` (SGML) or an `<?OFX ...?>` declaration (XML).");
  }
  if (isQboIntent && !/<INTU\.BID>/i.test(text)) {
    findings.push("No <INTU.BID> tag — QuickBooks Desktop requires a recognized Intuit bank ID in .qbo files.");
  }
  if (!/<(BANKACCTFROM|CCACCTFROM)>/i.test(text)) {
    findings.push("No account block (<BANKACCTFROM>/<CCACCTFROM>) — the destination can't tell which account this belongs to.");
  }
  if (!/<BANKTRANLIST>/i.test(text)) {
    findings.push("No <BANKTRANLIST> transaction list section.");
  }
  // Unescaped ampersands: '&' not starting a known entity is an SGML/XML parse killer.
  const badAmp = (text.match(/&(?!(amp|lt|gt|quot|apos|#\d+);)/gi) || []).length;
  if (badAmp > 0) {
    findings.push(`${badAmp} unescaped "&" character${badAmp === 1 ? "" : "s"} — a very common cause of import failures.`);
  }

  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTTRN>\s*<\/BANKTRANLIST>|$)/gi) ?? [];
  const rows: string[][] = [];
  const fitids = new Map<string, number>();
  let badDates = 0;
  let badAmounts = 0;

  for (const b of blocks) {
    const dt = OFX_TAG(b, "DTPOSTED");
    const amt = OFX_TAG(b, "TRNAMT");
    const name = unescapeOfx(OFX_TAG(b, "NAME"));
    const memo = unescapeOfx(OFX_TAG(b, "MEMO"));
    const check = OFX_TAG(b, "CHECKNUM");
    const fitid = OFX_TAG(b, "FITID");
    if (fitid) fitids.set(fitid, (fitids.get(fitid) ?? 0) + 1);
    if (!/^\d{8}/.test(dt)) badDates++;
    if (amt === "" || !/^[+-]?[\d.,]+$/.test(amt)) badAmounts++;
    rows.push([ofxDateToMdy(dt), name || memo, amt, check, name ? memo : ""]);
  }

  const dupFitids = [...fitids.entries()].filter(([, n]) => n > 1);
  if (dupFitids.length > 0) {
    findings.push(`${dupFitids.length} duplicate FITID${dupFitids.length === 1 ? "" : "s"} — QuickBooks silently skips transactions whose ID it has already seen. Regenerating assigns fresh unique IDs.`);
  }
  if (badDates > 0) findings.push(`${badDates} transaction${badDates === 1 ? "" : "s"} with malformed DTPOSTED dates.`);
  if (badAmounts > 0) findings.push(`${badAmounts} transaction${badAmounts === 1 ? "" : "s"} with malformed TRNAMT amounts.`);
  if (blocks.length === 0) findings.push("No <STMTTRN> transactions could be found in the file.");

  return {
    kind: "ofx",
    headers: ["Date", "Description", "Amount", "Check Number", "Memo"],
    rows,
    findings,
    transactionsFound: blocks.length,
  };
}

/** Rescue a QIF file. Returns null when the text isn't QIF. */
export function rescueQif(text: string): RescueResult | null {
  if (!/^!Type:/im.test(text) && !/^\^\s*$/m.test(text)) return null;
  const findings: string[] = [];
  if (!/^!Type:/im.test(text)) {
    findings.push("Missing !Type: header — Quicken needs it to know the account type.");
  }
  const blocks = text.split(/\r?\n\^\s*/).map((b) => b.trim()).filter(Boolean);
  const rows: string[][] = [];
  let badDates = 0;
  for (const b of blocks) {
    const line = (p: string) => {
      const m = b.match(new RegExp(`^${p}(.*)$`, "m"));
      return m ? m[1].trim() : "";
    };
    const d = line("D");
    const t = line("T") || line("U");
    if (!d && !t) continue; // header-only block
    if (!/\d/.test(d)) badDates++;
    rows.push([d, line("P"), t, line("N"), line("M")]);
  }
  if (badDates > 0) findings.push(`${badDates} record${badDates === 1 ? "" : "s"} with malformed D (date) lines.`);
  if (rows.length === 0) findings.push("No transaction records found between ^ separators.");
  findings.push("Note: QIF has no unique transaction IDs, so the destination cannot deduplicate re-imports — Ledgerport's duplicate firewall covers that gap.");

  return {
    kind: "qif",
    headers: ["Date", "Description", "Amount", "Check Number", "Memo"],
    rows,
    findings,
    transactionsFound: rows.length,
  };
}

/** Try all rescue parsers. */
export function rescueFile(name: string, text: string): RescueResult | null {
  const lower = name.toLowerCase();
  if (/\.(qbo|ofx|qfx)$/.test(lower) || /<OFX>/i.test(text) || /^OFXHEADER/im.test(text)) {
    return rescueOfx(text);
  }
  if (/\.qif$/.test(lower) || /^!Type:/im.test(text)) {
    return rescueQif(text);
  }
  return null;
}
