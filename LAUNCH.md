# Ledgerport — Launch & Sales Kit

## Positioning

**One sentence:** Ledgerport turns any bank CSV into a QuickBooks-ready QBO/OFX/QIF file in your
browser — your financial data never leaves your device.

**Value proposition:** Server-based converters charge $25–39/month and require uploading bank
statements to someone else's server. Ledgerport does the same conversion locally, free during
launch, with better handling of the messy formats banks actually export.

**Target customer (in order):**
1. Bookkeepers/accountants who import client statements into QuickBooks Desktop monthly
2. Small-business owners reconciling accounts whose bank has no QBO/OFX export
3. Quicken/GnuCash/Xero users with CSV-only banks

## Pricing hypothesis

- Launch: free, no signup (build trust + word of mouth in bookkeeping communities)
- Later: **Pro $29/year** — batch multi-file conversion, synced mapping presets, priority support
- Rationale: undercuts MoneyThumb ($25/mo) and DocuClipper ($39/mo); matches the one-time-feel of
  ProperSoft (~$60) buyers. Core single-file conversion stays free forever (the privacy story
  collapses if the free tier is crippled).

## First 10 customers

1. Answer CSV-import questions on the QuickBooks Community forum and r/Bookkeeping / r/QuickBooks
   with a genuine walkthrough (link where rules allow; profiles where not).
2. Post a Show HN / r/smallbusiness launch note emphasizing the local-first privacy angle.
3. List on free directories: AlternativeTo (vs MoneyThumb/ProperSoft), Product Hunt.
4. Short YouTube/Loom demo: "Import a CSV into QuickBooks Desktop in 60 seconds" — the search
   phrase people actually type.
5. Email 5 bookkeeping newsletter authors offering the tool as a free resource (drafts below).

## First 30 days

- Week 1: launch posts + directories; watch for INTU.BID rejection reports (top support risk)
- Week 2–3: add the most-requested bank layouts as built-in presets; collect testimonials (real ones)
- Week 4: decide Pro tier scope from actual requests; only then wire up payments (Stripe Payment
  Link is enough — requires owner's Stripe account)

## Metrics plan (when a host is attached)

Privacy positioning forbids user-data analytics. Use server-side aggregate page counts only
(Netlify Analytics) — no cookies, no JS trackers. Success metric: repeat visits (proxy for monthly
statement conversions) and community-thread referrals.

## Outreach draft (forum answer skeleton)

> QuickBooks Desktop can't import CSV directly — it only accepts .QBO Web Connect files. Your
> options: re-key by hand, pay a converter subscription ($25–39/mo), or use a converter that runs
> in the browser so the statement never gets uploaded. I built a free one for exactly this:
> [link]. Drop the CSV in, check the column mapping, download the .qbo, then File → Utilities →
> Import → Web Connect in QuickBooks.

## Launch announcement draft

> **Ledgerport — convert bank CSVs to QuickBooks files without uploading them anywhere**
> Banks love exporting CSV; QuickBooks Desktop refuses to import it. Every existing converter
> wants a subscription and your bank statements on their server. Ledgerport runs entirely in your
> browser: auto-detects columns, fixes dates and amount formats (including European and
> debit/credit layouts), flags every unparseable row, and exports .QBO/.OFX/.QIF/clean CSV. Free
> during launch, no signup. Feedback welcome — especially banks whose exports it doesn't handle.

## Support instructions

- All conversion happens client-side; there are no server logs. Ask users for the *header row only*
  (never full statements) when debugging a mapping issue.
- Most common issue: QuickBooks rejects .qbo → INTU.BID mismatch → point to the in-app Advanced
  panel and the FAQ entry.
- Data deletion: nothing exists server-side; users clear presets via browser storage (site data).

## Terms draft — FOR LEGAL REVIEW, NOT PUBLISHED

Operator: Idlery Services LLC (Ohio). Service provided as-is without warranty; user retains all
rights to their data, which the service does not receive or store; no financial advice; liability
capped at fees paid (currently $0). Age 16+. Have counsel review before publishing a Terms page.
