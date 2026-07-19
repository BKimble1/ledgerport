import { describe, expect, it } from "vitest";
import { rescueFile, rescueOfx, rescueQif } from "./rescue";
import { generateQbo, generateOfx } from "./ofx";
import { generateQif } from "./qif";
import { convertRows, guessMapping } from "./convert";
import { DEFAULT_ACCOUNT } from "./types";
import { mkTxn } from "./testutil";

const txns = [
  mkTxn({ date: "2026-06-01", amount: 2500, description: "OPENING DEPOSIT", fitid: "A1" }),
  mkTxn({ date: "2026-06-03", amount: -84.19, description: "ACME & SONS", fitid: "A2", rawIndex: 1 }),
  mkTxn({ date: "2026-06-05", amount: -1200, description: "RENT", checkNumber: "1042", fitid: "A3", rawIndex: 2 }),
];
const acct = { ...DEFAULT_ACCOUNT, accountId: "123456789" };

describe("rescueOfx round trip", () => {
  it("recovers every transaction from a Ledgerport QBO", () => {
    const qbo = generateQbo(txns, acct);
    const r = rescueOfx(qbo)!;
    expect(r.transactionsFound).toBe(3);
    // feed back through the standard pipeline
    const mapping = guessMapping(r.headers, r.rows);
    const conv = convertRows(r.rows, mapping);
    expect(conv.transactions).toHaveLength(3);
    expect(conv.transactions.map((t) => t.cents)).toEqual([250000, -8419, -120000]);
    expect(conv.transactions[1].description).toBe("ACME & SONS"); // unescaped
    expect(conv.transactions[2].checkNumber).toBe("1042");
  });
  it("recovers from XML OFX too", () => {
    const ofx = generateOfx(txns, acct);
    const r = rescueOfx(ofx)!;
    expect(r.transactionsFound).toBe(3);
  });
  it("diagnoses duplicate FITIDs and unescaped ampersands", () => {
    const broken = `OFXHEADER:100\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><ACCTID>1</BANKACCTFROM><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260601<TRNAMT>-5.00<FITID>X1<NAME>SMITH & CO</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260602<TRNAMT>-6.00<FITID>X1<NAME>OTHER</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const r = rescueOfx(broken)!;
    expect(r.findings.join(" ")).toMatch(/duplicate FITID/i);
    expect(r.findings.join(" ")).toMatch(/unescaped "&"/i);
    expect(r.findings.join(" ")).toMatch(/INTU\.BID/);
    expect(r.transactionsFound).toBe(2);
  });
  it("flags missing structure", () => {
    const r = rescueOfx("OFXHEADER:100\n<OFX></OFX>")!;
    expect(r.transactionsFound).toBe(0);
    expect(r.findings.join(" ")).toMatch(/BANKTRANLIST/);
  });
  it("returns null for non-OFX text", () => expect(rescueOfx("hello,world")).toBeNull());
});

describe("rescueQif round trip", () => {
  it("recovers transactions from a Ledgerport QIF", () => {
    const qif = generateQif(txns, acct);
    const r = rescueQif(qif)!;
    expect(r.transactionsFound).toBe(3);
    const conv = convertRows(r.rows, guessMapping(r.headers, r.rows));
    expect(conv.transactions.map((t) => t.cents)).toEqual([250000, -8419, -120000]);
  });
  it("flags a missing !Type header", () => {
    const r = rescueQif("D06/01/2026\nT-5.00\nPCOFFEE\n^\n")!;
    expect(r.findings.join(" ")).toMatch(/!Type/);
    expect(r.transactionsFound).toBe(1);
  });
  it("returns null for non-QIF", () => expect(rescueQif("a,b,c")).toBeNull());
});

describe("rescueFile dispatch", () => {
  it("routes .qbo to OFX rescue", () =>
    expect(rescueFile("x.qbo", generateQbo(txns, acct))?.kind).toBe("ofx"));
  it("routes .qif to QIF rescue", () =>
    expect(rescueFile("x.qif", generateQif(txns, acct))?.kind).toBe("qif"));
  it("returns null for CSV", () => expect(rescueFile("x.csv", "Date,Amount\n1/1/2026,5")).toBeNull());
});
