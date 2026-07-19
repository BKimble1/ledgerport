import { type ReactNode } from "react";

function Page({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="wrap page">
      <a className="btn btn-ghost back-link" href="#top">
        ← Back to the converter
      </a>
      <h1>{title}</h1>
      <p className="page-intro">{intro}</p>
      {children}
    </div>
  );
}

export function GuidePage() {
  return (
    <Page
      title="Import guides"
      intro="You've downloaded your converted file — here's exactly where it goes in each accounting tool."
    >
      <section className="guide">
        <h2>QuickBooks Desktop (.qbo)</h2>
        <ol>
          <li>In QuickBooks, open <strong>File → Utilities → Import → Web Connect Files…</strong></li>
          <li>Select the <code>.qbo</code> file you downloaded from Ledgerport.</li>
          <li>When asked, link the file to an existing bank account (or create one) and click <strong>Continue</strong>.</li>
          <li>Review the downloaded transactions in the <strong>Bank Feeds Center</strong> and add them to your register.</li>
        </ol>
        <p className="notice notice-warn">
          If QuickBooks says the bank isn't recognized, open the{" "}
          <em>Advanced: QuickBooks bank identity</em> panel in step 2 of the converter and enter your
          bank's INTU.BID, then re-export. See the FAQ on the home page for details.
        </p>
      </section>
      <section className="guide">
        <h2>QuickBooks Online (clean .csv)</h2>
        <ol>
          <li>Export the <strong>Clean .CSV</strong> from Ledgerport (4-column layout: Date, Description, Credit, Debit).</li>
          <li>In QuickBooks Online, go to <strong>Transactions → Bank transactions → Link account ▾ → Upload from file</strong>.</li>
          <li>Choose the CSV, pick the account, and map the columns when prompted (they match the headers exactly).</li>
        </ol>
      </section>
      <section className="guide">
        <h2>Quicken (.qif)</h2>
        <ol>
          <li>Open <strong>File → File Import → QIF File…</strong></li>
          <li>Choose the <code>.qif</code> file and the account to import into.</li>
          <li>Quicken Windows hides QIF import for some account types on newer versions — if so, import into a cash account first, then move the transactions.</li>
        </ol>
      </section>
      <section className="guide">
        <h2>Xero (.ofx)</h2>
        <ol>
          <li>Go to <strong>Accounting → Bank accounts</strong>, pick the account, then <strong>Manage Account → Import a Statement</strong>.</li>
          <li>Upload the <code>.ofx</code> file. Xero reads the dates, amounts, and payees directly.</li>
        </ol>
      </section>
      <section className="guide">
        <h2>GnuCash (.ofx or .qif)</h2>
        <ol>
          <li>Open <strong>File → Import → Import OFX/QFX…</strong> (or <em>Import QIF…</em>).</li>
          <li>Select the file and follow the matcher to assign accounts.</li>
        </ol>
      </section>
      <section className="guide">
        <h2>Wave, Banktivity, MoneyMoney, YNAB4</h2>
        <p>
          All accept <code>.ofx</code> (YNAB4 also takes <code>.qif</code>). Look for an
          "Import statement" or "Import transactions" option in the account menu.
        </p>
      </section>
    </Page>
  );
}

export function PrivacyPage() {
  return (
    <Page
      title="Privacy policy"
      intro="The short version: Ledgerport cannot see your data, so it cannot collect, share, or lose it."
    >
      <section className="legal">
        <h2>What happens to your files</h2>
        <p>
          Ledgerport is a static web page. When you load a CSV, it is read and converted by
          JavaScript running in your browser, on your device. The file's contents are never
          transmitted to Ledgerport, to a server, or to any third party. There is no backend that
          could receive them. You can verify this by opening your browser's network tools while
          converting, or by going offline after the page loads — conversion still works.
        </p>
        <h2>What we store</h2>
        <p>
          When you export a file, your column-mapping choices and account settings are saved in
          your browser's local storage so the same bank layout is recognized next time. This data
          stays on your device. Clear it any time via your browser's site-data settings, or it
          disappears entirely if you clear browsing data.
        </p>
        <h2>What we don't do</h2>
        <ul>
          <li>No accounts, no sign-up, no email collection.</li>
          <li>No cookies, no analytics scripts, no advertising, no fingerprinting.</li>
          <li>No third-party requests with your data in them.</li>
        </ul>
        <h2>Hosting</h2>
        <p>
          Like any website, the host that serves the page may keep standard access logs (IP
          address, time, page requested) for security and capacity purposes. Those logs never
          contain your file contents, which do not leave your device.
        </p>
        <h2>Contact</h2>
        <p>
          Ledgerport is operated by Idlery Services LLC. Questions about this policy: contact the
          operator through the support channel listed where you obtained this tool.
        </p>
        <p className="legal-meta">Last updated July 19, 2026.</p>
      </section>
    </Page>
  );
}

export function TermsPage() {
  return (
    <Page
      title="Terms of use"
      intro="Plain-language terms for using Ledgerport."
    >
      <section className="legal">
        <h2>The service</h2>
        <p>
          Ledgerport converts transaction files between formats in your browser. It is provided
          free of charge during launch, as-is and as-available, without warranties of any kind.
        </p>
        <h2>Your data, your responsibility</h2>
        <p>
          Because conversion happens on your device, you keep full possession of your data — and
          full responsibility for it. Always review the preview and your accounting software's
          import screen before accepting transactions. Ledgerport is a formatting tool; it is not
          accounting, tax, or financial advice, and it does not verify that your bank's export is
          complete or correct.
        </p>
        <h2>Acceptable use</h2>
        <p>
          Use Ledgerport only with data you are entitled to process. Don't attempt to abuse,
          disrupt, or misrepresent the service.
        </p>
        <h2>Liability</h2>
        <p>
          To the maximum extent permitted by law, Idlery Services LLC's total liability arising
          from your use of Ledgerport is limited to the amount you paid for it (currently zero).
          Some jurisdictions don't allow certain limitations, so parts of this section may not
          apply to you.
        </p>
        <h2>Age</h2>
        <p>Ledgerport is intended for users 16 and older.</p>
        <h2>Changes</h2>
        <p>
          These terms may be updated as the product evolves; the "last updated" date below will
          change when they do. Continued use after a change means you accept the updated terms.
        </p>
        <p className="legal-meta">Last updated July 19, 2026. Operated by Idlery Services LLC.</p>
      </section>
    </Page>
  );
}
