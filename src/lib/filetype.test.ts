import { describe, expect, it } from "vitest";
import { checkFileSupported } from "./filetype";

describe("checkFileSupported", () => {
  it("accepts normal CSV", () =>
    expect(checkFileSupported("statement.csv", "Date,Description,Amount\n07/01/2026,X,-1.00")).toBeNull());
  it("accepts tab-delimited txt", () =>
    expect(checkFileSupported("bank.txt", "Date\tPayee\tDebit\tCredit")).toBeNull());
  it("rejects xlsx by extension", () =>
    expect(checkFileSupported("statement.xlsx", "garbage")).toMatch(/Excel/));
  it("rejects xlsx by ZIP magic even with csv extension", () =>
    expect(checkFileSupported("statement.csv", "PKrest")).toMatch(/Excel/));
  it("rejects PDF by magic", () =>
    expect(checkFileSupported("statement.csv", "%PDF-1.7 ...")).toMatch(/PDF/));
  it("rejects an existing QBO/OFX file with guidance", () =>
    expect(checkFileSupported("download.qbo", "OFXHEADER:100\nDATA:OFXSGML")).toMatch(/directly/));
  it("rejects OFX content sniffed in a txt", () =>
    expect(checkFileSupported("x.txt", "junk <OFX> junk")).toMatch(/QBO\/OFX/));
  it("rejects an existing QIF file", () =>
    expect(checkFileSupported("moves.qif", "!Type:Bank\nD07/01/2026")).toMatch(/QIF/));
  it("rejects images by extension", () =>
    expect(checkFileSupported("scan.png", "PNG")).toMatch(/CSV/));
});
