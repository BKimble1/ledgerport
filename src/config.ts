/** Central product configuration — change values here, never inline. */
export const APP_VERSION = "1.2.0";

export const SUPPORT_EMAIL = "support@ledgerport.app"; // single replaceable support address

export const PRICING = {
  /** Current launch state: everything free. */
  launchFree: true,
  /** Planned one-time price per verified export (USD). */
  perExport: 9,
  /** Planned professional subscription (USD / month). */
  proMonthly: 24,
  /** Planned annual alternative (USD / year). */
  proYearly: 29,
};

export const LIMITS = {
  maxFileBytes: 20 * 1024 * 1024,
  previewRows: 200,
  dupHistoryMax: 20000,
};
