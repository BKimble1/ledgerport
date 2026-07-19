import { beforeEach, describe, expect, it } from "vitest";
import { parseAmount } from "./amount";
import { centsToDisplay, centsToFixed, sumCents, toCents } from "./money";
import { detectExcelSerialColumn, parseExcelSerial } from "./dates";
import { convertRows, guessMapping } from "./convert";
import { assessDetection, datesAmbiguous, reconcile, runPreflight } from "./analyze";
import { clearHistory, historyCount, markHistoryDuplicates, markInFileDuplicates, recordExport, setHistoryEnabled } from "./dupes";
import { generateCleanCsv } from "./qif";
import { deletePreset, exportPresets, importPresets, listPresets, loadPreset, renamePreset, savePreset } from "./presets";
import type { ColumnMapping } from "./types";
import { mkTxn } from "./formats.test";

// node has no localStorage — back it with a Map
beforeEach(() => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  } as Storage;
});

const M = (over: Partial<ColumnMapping> = {}): ColumnMapping => ({
  date: 0, description: 1, amountMode: "single", amount: 2, debit: -1, credit: -1,
  memo: -1, checkNumber: -1, balance: -1, flipSign: false, dateFormat: "MDY", ...over,
});

describe("money (integer cents)", () => {
  it("survives the classic float trap", () => {
    // 0.1 + 0.2 !== 0.3 in floats; in cents it is exact
    expect(sumCents([toCents(0.1), toCents(0.2)])).toBe(30);
  });
  it("sums many odd cents exactly", () => {
    const cents = Array.from({ length: 1000 }, () => 1);
    expect(sumCents(cents)).toBe(1000);
  });
  it("centsToFixed", () => {
    expect(centsToFixed(-123456)).toBe("-1234.56");
    expect(centsToFixed(5)).toBe("0.05");
    expect(centsToFixed(0)).toBe("0.00");
  });
  it("centsToDisplay", () => {
    expect(centsToDisplay(123456789)).toBe("$1,234,567.89");
    expect(centsToDisplay(-9)).toBe("-$0.09");
  });
});

describe("CR/DR indicators", () => {
  it("DR forces negative", () => expect(parseAmount("82.17 DR")).toBe(-82.17));
  it("CR forces positive", () => expect(parseAmount("82.17 CR")).toBe(82.17));
  it("leading indicator", () => expect(parseAmount("CR 45.00")).toBe(45));
  it("DB variant", () => expect(parseAmount("45.00 DB")).toBe(-45));
  it("with currency and commas", () => expect(parseAmount("$1,234.56 DR")).toBe(-1234.56));
  it("plain values unaffected", () => expect(parseAmount("-45.00")).toBe(-45));
});

describe("Excel serial dates", () => {
  it("parses a known serial", () => expect(parseExcelSerial("46107")).toBe("2026-03-26"));
  it("rejects small numbers (amounts)", () => expect(parseExcelSerial("1234")).toBeNull());
  it("rejects huge numbers", () => expect(parseExcelSerial("99999")).toBeNull());
  it("column detection requires every value to qualify", () => {
    expect(detectExcelSerialColumn(["46107", "46108", ""])).toBe(true);
    expect(detectExcelSerialColumn(["46107", "06/01/2026"])).toBe(false);
  });
  it("convertRows converts a serial column with a flag", () => {
    const r = convertRows([["46107", "COFFEE", "-4.50"], ["46108", "LUNCH", "-9.00"]], M());
    expect(r.transactions[0].date).toBe("2026-03-26");
    expect(r.transactions[0].flags).toContain("serial-date");
  });
});

describe("summary-row handling", () => {
  it("excludes a dated total row but keeps it visible", () => {
    const r = convertRows(
      [["06/01/2026", "COFFEE", "-4.50"], ["06/30/2026", "Ending balance", "1200.00"]],
      M()
    );
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[1].excluded).toBe(true);
    expect(r.transactions[1].flags).toContain("summary-row");
  });
  it("reports an undated trailing Total row as a summary skip, not a date error", () => {
    const r = convertRows([["06/01/2026", "COFFEE", "-4.50"], ["", "Total", "-4.50"]], M());
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0].message).toMatch(/summary/i);
  });
  it("does not flag ordinary merchants containing 'balance'", () => {
    const r = convertRows([["06/01/2026", "BALANCED BODY GYM", "-30.00"]], M());
    expect(r.transactions[0].excluded).toBe(false);
  });
});

