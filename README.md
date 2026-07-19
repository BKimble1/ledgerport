# Ledgerport

**Live: https://bkimble1.github.io/ledgerport/**

Convert bank and credit-card CSV exports to **.QBO** (QuickBooks Web Connect), **.OFX**, **.QIF**,
or clean CSV — entirely in the browser. No uploads, no accounts, no backend.

**Who it's for:** bookkeepers, accountants, and small-business owners whose bank only exports CSV
but whose accounting software (QuickBooks Desktop, Quicken, Xero, GnuCash) needs QBO/OFX/QIF.

## Features

- Drag-and-drop, file picker, or paste CSV text; labeled sample data included
- Automatic column detection (date, description, amount or debit/credit, memo, check #)
- Date handling: MDY / DMY / YMD auto-detection with manual override, month-name and compact forms
- Amount handling: `-45.00`, `(45.00)`, `45.00-`, `$1,234.56`, European `1.234,56`, debit/credit twins, sign flip
- Live preview with money-in/out totals; every unparseable row listed with row number and reason — nothing silently dropped
- Per-file-unique, stable FITIDs (safe re-imports); OFX 32-char NAME limit handled with MEMO overflow
- Checking / savings / credit-card account types (correct OFX message sets for each)
- Column mappings + account settings remembered per CSV layout (localStorage only)
- Zero network calls with data in flight — works offline once loaded

## Commands

```bash
npm install
npm run dev          # dev server on http://localhost:5199
npm test             # vitest unit suite (parsers + format generators)
npm run typecheck    # tsc --noEmit
npm run build        # production build -> dist/
npm run preview      # serve the production build on :5199
npm run build:single # one self-contained HTML file -> dist-single/
```

No environment variables are required or used.

## Deploy

Static site — any static host works. `netlify.toml` and `vercel.json` are included (build already
configured, security headers set). Fastest path: `npm run build`, then drag the `dist/` folder onto
Netlify's deploy drop zone.

## Architecture

Vite + React + TypeScript. All conversion logic is dependency-free pure functions in `src/lib/`
(`convert.ts`, `amount.ts`, `dates.ts`, `ofx.ts`, `qif.ts`) covered by the unit suite; PapaParse
handles CSV tokenization; the UI is two components (`App.tsx` landing, `Converter.tsx` workflow).

## Format notes

- `.qbo` is OFX 1.02 SGML plus Intuit's `INTU.BID` tag. QuickBooks Desktop validates the BID against
  its bank directory; the app defaults to `3000` and lets users set their bank's BID (Advanced panel).
- `.ofx` is OFX 2.1.1 XML (no INTU.BID).
- `.qif` follows the Quicken interchange spec (`!Type:Bank` / `!Type:CCard`).
- Clean CSV uses the 4-column layout QuickBooks Online imports directly.
