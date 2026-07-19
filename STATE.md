# STATE

**Product:** Ledgerport — convert bank/credit-card CSV exports to QBO / OFX / QIF entirely in the browser (files never leave the device).
**Customer:** Bookkeepers, accountants, and small-business owners whose bank only exports CSV but whose accounting software (QuickBooks Desktop, Quicken, Xero, GnuCash) needs QBO/OFX/QIF.
**Promise:** Turn any bank CSV into a clean, import-ready QBO/OFX/QIF file in under a minute, with zero upload.

**Phase:** COMPLETE — final report written.
**Milestones done:** research, selection, scaffold, core engine + 111 passing tests, full UI (upload→map→preview→export), mapping presets, landing/FAQ/pricing, REAL pages (#/guide import guides, #/privacy, #/terms) with hash routing + footer nav, Excel/PDF/QBO/QIF-file friendly rejection, sandbox-aware export fallback (Copy / Save-as / re-download strip — fixes downloads inside embedded previews like the Artifact), UI polish (blur header, shadows, hover states, reduced-motion), prod build, browser tests (file-input path with real File objects, 5000-row file → 703 KB QBO verified on disk in 185 ms, tab-delimited debit/credit auto-detect, xlsx/pdf/qbo rejections, pages routing, clipboard copy, mobile 375px, keyboard, zero console errors), Artifact v1.1 republished + interactivity confirmed.
**Blockers:** none for local; public deploy needs owner login (Netlify drag-drop of dist/) — see HUMAN_ACTIONS.md.
**Next highest-value action:** owner deploys `dist/` to Netlify (drag-drop) and points a domain at it.
**Known critical defects:** none known.

**Commands**
- dev: `npm run dev` (port 5199)
- test: `npm test` (vitest run — 111 tests)
- typecheck: `npm run typecheck`
- build: `npm run build` → dist/
- preview prod: `npm run preview` (port 5199)
- single-file build: `npm run build:single` → dist-single/ledgerport.html (Artifact-ready)