describe("balance column", () => {
  it("guessMapping finds Balance and keeps it out of amount", () => {
    const m = guessMapping(
      ["Date", "Description", "Amount", "Balance"],
      [["06/01/2026", "A", "-5.00", "995.00"]]
    );
    expect(m.balance).toBe(3);
    expect(m.amount).toBe(2);
  });
  it("parses balanceCents", () => {
    const r = convertRows([["06/01/2026", "A", "-5.00", "995.00"]], M({ balance: 3 }));
    expect(r.transactions[0].balanceCents).toBe(99500);
  });
});

describe("duplicate firewall", () => {
  const rows = [
    ["06/01/2026", "COFFEE", "-4.50"],
    ["06/01/2026", "COFFEE", "-4.50"],
    ["06/01/2026", "BAGEL", "-4.50"],
  ];
  it("marks exact in-file duplicates excluded, possible ones flagged only", () => {
    const r = convertRows(rows, M());
    markInFileDuplicates(r.transactions, "1234");
    expect(r.transactions[1].dupStatus).toBe("exact-file");
    expect(r.transactions[1].excluded).toBe(true);
    expect(r.transactions[2].dupStatus).toBe("possible");
    expect(r.transactions[2].excluded).toBe(false);
  });
  it("history: recorded exports are flagged next time", () => {
    const r1 = convertRows([rows[0]], M());
    recordExport(r1.transactions, "1234");
    expect(historyCount()).toBe(1);
    const r2 = convertRows([rows[0]], M());
    const flagged = markHistoryDuplicates(r2.transactions, "1234");
    expect(flagged).toBe(1);
    expect(r2.transactions[0].dupStatus).toBe("history");
    expect(r2.transactions[0].excluded).toBe(true);
  });
  it("different account id does not collide", () => {
    const r1 = convertRows([rows[0]], M());
    recordExport(r1.transactions, "1234");
    const r2 = convertRows([rows[0]], M());
    expect(markHistoryDuplicates(r2.transactions, "9999")).toBe(0);
  });
  it("disabled history flags nothing and records nothing", () => {
    setHistoryEnabled(false);
    const r1 = convertRows([rows[0]], M());
    recordExport(r1.transactions, "1234");
    expect(historyCount()).toBe(0);
    expect(markHistoryDuplicates(r1.transactions, "1234")).toBe(0);
  });
  it("clearHistory empties it", () => {
    const r1 = convertRows([rows[0]], M());
    recordExport(r1.transactions, "1234");
    clearHistory();
    expect(historyCount()).toBe(0);
  });
});

describe("assessDetection (nonfinancial guard)", () => {
  it("accepts a bank file", () => {
    const rows = [["06/01/2026", "COFFEE", "-4.50"]];
    const a = assessDetection(rows, guessMapping(["Date", "Description", "Amount"], rows));
    expect(a.financial).toBe(true);
  });
  it("rejects a contact list with clear reasons", () => {
    const rows = [
      ["Ben", "Kimble", "ben@example.com", "555-0100"],
      ["Ada", "Lovelace", "ada@example.com", "555-0101"],
    ];
    const a = assessDetection(rows, guessMapping(["First", "Last", "Email", "Phone"], rows));
    expect(a.financial).toBe(false);
    expect(a.reasons.join(" ")).toMatch(/date/i);
  });
});

describe("datesAmbiguous", () => {
  it("true when all dates could be either order", () =>
    expect(datesAmbiguous([["03/04/2026", "A", "1"]], M({ dateFormat: "auto" }))).toBe(true));
  it("false when any date disambiguates", () =>
    expect(datesAmbiguous([["03/04/2026", "A", "1"], ["25/04/2026", "B", "1"]], M({ dateFormat: "auto" }))).toBe(false));
  it("false when user chose a format", () =>
    expect(datesAmbiguous([["03/04/2026", "A", "1"]], M({ dateFormat: "MDY" }))).toBe(false));
});

