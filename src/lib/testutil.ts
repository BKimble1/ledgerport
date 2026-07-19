import type { Transaction } from "./types";

/** Test fixture builder: a complete Transaction from a partial. */
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
