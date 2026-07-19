import { useEffect, useState } from "react";
import Converter from "./Converter";
import { PRICING } from "./config";
import { GuidePage, PrivacyPage, RefundsPage, TermsPage } from "./pages";

type Route = "home" | "guide" | "privacy" | "terms" | "refunds";

function currentRoute(): Route {
  const h = window.location.hash;
  if (h.startsWith("#/guide")) return "guide";
  if (h.startsWith("#/privacy")) return "privacy";
  if (h.startsWith("#/terms")) return "terms";
  if (h.startsWith("#/refunds")) return "refunds";
  return "home";
}

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
        Drop the rejected .qbo straight back into Ledgerport — <strong>Import Rescue Mode</strong>{" "}
        reads it, diagnoses the common causes (missing INTU.BID, duplicate transaction IDs, unescaped
        characters, malformed structure), and regenerates a clean file. The most frequent culprit is
        the <code>INTU.BID</code> bank identifier: open <em>Advanced: QuickBooks bank identity</em>{" "}
        and enter your bank's BID (searchable online as "INTU.BID list"). Also make sure the account
        type (checking vs. credit card) matches the QuickBooks account.
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
    q: "How does the duplicate firewall work?",
    a: (
      <p>
        Inside one file, identical rows are flagged and excluded automatically. Across conversions,
        Ledgerport keeps a local history of <em>hashed fingerprints</em> of what you've already
        exported — if next month's download overlaps last month's, the overlap is caught before it
        reaches QuickBooks. The history is one-way hashes stored only in your browser: it can't be
        turned back into transactions, you can clear it any time, and you can turn it off entirely.
      </p>
    ),
  },
  {
    q: "What is the conversion proof report?",
    a: (
      <p>
        A printable record generated with every export: SHA-256 fingerprints of the source and output
        files, the column mapping used, money in/out and net movement in exact cents, the date range,
        every excluded row with its reason, and the preflight findings. Bookkeepers can file it with
        the client's records as evidence of what was converted and why. Account numbers are masked.
      </p>
    ),
  },
  {
    q: "What does 'balance proof' mean?",
    a: (
      <p>
        If your CSV has a running-balance column, Ledgerport checks that the opening balance plus the
        net of all transactions equals the closing balance — the same check an auditor would do. If a
        row is missing or misread, the proof fails and tells you, instead of letting an incomplete
        import into your books.
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
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onHash = () => {
      const r = currentRoute();
      setRoute(r);
      if (r !== "home" || window.location.hash === "#top" || window.location.hash === "") {
        window.scrollTo({ top: 0 });
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const nav =
    route === "home" ? (
      <nav className="header-nav" aria-label="Site">
        <a href="#how">How it works</a>
        <a href="#faq">FAQ</a>
        <a href="#pricing">Pricing</a>
        <a href="#/guide">Import guides</a>
      </nav>
    ) : (
      <nav className="header-nav" aria-label="Site">
        <a href="#top">Converter</a>
        <a href="#/guide">Import guides</a>
        <a href="#/privacy">Privacy</a>
        <a href="#/terms">Terms</a>
      </nav>
    );

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
          {nav}
        </div>
      </header>

      {route === "guide" && (
        <main>
          <GuidePage />
        </main>
      )}
      {route === "privacy" && (
        <main>
          <PrivacyPage />
        </main>
      )}
      {route === "terms" && (
        <main>
          <TermsPage />
        </main>
      )}
      {route === "refunds" && (
        <main>
          <RefundsPage />
        </main>
      )}

      {route === "home" && (
      <main id="top">
        <section className="hero wrap">
          <span className="privacy-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" fill="currentColor" />
            </svg>
            100% in your browser — your data never leaves this device
          </span>
          <h1>Turn messy bank exports into verified QuickBooks imports</h1>
          <p className="sub">
            Ledgerport repairs malformed transactions, catches duplicates before they reach your books,
            reconciles your totals to the cent, and runs an import preflight — then exports{" "}
            <strong>.QBO</strong>, <strong>.OFX</strong>, <strong>.QIF</strong>, or clean CSV.
            All on your device; nothing is uploaded.
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
                <h3>Preflight &amp; reconcile</h3>
                <p>
                  Ledgerport auto-detects columns, excludes summary rows and duplicates, reconciles
                  totals in exact cents, and tells you whether the file is import-ready — before you
                  download anything.
                </p>
              </div>
              <div className="step">
                <span className="step-n">STEP 3</span>
                <h3>Export with proof</h3>
                <p>
                  Download .QBO, .OFX, .QIF, or clean CSV — plus a hash-stamped conversion proof
                  report recording totals, exclusions, and every change made.
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
                Every format and every assurance feature — preflight, reconciliation, duplicate
                firewall, proof reports — free while Ledgerport is in launch, no signup. Planned
                pricing: <strong>${PRICING.perExport}</strong> per verified export, or{" "}
                <strong>${PRICING.proMonthly}/month</strong> for professionals (unlimited exports,
                saved layouts, batch workflow) — a fraction of the $25–39/month that server-based
                converters charge for less verification. Converting your own statements will always
                work without an account, and files never touch a server either way.
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
            <p style={{ marginTop: "0.75rem" }}>
              <a href="#/privacy">Read the full privacy policy →</a>
            </p>
          </div>
        </section>
      </main>
      )}

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-left">
            <span>© 2026 Ledgerport · Operated by Idlery Services LLC</span>
            <nav className="footer-nav" aria-label="Footer">
              <a href="#/guide">Import guides</a>
              <a href="#/privacy">Privacy</a>
              <a href="#/terms">Terms</a>
              <a href="#/refunds">Refunds</a>
              <a href="guides/">Help articles</a>
            </nav>
          </div>
          <span className="footer-trademark">
            Not affiliated with Intuit, QuickBooks, or Quicken. QuickBooks and Quicken are trademarks
            of their respective owners.
          </span>
        </div>
      </footer>
    </>
  );
}
