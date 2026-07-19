# Ledgerport Execution Ledger

## Architecture (audited — built this session)
Vite+React+TS static SPA, hash routing. Engine: src/lib/{convert,amount,dates,ofx,qif,filetype,presets}.ts (pure, tested).
UI: App.tsx (landing+routes), Converter.tsx (workflow), pages.tsx. Vitest (111 green). Deployed: GitHub Pages
(BKimble1/ledgerport, CI on master). No backend/analytics/env vars. Preview :5199.

## Plan (priority order)
- [x] config.ts (version/support/pricing central)
- [x] money.ts — integer-cents arithmetic + tests
- [x] amount.ts — CR/DR indicators + tests
- [x] dates.ts — Excel serial dates (column-gated) + tests
- [x] convert.ts — balance col, raw row retention, summary-row auto-exclude, cents, flags + tests
- [x] dupes.ts — in-file exact/possible dups + hashed local export-history firewall + tests
- [x] analyze.ts — detection confidence (nonfinancial guard), reconciliation (+balance proof), preflight verdict + tests
- [x] report.ts — Conversion Proof Report (HTML, sha-256, masked acct) ; diagnostics.ts (privacy-safe support export)
- [x] csv formula-injection guard (qif.ts cleanCsv) + filename sanitize + tests
- [x] presets.ts — named profiles, list/delete/export/import (no txn data) + tests
- [x] Converter.tsx redesign: preflight-first hierarchy, reconciliation card, attention/review section incl. dup review,
      confidence badges, needs-review filter + original-row inspection, proof report download, diagnostics
- [x] App.tsx hero/copy upgrade ("verified, duplicate-free imports"), FAQ additions, footer links
- [x] pages.tsx: Refunds page; privacy verify-it section
- [x] SEO: public/guides/*.html (6 honest guides), sitemap.xml, robots.txt, OG/canonical meta
- [x] Full test suite + build + browser E2E passes (178 tests green; E2E: rich-file preflight/balance-proof
      include-loop, export→proof-report capture, firewall re-import block, nonfinancial guard, pages, guides,
      mobile-375 no-overflow, zero console errors)
- [x] Audits: financial correctness, dup-risk, privacy/network, a11y, mobile, copy truthfulness
- [x] Deploy + live smoke test; final report

## Decisions
- All totals in integer cents (float only at parse/display edges).
- Dup history = hashed fingerprints in localStorage (not IndexedDB — scale is small; simpler = safer), opt-out + clear.
- Payments: NOT implemented as live checkout — GitHub Pages has no server; fake checkout violates no-fake-buttons rule.
  Centralized pricing config + honest "free during launch" + documented Stripe path (docs/PAYMENTS.md).
- PWA/worker/virtualization: skipped (5k rows = 185 ms; preview capped 200). Documented as limitation.
- Rescue mode: partial via filetype detection + guides; full parser of foreign QBO out of scope.

## Test commands
npm test | npm run typecheck | npm run build | npm run preview (:5199)

## Known failures
(none)