describe("reconcile", () => {
  it("counts and totals in exact cents", () => {
    const r = convertRows(
      [["06/01/2026", "A", "0.10"], ["06/02/2026", "B", "0.20"], ["06/03/2026", "C", "-0.30"], ["", "", ""]],
      M()
    );
    const rec = reconcile(r, 4);
    expect(rec.included).toBe(3);
    expect(rec.moneyInCents).toBe(30);
    expect(rec.moneyOutCents).toBe(-30);
    expect(rec.netCents).toBe(0);
    expect(rec.oneToOne).toBe(true);
    expect(rec.earliest).toBe("2026-06-01");
    expect(rec.latest).toBe("2026-06-03");
  });
  it("balance proof passes on a consistent running balance (oldest first)", () => {
    const r = convertRows(
      [
        ["06/01/2026", "A", "100.00", "1100.00"],
        ["06/02/2026", "B", "-50.00", "1050.00"],
      ],
      M({ balance: 3 })
    );
    const rec = reconcile(r, 2);
    expect(rec.balanceProof?.matches).toBe(true);
    expect(rec.balanceProof?.openingCents).toBe(100000);
  });
  it("balance proof passes newest-first", () => {
    const r = convertRows(
      [
        ["06/02/2026", "B", "-50.00", "1050.00"],
        ["06/01/2026", "A", "100.00", "1100.00"],
      ],
      M({ balance: 3 })
    );
    expect(reconcile(r, 2).balanceProof?.matches).toBe(true);
  });
  it("balance proof fails when a row is missing", () => {
    const r = convertRows(
      [
        ["06/01/2026", "A", "100.00", "1100.00"],
        ["06/03/2026", "C", "-20.00", "1030.00"], // a -50 row was deleted
      ],
      M({ balance: 3 })
    );
    expect(reconcile(r, 2).balanceProof?.matches).toBe(false);
  });
});

describe("runPreflight", () => {
  const base = (rows: string[][], mapping = M()) => {
    const result = convertRows(rows, mapping);
    markInFileDuplicates(result.transactions, "");
    const recon = reconcile(result, rows.length);
    return runPreflight({ result, recon, ambiguousDates: false, accountIdSet: true, rowOffset: 2 });
  };
  it("clean file → ready", () => {
    expect(base([["06/01/2026", "COFFEE", "-4.50"]]).level).toBe("ready");
  });
  it("bad rows → warnings", () => {
    const p = base([["06/01/2026", "COFFEE", "-4.50"], ["junk", "X", "??"]]);
    expect(p.level).toBe("warnings");
    expect(p.items.some((i) => i.rows?.includes(3))).toBe(true);
  });
  it("nothing exportable → blocked", () => {
    expect(base([["junk", "X", "??"]]).level).toBe("blocked");
  });
  it("ambiguous dates → review", () => {
    const result = convertRows([["03/04/2026", "A", "1.00"]], M());
    const recon = reconcile(result, 1);
    const p = runPreflight({ result, recon, ambiguousDates: true, accountIdSet: true, rowOffset: 2 });
    expect(p.level).toBe("review");
  });
});

describe("CSV formula injection guard", () => {
  it("prefixes dangerous leading characters", () => {
    const out = generateCleanCsv([mkTxn({ amount: -5, description: "=HYPERLINK(evil)" })]);
    expect(out).toContain("'=HYPERLINK");
  });
  it("plain descriptions untouched", () => {
    const out = generateCleanCsv([mkTxn({ amount: -5, description: "COFFEE" })]);
    expect(out).toContain(",COFFEE,");
  });
});

describe("named mapping profiles", () => {
  const H = ["Date", "Description", "Amount"];
  const acct = { accountType: "CHECKING", currency: "USD", accountId: "1", bankId: "", intuBid: "3000", org: "L", fid: "3000" } as const;
  it("save → list → rename → delete round trip", () => {
    savePreset(H, M(), { ...acct }, "Chase checking");
    const list = listPresets();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Chase checking");
    renamePreset(list[0].signature, "Chase biz");
    expect(listPresets()[0].name).toBe("Chase biz");
    deletePreset(list[0].signature);
    expect(listPresets()).toHaveLength(0);
  });
  it("export/import round trip preserves profiles, no transactions involved", () => {
    savePreset(H, M(), { ...acct }, "Chase");
    const json = exportPresets();
    localStorage.clear();
    expect(importPresets(json)).toBe(1);
    expect(loadPreset(H)?.name).toBe("Chase");
    expect(json).not.toMatch(/COFFEE|4\.50/);
  });
  it("import rejects garbage", () => expect(importPresets("not json")).toBe(-1));
  it("old presets without balance field get -1", () => {
    const legacy = { [`${H.map((h) => h.toLowerCase()).join("|")}`]: { mapping: (({ balance: _b, ...rest }) => rest)(M()), account: acct, savedAt: "2026-01-01" } };
    localStorage.setItem("ledgerport.presets.v1", JSON.stringify(legacy));
    expect(loadPreset(H)?.mapping.balance).toBe(-1);
  });
});
