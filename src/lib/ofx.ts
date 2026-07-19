import { formatAmount } from "./amount";
import { isoToOfxDate } from "./dates";
import type { AccountSettings, Transaction } from "./types";

/** Escape the five SGML/XML-significant characters for OFX element content. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;");
}

/** OFX NAME is limited to 32 chars; overflow moves to MEMO. */
function splitName(description: string, memo: string): { name: string; memo: string } {
  const clean = description.replace(/\s+/g, " ").trim();
  if (clean.length <= 32) return { name: clean, memo };
  const name = clean.slice(0, 32).trim();
  const overflow = clean.slice(32).trim();
  return { name, memo: memo ? `${overflow} ${memo}`.trim() : overflow };
}

function trnType(t: Transaction): string {
  if (t.checkNumber && /^\d+$/.test(t.checkNumber)) return "CHECK";
  return t.amount < 0 ? "DEBIT" : "CREDIT";
}

interface Range { start: string; end: string }

function dateRange(txns: Transaction[]): Range {
  let start = txns[0].date, end = txns[0].date;
  for (const t of txns) {
    if (t.date < start) start = t.date;
    if (t.date > end) end = t.date;
  }
  return { start, end };
}

function stmtTrn(t: Transaction, xml: boolean): string {
  const { name, memo } = splitName(t.description, t.memo);
  const close = xml;
  const tag = (el: string, val: string) => (close ? `<${el}>${val}</${el}>` : `<${el}>${val}`);
  const lines = [
    "<STMTTRN>",
    tag("TRNTYPE", trnType(t)),
    tag("DTPOSTED", isoToOfxDate(t.date)),
    tag("TRNAMT", formatAmount(t.amount)),
    tag("FITID", t.fitid),
  ];
  if (t.checkNumber) lines.push(tag("CHECKNUM", esc(t.checkNumber)));
  lines.push(tag("NAME", esc(name)));
  if (memo) lines.push(tag("MEMO", esc(memo)));
  lines.push("</STMTTRN>");
  return lines.join("\n");
}

function bodyLines(txns: Transaction[], acct: AccountSettings, xml: boolean): string {
  const { start, end } = dateRange(txns);
  const now = isoToOfxDate(end);
  const tag = (el: string, val: string) => (xml ? `<${el}>${val}</${el}>` : `<${el}>${val}`);
  const isCC = acct.accountType === "CREDITCARD";
  const acctId = acct.accountId.trim() || "0000000000";
  const bankId = acct.bankId.trim() || "000000000";

  const acctFrom = isCC
    ? ["<CCACCTFROM>", tag("ACCTID", esc(acctId)), "</CCACCTFROM>"]
    : [
        "<BANKACCTFROM>",
        tag("BANKID", esc(bankId)),
        tag("ACCTID", esc(acctId)),
        tag("ACCTTYPE", acct.accountType),
        "</BANKACCTFROM>",
      ];

  const stmtrs = isCC ? "CCSTMTRS" : "STMTRS";
  const trnrs = isCC ? "CCSTMTTRNRS" : "STMTTRNRS";
  const msgset = isCC ? "CREDITCARDMSGSRSV1" : "BANKMSGSRSV1";

  return [
    "<OFX>",
    "<SIGNONMSGSRSV1>",
    "<SONRS>",
    "<STATUS>",
    tag("CODE", "0"),
    tag("SEVERITY", "INFO"),
    "</STATUS>",
    tag("DTSERVER", now),
    tag("LANGUAGE", "ENG"),
    "<FI>",
    tag("ORG", esc(acct.org.trim() || "Ledgerport")),
    tag("FID", esc(acct.fid.trim() || "3000")),
    "</FI>",
    ...(acct.intuBid ? [tag("INTU.BID", esc(acct.intuBid.trim()))] : []),
    "</SONRS>",
    "</SIGNONMSGSRSV1>",
    `<${msgset}>`,
    `<${trnrs}>`,
    tag("TRNUID", "1"),
    "<STATUS>",
    tag("CODE", "0"),
    tag("SEVERITY", "INFO"),
    "</STATUS>",
    `<${stmtrs}>`,
    tag("CURDEF", acct.currency),
    ...acctFrom,
    "<BANKTRANLIST>",
    tag("DTSTART", isoToOfxDate(start)),
    tag("DTEND", isoToOfxDate(end)),
    ...txns.map((t) => stmtTrn(t, xml)),
    "</BANKTRANLIST>",
    "<LEDGERBAL>",
    tag("BALAMT", formatAmount(txns.reduce((a, t) => a + t.amount, 0))),
    tag("DTASOF", now),
    "</LEDGERBAL>",
    `</${stmtrs}>`,
    `</${trnrs}>`,
    `</${msgset}>`,
    "</OFX>",
  ].join("\n");
}

/**
 * .qbo — QuickBooks Web Connect: OFX 1.02 SGML (unclosed leaf tags) + INTU.BID.
 */
export function generateQbo(txns: Transaction[], acct: AccountSettings): string {
  if (txns.length === 0) throw new Error("No transactions to export");
  const header = [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "SECURITY:NONE",
    "ENCODING:USASCII",
    "CHARSET:1252",
    "COMPRESSION:NONE",
    "OLDFILEUID:NONE",
    "NEWFILEUID:NONE",
    "",
  ].join("\r\n");
  return header + "\r\n" + bodyLines(txns, acct, false).replace(/\n/g, "\r\n") + "\r\n";
}

/**
 * .ofx — OFX 2.1.1 XML (closed tags), accepted by Xero, GnuCash, Wave, banks' tools.
 */
export function generateOfx(txns: Transaction[], acct: AccountSettings): string {
  if (txns.length === 0) throw new Error("No transactions to export");
  const header =
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
    '<?OFX OFXHEADER="200" VERSION="211" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>\n';
  // XML flavor omits the Intuit-proprietary INTU.BID tag.
  return header + bodyLines(txns, { ...acct, intuBid: "" }, true) + "\n";
}
