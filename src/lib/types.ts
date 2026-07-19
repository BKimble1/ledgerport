export type AccountType = "CHECKING" | "SAVINGS" | "CREDITCARD";

export type AmountMode = "single" | "debitCredit";

export interface ColumnMapping {
  /** index of the date column (required) */
  date: number;
  /** description / payee column (required) */
  description: number;
  amountMode: AmountMode;
  /** signed amount column when amountMode === "single" */
  amount: number;
  /** debit (money out) column when amountMode === "debitCredit" */
  debit: number;
  /** credit (money in) column when amountMode === "debitCredit" */
  credit: number;
  /** optional memo column (-1 = none) */
  memo: number;
  /** optional check-number column (-1 = none) */
  checkNumber: number;
  /** flip the sign of every amount (bank exported deposits as negative, etc.) */
  flipSign: boolean;
  /** date format id from dates.ts, or "auto" */
  dateFormat: string;
}

export interface Transaction {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** signed: negative = money out */
  amount: number;
  description: string;
  memo: string;
  checkNumber: string;
  /** unique per file, stable per row */
  fitid: string;
}

export interface RowIssue {
  /** 0-based data-row index (excludes header) */
  row: number;
  field: "date" | "amount" | "description" | "row";
  message: string;
}

export interface ConversionResult {
  transactions: Transaction[];
  issues: RowIssue[];
  /** rows skipped because they were entirely empty */
  skippedEmpty: number;
}

export interface AccountSettings {
  accountType: AccountType;
  currency: string;
  /** account number / identifier written into the file */
  accountId: string;
  /** bank routing number (bank accounts only) */
  bankId: string;
  /** Intuit bank identifier required inside .qbo files */
  intuBid: string;
  /** FI ORG label */
  org: string;
  /** FI FID */
  fid: string;
}

export const DEFAULT_ACCOUNT: AccountSettings = {
  accountType: "CHECKING",
  currency: "USD",
  accountId: "",
  bankId: "",
  intuBid: "3000",
  org: "Ledgerport",
  fid: "3000",
};
