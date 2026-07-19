import { describe, expect, it } from "vitest";
import { convertRows, guessMapping, looksLikeHeader } from "./convert";
import type { ColumnMapping } from "./types";

const baseMapping: ColumnMapping = {
  date: 0,
  description: 1,
  amountMode: "single",
  amount: 2,
  debit: -1,
  credit: -1,
  memo: -1,
  checkNumber: -1,
  flipSign: false,
  dateFormat: "MDY",
};

describe("looksLikeHeader", () => {
  it("true for header row", () =>
    expect(looksLikeHeader(["Date", "Description", "Amount"])).toBe(true));
  it("false for data row", () =>
    expect(looksLikeHeader(["06/01/2026", "COFFEE", "-4.50"])).toBe(false));
});

describe("guessMapping", () => {
  it("maps standard headers", () => {
    const m = guessMapping(
      ["Date", "Description", "Amount"],
      [["06/01/2026", "COFFEE", "-4.50"]]
    );
    expect(m.date).toBe(0);
    expect(m.description).toBe(1);
    expect(m.amount).toBe(2);
    expect(m.amountMode).toBe("single");
  });

  it("maps debit/credit layout", () => {
    const m = guessMapping(
      ["Posted Date", "Payee", "Debit", "Credit"],
      [["06/01/2026", "COFFEE", "4.50", ""]]
    );
    expect(m.amountMode).toBe("debitCredit");
    expect(m.debit).toBe(2);
    expect(m.credit).toBe(3);
  });

  it("detects columns positionally without headers", () => {
    const rows = [
      ["06/01/2026", "GROCERY MART STORE 41", "-52.10"],
      ["06/02/2026", "PAYCHECK DEPOSIT EMPLOYER INC", "1800.00"],
    ];
    const m = guessMapping(["", "", ""], rows);
    expect(m.date).toBe(0);
    expect(m.amount).toBe(2);
    expect(m.description).toBe(1);
  });

  it("detects DMY dates from data", () => {
    const m = guessMapping(
      ["Date", "Description", "Amount"],
      [["25/06/2026", "COFFEE", "-4.50"]]
    );
    expect(m.dateFormat).toBe("DMY");
  });

  it("maps check number and memo", () => {
    const m = guessMapping(
      ["Date", "Description", "Amount", "Check No", "Reference"],
      [["06/01/2026", "RENT", "-1200.00", "1042", "ref-1"]]
    );
    expect(m.checkNumber).toBe(3);
    expect(m.memo).toBe(4);
  });
});

describe("convertRows", () => {
  it("converts the happy path", () => {
    const res = convertRows(
      [
        ["06/01/2026", "DEPOSIT", "2500.00"],
        ["06/03/2026", "OFFICE SUPPLY", "(84.19)"],
      ],
      baseMapping
    );
    expect(res.issues).toHaveLength(0);
    expect(res.transactions).toHaveLength(2);
    expect(res.transactions[0]).toMatchObject({ date: "2026-06-01", amount: 2500 });
    expect(res.transactions[1]).toMatchObject({ date: "2026-06-03", amount: -84.19 });
  });

  it("flags bad dates and amounts with row numbers", () => {
    const res = convertRows(
      [
        ["not-a-date", "X", "1.00"],
        ["06/01/2026", "Y", "??"],
        ["06/02/2026", "Z", "3.00"],
      ],
      baseMapping
    );
    expect(res.transactions).toHaveLength(1);
    expect(res.issues).toHaveLength(2);
    expect(res.issues[0]).toMatchObject({ row: 0, field: "date" });
    expect(res.issues[1]).toMatchObject({ row: 1, field: "amount" });
  });

  it("skips fully empty rows silently", () => {
    const res = convertRows(
      [["06/01/2026", "A", "1.00"], ["", "", ""], ["06/02/2026", "B", "2.00"]],
      baseMapping
    );
    expect(res.transactions).toHaveLength(2);
    expect(res.skippedEmpty).toBe(1);
    expect(res.issues).toHaveLength(0);
  });

  it("debit/credit mode signs correctly", () => {
    const res = convertRows(
      [
        ["06/01/2026", "SPEND", "45.00", ""],
        ["06/02/2026", "INCOME", "", "100.00"],
      ],
      { ...baseMapping, amountMode: "debitCredit", amount: -1, debit: 2, credit: 3 }
    );
    expect(res.transactions[0].amount).toBe(-45);
    expect(res.transactions[1].amount).toBe(100);
  });

  it("flags rows with neither debit nor credit", () => {
    const res = convertRows(
      [["06/01/2026", "MYSTERY", "", ""]],
      { ...baseMapping, amountMode: "debitCredit", amount: -1, debit: 2, credit: 3 }
    );
    expect(res.transactions).toHaveLength(0);
    expect(res.issues[0].field).toBe("amount");
  });

  it("flipSign inverts amounts", () => {
    const res = convertRows([["06/01/2026", "A", "45.00"]], { ...baseMapping, flipSign: true });
    expect(res.transactions[0].amount).toBe(-45);
  });

  it("generates unique FITIDs for identical transactions", () => {
    const res = convertRows(
      [
        ["06/01/2026", "COFFEE", "-4.50"],
        ["06/01/2026", "COFFEE", "-4.50"],
      ],
      baseMapping
    );
    expect(res.transactions[0].fitid).not.toBe(res.transactions[1].fitid);
  });

  it("FITIDs are stable across runs", () => {
    const rows = [["06/01/2026", "COFFEE", "-4.50"]];
    const a = convertRows(rows, baseMapping);
    const b = convertRows(rows, baseMapping);
    expect(a.transactions[0].fitid).toBe(b.transactions[0].fitid);
  });

  it("auto-detects DMY across the column", () => {
    const res = convertRows(
      [
        ["01/06/2026", "A", "1.00"],
        ["25/06/2026", "B", "2.00"],
      ],
      { ...baseMapping, dateFormat: "auto" }
    );
    expect(res.transactions[0].date).toBe("2026-06-01");
    expect(res.transactions[1].date).toBe("2026-06-25");
  });

  it("defaults blank description", () => {
    const res = convertRows([["06/01/2026", "", "1.00"]], baseMapping);
    expect(res.transactions[0].description).toBe("TRANSACTION");
  });

  it("handles rows shorter than the mapping", () => {
    const res = convertRows([["06/01/2026"]], baseMapping);
    expect(res.transactions).toHaveLength(0);
    expect(res.issues).toHaveLength(1);
  });
});
