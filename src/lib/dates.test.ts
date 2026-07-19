import { describe, expect, it } from "vitest";
import { detectDateOrder, isoToOfxDate, isoToQifDate, parseDate } from "./dates";

describe("parseDate", () => {
  it("ISO", () => expect(parseDate("2026-06-05", "MDY")).toBe("2026-06-05"));
  it("ISO with time", () => expect(parseDate("2026-06-05T10:30:00", "MDY")).toBe("2026-06-05"));
  it("MDY slashes", () => expect(parseDate("6/5/2026", "MDY")).toBe("2026-06-05"));
  it("MDY two-digit year", () => expect(parseDate("6/5/26", "MDY")).toBe("2026-06-05"));
  it("DMY", () => expect(parseDate("5/6/2026", "DMY")).toBe("2026-06-05"));
  it("DMY dots", () => expect(parseDate("05.06.2026", "DMY")).toBe("2026-06-05"));
  it("dashes MDY", () => expect(parseDate("06-05-2026", "MDY")).toBe("2026-06-05"));
  it("year first with slashes", () => expect(parseDate("2026/06/05", "MDY")).toBe("2026-06-05"));
  it("month name", () => expect(parseDate("Jun 5, 2026", "MDY")).toBe("2026-06-05"));
  it("day month name", () => expect(parseDate("5 Jun 2026", "DMY")).toBe("2026-06-05"));
  it("dd-Mon-yy", () => expect(parseDate("05-Jun-26", "MDY")).toBe("2026-06-05"));
  it("compact yyyymmdd", () => expect(parseDate("20260605", "MDY")).toBe("2026-06-05"));
  it("compact mmddyyyy", () => expect(parseDate("06052026", "MDY")).toBe("2026-06-05"));
  it("ordinal", () => expect(parseDate("Jun 5th, 2026", "MDY")).toBe("2026-06-05"));
  it("invalid month", () => expect(parseDate("13/13/2026", "MDY")).toBeNull());
  it("invalid day", () => expect(parseDate("02/30/2026", "MDY")).toBeNull());
  it("leap day valid", () => expect(parseDate("02/29/2024", "MDY")).toBe("2024-02-29"));
  it("leap day invalid", () => expect(parseDate("02/29/2026", "MDY")).toBeNull());
  it("garbage", () => expect(parseDate("hello", "MDY")).toBeNull());
  it("empty", () => expect(parseDate("", "MDY")).toBeNull());
  it("1900s two-digit year", () => expect(parseDate("6/5/99", "MDY")).toBe("1999-06-05"));
});

describe("detectDateOrder", () => {
  it("detects DMY when first part exceeds 12", () =>
    expect(detectDateOrder(["01/06/2026", "25/06/2026"])).toBe("DMY"));
  it("detects MDY when second part exceeds 12", () =>
    expect(detectDateOrder(["06/01/2026", "06/25/2026"])).toBe("MDY"));
  it("detects YMD", () => expect(detectDateOrder(["2026-06-01", "2026-06-02"])).toBe("YMD"));
  it("defaults to MDY on ambiguity", () =>
    expect(detectDateOrder(["01/02/2026", "03/04/2026"])).toBe("MDY"));
  it("handles empty input", () => expect(detectDateOrder([])).toBe("MDY"));
});

describe("format helpers", () => {
  it("ofx date", () => expect(isoToOfxDate("2026-06-05")).toBe("20260605120000"));
  it("qif date", () => expect(isoToQifDate("2026-06-05")).toBe("06/05/2026"));
});
