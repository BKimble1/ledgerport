# STATE

**Product:** Ledgerport — convert bank/credit-card CSV exports to QBO / OFX / QIF entirely in the browser (files never leave the device).
**Customer:** Bookkeepers, accountants, and small-business owners whose bank only exports CSV but whose accounting software (QuickBooks Desktop, Quicken, Xero, GnuCash) needs QBO/OFX/QIF.
**Promise:** Turn any bank CSV into a clean, import-ready QBO/OFX/QIF file in under a minute, with zero upload.

**Phase:** COMPLETE — final report written.
**Milestones done:** research, selection, scaffold, core engine (csv/amount/date/ofx/qif) + 102 passing tests, full UI (upload→map→preview→export), mapping presets (localStorage), landing/FAQ/privacy, prod build, browser smoke tests (happy path, QBO file verified on disk, OFX XML well-formedness, invalid/empty CSV errors, DMY+European+debit/credit remap, mobile 375px, keyboard nav), deploy configs, single-file build → live Artifact (smoke-tested): https://claude.ai/code/artifact/8427256a-23db-4957-87aa-c9be9c3f8747
**Blockers:** none for local; public deploy needs owner login (Netlify drag-drop of dist/) — see HUMAN_ACTIONS.md.
**Next highest-value action:** owner deploys `dist/` to Netlify (drag-drop) and points a domain at it.
**Known critical defects:** none known.

**Commands**
- dev: `npm run dev` (port 5199)
- test: `npm test` (vitest run — 102 tests)
- typecheck: `npm run typecheck`
- build: `npm run build` → dist/
- preview prod: `npm run preview` (port 5199)
- single-file build: `npm run build:single` → dist-single/ledgerport.html (Artifact-ready)
