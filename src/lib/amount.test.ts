import { describe, expect, it } from "vitest";
import { formatAmount, parseAmount } from "./amount";

describe("parseAmount", () => {
  const cases: Array<[string, number | null]> = [
    ["45.00", 45],
    ["-45.00", -45],
    ["+45.00", 45],
    ["(45.00)", -45],
    ["45.00-", -45],
    ["$1,234.56", 1234.56],
    ["-$1,234.56", -1234.56],
    ["($2,000.00)", -2000],
    ["1,234.56", 1234.56],
    ["1.234,56", 1234.56],
    ["1 234,56", 1234.56],
    ["€45,00", 45],
    ["1.234", 1234],
    ["1.234.567", 1234567],
    ["12,345", 12345],
    ["1,234,567.89", 1234567.89],
    ["45", 45],
    ["0", 0],
    ["0.00", 0],
    [".5", 0.5],
    ["45.5", 45.5],
    ["100 USD", 100],
    ["", null],
    ["   ", null],
    ["abc", null],
    ["N/A", null],
    ["--", null],
    ["12.34.56,78", 123456.78],
  ];
  for (const [input, expected] of cases) {
    it(`parses ${JSON.stringify(input)} → ${expected}`, () => {
      expect(parseAmount(input)).toBe(expected);
    });
  }

  it("treats a lone dot with 3 trailing digits as a thousands separator", () => {
    expect(parseAmount("1.005")).toBe(1005);
  });
});

describe("formatAmount", () => {
  it("fixed two decimals", () => expect(formatAmount(45)).toBe("45.00"));
  it("negative", () => expect(formatAmount(-1234.5)).toBe("-1234.50"));
  it("no negative zero", () => expect(formatAmount(-0.001)).toBe("0.00"));
  it("rounds", () => expect(formatAmount(1.006)).toBe("1.01"));
});
