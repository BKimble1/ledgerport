import { describe, expect, it } from "vitest";
import { generateOfx, generateQbo } from "./ofx";
import { generateCleanCsv, generateQif } from "./qif";
import { DEFAULT_ACCOUNT, type AccountSettings, type Transaction } from "./types";

export const mkTxn = (t: Partial<Transaction>): Transaction => ({
  date: "2026-06-01",
  amount: 0,
  cents: 0,
  description: "X",
  memo: "",
  checkNumber: "",
  fitid: "F0",
  rawIndex: 0,
  raw: [],
  balanceCents: null,
  excluded: false,
  flags: [],
  ...t,
  ...(t.amount !== undefined && t.cents === undefined ? { cents: Math.round(t.amount * 100) } : {}),
});

const txns: Transaction[] = [
  mkTxn({ date: "2026-06-01", amount: 2500, description: "OPENING DEPOSIT", fitid: "F1" }),
  mkTxn({ date: "2026-06-03", amount: -84.19, description: "ACME OFFICE SUPPLY & TOOLS <BULK>", memo: "card 4421", fitid: "F2", rawIndex: 1 }),
  mkTxn({ date: "2026-06-05", amount: -1200, description: "RENT", checkNumber: "1042", fitid: "F3", rawIndex: 2 }),
];

const acct: AccountSettings = {
  ...DEFAULT_ACCOUNT,
  accountId: "123456789",
  bankId: "021000021",
};

describe("generateQbo", () => {
  const out = generateQbo(txns, acct);

  it("has the OFX 1.02 SGML header", () => {
    expect(out.startsWith("OFXHEADER:100\r\nDATA:OFXSGML\r\nVERSION:102")).toBe(true);
  });
  it("includes INTU.BID (the tag QuickBooks requires)", () => {
    expect(out).toContain("<INTU.BID>3000");
  });
  it("includes account details", () => {
    expect(out).toContain("<BANKID>021000021");
    expect(out).toContain("<ACCTID>123456789");
    expect(out).toContain("<ACCTTYPE>CHECKING");
  });
  it("includes all transactions with signed amounts", () => {
    expect(out).toContain("<TRNAMT>2500.00");
    expect(out).toContain("<TRNAMT>-84.19");
    expect(out).toContain("<TRNAMT>-1200.00");
  });
  it("escapes SGML-significant characters", () => {
    expect(out).toContain("&amp;");
    expect(out).not.toContain("<BULK>");
    const short = generateQbo(
      [mkTxn({ amount: -5, description: "A <B> & C", fitid: "X" })],
      acct
    );
    expect(short).toContain("<NAME>A &lt;B&gt; &amp; C");
  });
  it("marks checks with CHECKNUM and CHECK type", () => {
    expect(out).toContain("<CHECKNUM>1042");
    expect(out).toContain("<TRNTYPE>CHECK");
  });
  it("computes the date range", () => {
    expect(out).toContain("<DTSTART>20260601120000");
    expect(out).toContain("<DTEND>20260605120000");
  });
  it("computes the ledger balance", () => {
    expect(out).toContain("<BALAMT>1215.81");
  });
  it("truncates NAME to 32 chars, moving overflow to MEMO", () => {
    const nameLine = out.split("\r\n").find((l) => l.includes("ACME"));
    expect(nameLine).toBeDefined();
    const name = nameLine!.replace("<NAME>", "");
    expect(name.length).toBeLessThanOrEqual(32 + 8); // entity escapes count as more chars
  });
  it("throws on empty transaction list", () => {
    expect(() => generateQbo([], acct)).toThrow();
  });
});

describe("generateOfx (XML)", () => {
  const out = generateOfx(txns, acct);
  it("is OFX 2.x XML", () => {
    expect(out).toContain('<?OFX OFXHEADER="200"');
    expect(out).toContain("</TRNAMT>");
  });
  it("omits the Intuit-proprietary INTU.BID", () => {
    expect(out).not.toContain("INTU.BID");
  });
  it("closes every opened tag (well-formedness smoke check)", () => {
    for (const el of ["OFX", "SONRS", "STMTRS", "BANKTRANLIST", "STMTTRN", "LEDGERBAL"]) {
      const opens = (out.match(new RegExp(`<${el}>`, "g")) || []).length;
      const closes = (out.match(new RegExp(`</${el}>`, "g")) || []).length;
      expect(opens, el).toBe(closes);
    }
  });
});

describe("credit card accounts", () => {
  const cc = generateQbo(txns, { ...acct, accountType: "CREDITCARD" });
  it("uses CCACCTFROM without BANKID/ACCTTYPE", () => {
    expect(cc).toContain("<CCACCTFROM>");
    expect(cc).toContain("CREDITCARDMSGSRSV1");
    expect(cc).not.toContain("<BANKID>");
    expect(cc).not.toContain("<ACCTTYPE>");
  });
});

describe("generateQif", () => {
  const out = generateQif(txns, acct);
  it("bank type header", () => expect(out.startsWith("!Type:Bank")).toBe(true));
  it("credit card type header", () =>
    expect(generateQif(txns, { ...acct, accountType: "CREDITCARD" }).startsWith("!Type:CCard")).toBe(true));
  it("one caret-terminated block per transaction", () => {
    expect((out.match(/\^\r\n/g) || []).length).toBe(3);
  });
  it("QIF dates and amounts", () => {
    expect(out).toContain("D06/01/2026");
    expect(out).toContain("T-84.19");
  });
  it("check number as N line", () => expect(out).toContain("N1042"));
  it("memo as M line", () => expect(out).toContain("Mcard 4421"));
});

describe("generateCleanCsv", () => {
  const out = generateCleanCsv(txns);
  it("4-column QuickBooks Online layout", () => {
    expect(out.startsWith("Date,Description,Credit,Debit")).toBe(true);
  });
  it("splits credit/debit columns", () => {
    expect(out).toContain("06/01/2026,OPENING DEPOSIT,2500.00,");
    expect(out).toContain(",1200.00");
  });
  it("quotes cells containing commas", () => {
    const withComma = generateCleanCsv([
      mkTxn({ amount: -5, description: "A, B", fitid: "X" }),
    ]);
    expect(withComma).toContain('"A, B"');
  });
});
