import Converter from "./Converter";

const FAQ: Array<{ q: string; a: JSX.Element }> = [
  {
    q: "Is my bank data uploaded anywhere?",
    a: (
      <p>
        No. Ledgerport is a static page — the conversion runs entirely in your browser using
        JavaScript. Your CSV never leaves your device, there is no server that could receive it, no
        account to create, and no analytics watching what you convert. You can even load the page,
        disconnect from the internet, and convert offline.
      </p>
    ),
  },
  {
    q: "Why can't QuickBooks Desktop just import my CSV?",
    a: (
      <p>
        QuickBooks Desktop only accepts bank transactions through Web Connect <code>.qbo</code>{" "}
        files. If your bank only offers CSV export (or you only have CSV for older months), you need a
        converter. That's the exact gap Ledgerport fills.
      </p>
    ),
  },
  {
    q: "QuickBooks rejected my .qbo file — what now?",
    a: (
      <p>
        The usual cause is the <code>INTU.BID</code> — an Intuit bank identifier QuickBooks validates
        inside every .qbo file. Open <em>Advanced: QuickBooks bank identity</em> in step 2 and enter
        your own bank's BID (searchable online as "INTU.BID list"). Also make sure the file's account
        type (checking vs. credit card) matches the QuickBooks account you're importing into.
      </p>
    ),
  },
  {
    q: "Which date and amount formats are supported?",
    a: (
      <p>
        Dates: US and international orders (06/25/2026, 25/06/2026, 2026-06-25, 25-Jun-26, "Jun 25,
        2026" and more), auto-detected with a manual override. Amounts: negatives as{" "}
        <code>-45.00</code>, <code>(45.00)</code> or <code>45.00-</code>, currency symbols, thousands
        separators, European <code>1.234,56</code> style, and separate debit/credit columns.
      </p>
    ),
  },
  {
    q: "What happens to rows that can't be parsed?",
    a: (
      <p>
        They are never silently dropped into your export. The preview counts every skipped row and
        lists each one with its row number and the reason, so you can fix the CSV or the column
        mapping before downloading.
      </p>
    ),
  },
  {
    q: "Does it remember my bank's layout?",
    a: (
      <p>
        Yes. When you export, the column mapping and account settings are saved in your browser's
        local storage, keyed to that CSV's header row. Next month's statement from the same bank is
        recognized and mapped automatically. This data also stays on your device.
      </p>
    ),
  },
];

export default function App() {
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <a className="wordmark" href="#top" aria-label="Ledgerport home">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="#0e7a5f" />
              <path d="M8 7v15h13" stroke="#faf9f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 14l4 4 6-8" stroke="#faf9f6" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Ledgerport
          </a>
          <nav className="header-nav" aria-label="Site">
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
            <a href="#pricing">Pricing</a>
            <a href="#privacy">Privacy</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero wrap">
          <span className="privacy-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" fill="currentColor" />
            </svg>
            100% in your browser — your data never leaves this device
          </span>
          <h1>Turn any bank CSV into a QuickBooks-ready file</h1>
          <p className="sub">
            Convert bank and credit-card CSV exports to <strong>.QBO</strong>, <strong>.OFX</strong>,{" "}
            <strong>.QIF</strong>, or clean CSV — with smart column mapping, date and amount
            normalization, and nothing uploaded to anyone's server.
          </p>
          <Converter />
        </section>

        <section className="band" id="how">
          <div className="wrap">
            <h2>How it works</h2>
            <div className="steps">
              <div className="step">
                <span className="step-n">STEP 1</span>
                <h3>Drop in your CSV</h3>
                <p>
                  Any bank or card export — messy headers, debit/credit columns, parentheses
                  negatives, international dates. Ledgerport reads them all.
                </p>
              </div>
              <div className="step">
                <span className="step-n">STEP 2</span>
                <h3>Check the mapping</h3>
                <p>
                  Columns are detected automatically. Fix anything with two clicks and watch the
                  preview update live, with every unparseable row flagged.
                </p>
              </div>
              <div className="step">
                <span className="step-n">STEP 3</span>
                <h3>Download &amp; import</h3>
                <p>
                  Export .QBO for QuickBooks Desktop, .OFX for Xero/GnuCash, .QIF for Quicken, or a
                  clean CSV for QuickBooks Online — then import as usual.
                </p>
              </div>
              <div className="step">
                <span className="step-n">EVERY MONTH AFTER</span>
                <h3>It remembers</h3>
                <p>
                  Your bank's layout is saved on your device. Next statement, the mapping applies
                  itself — conversion takes seconds.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="faq">
          <div className="wrap">
            <h2>Frequently asked questions</h2>
            {FAQ.map(({ q, a }) => (
              <details className="faq-item" key={q}>
                <summary>{q}</summary>
                {a}
              </details>
            ))}
          </div>
        </section>

        <section className="band" id="pricing">
          <div className="wrap">
            <h2>Pricing</h2>
            <div className="pricing-note">
              <div className="price">Free during launch</div>
              <p>
                Every format, every feature, no signup. A paid tier (batch conversion of multiple
                files, synced mapping presets, priority support) is planned at{" "}
                <strong>$29/year</strong> — a fraction of the $25–39 <em>per month</em> that
                server-based converters charge. Converting your own statements will always work
                without an account.
              </p>
            </div>
          </div>
        </section>

        <section className="band" id="privacy">
          <div className="wrap">
            <h2>Privacy</h2>
            <p style={{ maxWidth: 760, color: "var(--ink-soft)" }}>
              Ledgerport has no backend, no database, no cookies, no analytics, and no way to see
              your data. Files are parsed in your browser's memory and downloads are generated on
              your device. The only thing stored is your own column-mapping preferences, kept in your
              browser's local storage, which you control and can clear at any time. Financial
              statements are sensitive — the safest place for them is the device they're already on.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <span>© 2026 Ledgerport · Operated by Idlery Services LLC</span>
          <span>
            Not affiliated with Intuit, QuickBooks, or Quicken. QuickBooks and Quicken are trademarks
            of their respective owners.
          </span>
        </div>
      </footer>
    </>
  );
}
