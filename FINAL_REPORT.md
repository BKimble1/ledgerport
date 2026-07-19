# FINAL REPORT — Ledgerport

## 1. Executive summary

Built, tested, and deployed **Ledgerport**, a local-first web app that converts bank/credit-card
CSV exports into import-ready **.QBO** (QuickBooks Web Connect), **.OFX**, **.QIF**, and clean-CSV
files entirely in the browser. The complete workflow (upload → auto-map → preview/validate →
export → layout remembered) is working and was verified end-to-end against the production build,
including a real .qbo file saved to disk and a live deployed smoke test. 102/102 unit tests pass;
typecheck and production build are clean. The only step between the repo and a public URL is a
5-minute owner login + drag-drop (no deployment credentials exist in this environment).

## 2–4. Product, customer, problem

- **Product:** Ledgerport (repo: `C:\Users\Admin\ledgerport`)
- **Customer:** bookkeepers, accountants, and small-business owners on QuickBooks Desktop,
  Quicken, Xero, or GnuCash whose banks only export CSV.
- **Problem:** QuickBooks Desktop cannot import CSV bank transactions — only .QBO Web Connect
  files. Users must re-key transactions, pay $25–39/month for converter SaaS, or upload financial
  statements to free ad-supported converter servers.

## 5. Evidence

- Intuit's own documentation confirms Desktop imports only Web Connect files; QuickBooks Community
  threads repeatedly ask for direct CSV import.
- Paying competitors prove willingness to pay: MoneyThumb ($25/mo), DocuClipper ($39/mo),
  ProperSoft (~$60). Free web competitors (toqbo.com, statementextract.com) require uploading
  statements to their servers — the privacy gap Ledgerport exploits.
- Classified honestly: competitor pricing = verified; complaint volume = strong indication;
  privacy-motivated switching = reasonable inference (untested).

## 6. Product promise

Turn any bank CSV into a clean, import-ready QBO/OFX/QIF file in under a minute — without your
financial data ever leaving your device.

## 7. Core functionality (all implemented, none mocked)

Drag-drop/file/paste/sample input · automatic column detection (headers + data sampling, incl.
headerless files and preamble rows) · date auto-detection MDY/DMY/YMD with override, month-name
and compact forms · amount parsing (parentheses, trailing minus, currency symbols, thousands
separators, European decimals, debit/credit twin columns, sign flip) · live preview with totals ·
every unparseable row listed with row number and reason · unique stable FITIDs · OFX 32-char NAME
truncation with MEMO overflow · checking/savings/credit-card message sets · INTU.BID control with
in-app guidance · per-layout mapping presets in localStorage · offline-capable static page.

## 8. Architecture

Vite + React + TypeScript static SPA. All conversion logic is pure, dependency-free TypeScript in
`src/lib/` (PapaParse only for CSV tokenization). No backend, no accounts, no analytics, no env
vars. Two UI components: `App.tsx` (landing/FAQ/pricing/privacy), `Converter.tsx` (workflow).

## 9. Repository state

Git repo at `C:\Users\Admin\ledgerport`, clean meaningful commits. Key paths: `src/lib/*` engine +
tests, `src/Converter.tsx` workflow UI, `netlify.toml`/`vercel.json` deploy configs, `README.md`
setup, `LAUNCH.md` sales kit, `HUMAN_ACTIONS.md` owner steps, `STATE.md`/`DECISIONS.md` memory.

## 10. Local setup

`npm install` → `npm run dev` (http://localhost:5199). Verified working. Prod: `npm run build`
→ `npm run preview`.

## 11. Deployment

- **Live now (smoke-tested):** https://claude.ai/code/artifact/8427256a-23db-4957-87aa-c9be9c3f8747
  (single-file build; private to owner until shared from the page's Share menu).
- **Public hosting:** repo is deploy-ready for Netlify/Vercel with security headers (CSP,
  nosniff, frame-deny) preconfigured; blocked only on owner login — exact steps in
  HUMAN_ACTIONS.md. Production build verified locally in preview mode.

## 12–13. Testing performed & results

- **Unit:** 102/102 pass (amount 33, dates 28, convert 18, formats 23) — `npx vitest run`.
- **Typecheck:** `tsc --noEmit` clean. **Prod build:** clean (64 kB gzip).
- **Browser (production build, Chrome):** sample flow end-to-end; **.qbo file downloaded and
  verified on disk** (correct OFX 1.02 SGML header, INTU.BID, accounts, amounts); OFX validated
  well-formed via DOMParser (8/8 transactions); empty-paste and single-column error states;
  semicolon-delimited European DMY debit/credit CSV incl. live remap to debit/credit mode with
  correct signs; bad rows listed with reasons; preset save/recall across reloads; 375 px layout
  (no horizontal overflow, table scrolls internally); keyboard operation (visible focus, Enter
  activates); zero console errors.
- **Deployed artifact:** loads, renders, and completed the sample workflow via keyboard.
- **Known test-environment caveat:** Chrome blocked *automated* second downloads per origin
  (extension clicks aren't trusted gestures), so only the .qbo download was disk-verified; the
  other three formats share the same download path and their generators are unit-tested.

## 14. Security & privacy review

No secrets exist or are used (git history checked; no env vars). No network calls with user data;
no dangerouslySetInnerHTML (React escaping covers CSV-content XSS); OFX/QIF outputs escape/strip
control characters; localStorage reads are try/catch-guarded and schema-tolerant; 20 MB file
guard; CSP + nosniff + frame-deny headers configured for both hosts. No compliance claims made
anywhere; privacy copy states only what the architecture enforces.

## 15. Known limitations

- QuickBooks Desktop validates INTU.BID against its bank directory; some setups must enter their
  bank's BID (in-app Advanced panel + FAQ cover this). Not verifiable without a QuickBooks license.
- Single file per conversion (batch is the planned Pro feature). English-only UI.
- Presets are per-browser (no sync). PDF statements are out of scope by design.

## 16. Pricing hypothesis

Free during launch → Pro $29/year (batch, preset sync, priority support). Undercuts $25–39/mo
competitors; core single-file conversion stays free (trust anchor for the privacy positioning).

## 17. Sales & launch strategy

Full kit in LAUNCH.md: positioning, forum-answer skeleton for QuickBooks Community/r/Bookkeeping,
launch announcement, directory listings (AlternativeTo vs MoneyThumb/ProperSoft), 60-second demo
video script hook, first-10-customers and first-30-days plans, cookie-less metrics plan.

## 18. Operating cost

$0 (static hosting free tier; no APIs, no inference, no storage).

## 19. Human actions required

See HUMAN_ACTIONS.md — (1) 5-minute Netlify drag-drop deploy of `dist/`, (2) optional domain
purchase, (3) optional Stripe Payment Link when Pro exists, (4) legal review of terms draft.

## 20. Recommended next steps

1. Deploy publicly and post the LAUNCH.md forum answers where CSV-import questions recur.
2. Collect real bank CSVs that fail auto-mapping; add built-in presets for the top layouts.
3. Test one import into an actual QuickBooks Desktop instance (needs a license) to close the
   INTU.BID uncertainty.
4. Build batch conversion, then (and only then) attach the $29/yr Payment Link.
