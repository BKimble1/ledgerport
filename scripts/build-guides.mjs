// Generates static, indexable guide pages into public/guides/ + sitemap + robots.
// Run: node scripts/build-guides.mjs   (idempotent; committed output is served by GitHub Pages)
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://bkimble1.github.io/ledgerport";

const wrap = (slug, title, desc, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Ledgerport</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${BASE}/guides/${slug}.html">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}">
<style>
body{font-family:-apple-system,"Segoe UI",system-ui,sans-serif;color:#1c2431;background:#faf9f6;max-width:720px;margin:0 auto;padding:1.5rem 1.25rem 4rem;line-height:1.6}
h1{font-family:Georgia,serif;font-size:1.9rem;line-height:1.2}
h2{font-family:Georgia,serif;font-size:1.25rem;margin-top:1.8rem}
a{color:#0e7a5f}
.top{font-size:.9rem;margin-bottom:2rem}
.cta{display:inline-block;background:#0e7a5f;color:#fff;font-weight:600;padding:.6rem 1.2rem;border-radius:8px;text-decoration:none;margin:1rem 0}
ol li,ul li{margin:.4rem 0}
code{background:#f1efe9;padding:.1em .35em;border-radius:4px}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #ddd8cc;font-size:.85rem;color:#8a91a0}
</style></head><body>
<nav class="top"><a href="../">← Ledgerport converter</a> · <a href="index.html">All guides</a></nav>
${body}
<a class="cta" href="../">Convert your CSV now — free, nothing uploaded</a>
<footer>Ledgerport processes files entirely in your browser. Not affiliated with or endorsed by Intuit;
QuickBooks and Quicken are trademarks of their owners. Destination software applies its own validation —
Ledgerport checks format compatibility, not every private rule.</footer>
</body></html>`;

const pages = [
  {
    slug: "csv-to-qbo",
    title: "Convert CSV to QBO for QuickBooks Desktop",
    desc: "QuickBooks Desktop can't import CSV bank transactions — only .QBO Web Connect files. Here's how to convert safely, in your browser, without uploading your statement.",
    body: `<h1>Convert CSV to QBO (QuickBooks Desktop)</h1>
<p>QuickBooks Desktop imports bank transactions only through <strong>Web Connect .QBO files</strong> — it will not
accept a CSV, no matter how clean. If your bank only offers CSV downloads, or you need months that are no longer
available through bank feeds, you need a converter.</p>
<h2>What a correct QBO file needs</h2>
<ul><li>OFX 1.02 SGML structure with an <code>INTU.BID</code> bank identifier QuickBooks recognizes</li>
<li>A unique, stable <code>FITID</code> per transaction (this is how QuickBooks deduplicates)</li>
<li>Correct account type — checking/savings vs credit card use different structures</li>
<li>Dates as <code>YYYYMMDD</code> and plain signed amounts</li></ul>
<h2>Steps</h2>
<ol><li>Download the CSV from your bank.</li>
<li>Open Ledgerport, drop the CSV in — columns, dates, and amount signs are detected automatically and every
unreadable row is listed with its reason.</li>
<li>Check the preflight verdict and reconciliation (totals to the cent, duplicate check, balance proof when your
CSV has a running balance column).</li>
<li>Download the .QBO, then in QuickBooks: <strong>File → Utilities → Import → Web Connect Files</strong>.</li></ol>
<h2>If QuickBooks rejects the file</h2>
<p>The most common cause is the INTU.BID — QuickBooks validates it against its bank directory. Ledgerport lets you
set your bank's BID under Advanced settings. See <a href="quickbooks-rejected-csv.html">QuickBooks rejected my file</a>.</p>`,
  },
  {
    slug: "csv-to-ofx",
    title: "Convert CSV to OFX for Xero, GnuCash, and Wave",
    desc: "Convert any bank CSV export to a standards-compliant OFX file for Xero, GnuCash, Wave, Banktivity, or MoneyMoney — locally in your browser.",
    body: `<h1>Convert CSV to OFX</h1>
<p>OFX (Open Financial Exchange) is the closest thing to a universal bank-statement format — Xero, GnuCash, Wave,
Banktivity, MoneyMoney, and many banks' own tools read it. When your bank only exports CSV, converting to OFX
gets you clean imports with proper transaction IDs instead of fragile CSV column-mapping in each app.</p>
<h2>What matters in a good OFX conversion</h2>
<ul><li>Well-formed OFX 2.x XML (Ledgerport's output is validated for well-formedness)</li>
<li>Stable unique FITIDs so re-imports don't duplicate transactions</li>
<li>Correct sign convention — money out must be negative</li>
<li>Dates normalized from whatever your bank used (US, international, even Excel serial numbers)</li></ul>
<h2>Steps</h2>
<ol><li>Drop your CSV into Ledgerport.</li><li>Confirm the detected columns and the preflight result.</li>
<li>Download the .OFX and import it: in Xero, <strong>Accounting → Bank accounts → Manage Account → Import a
Statement</strong>; in GnuCash, <strong>File → Import → Import OFX/QFX</strong>.</li></ol>`,
  },
  {
    slug: "csv-to-qif",
    title: "Convert CSV to QIF for Quicken",
    desc: "Turn bank CSV exports into QIF files for Quicken, YNAB4, and legacy finance tools — with correct dates, signs, and check numbers, all in your browser.",
    body: `<h1>Convert CSV to QIF (Quicken)</h1>
<p>QIF is the veteran interchange format that Quicken, YNAB4, Banktivity, and most legacy finance tools still read.
It's line-oriented and simple, but the details matter: bank vs credit-card type headers, <code>MM/DD/YYYY</code>
dates, signed amounts, and <code>N</code> lines for check numbers.</p>
<h2>Steps</h2>
<ol><li>Drop your bank CSV into Ledgerport — the account type you pick sets the QIF type header
(<code>!Type:Bank</code> or <code>!Type:CCard</code>).</li>
<li>Review preflight and reconciliation, then download the .QIF.</li>
<li>In Quicken: <strong>File → File Import → QIF File</strong>. Newer Quicken Windows versions hide QIF import for
some account types — import into a cash account first, then move the transactions.</li></ol>
<h2>Gotchas</h2>
<ul><li>QIF has no unique transaction IDs, so import the same file twice and you'll get duplicates — Ledgerport's
local duplicate firewall warns you before that happens.</li>
<li>Descriptions with line breaks corrupt QIF; Ledgerport strips them automatically.</li></ul>`,
  },
  {
    slug: "quickbooks-rejected-csv",
    title: "QuickBooks rejected my CSV or QBO file — how to fix it",
    desc: "Why QuickBooks rejects imported bank files: INTU.BID validation, wrong account type, duplicate FITIDs, malformed structure — and how to fix each one.",
    body: `<h1>QuickBooks rejected my file — now what?</h1>
<p>Import rejections almost always come down to one of these:</p>
<h2>1. It's a CSV and you're on QuickBooks Desktop</h2>
<p>Desktop doesn't import CSV bank transactions at all. Convert to .QBO first — see
<a href="csv-to-qbo.html">CSV to QBO</a>.</p>
<h2>2. "This bank is not recognized" — INTU.BID</h2>
<p>Every .qbo file carries an <code>INTU.BID</code> bank identifier that QuickBooks validates against its
directory. If the ID isn't recognized, the import fails before it looks at a single transaction. Fix: find your
bank's BID (search "INTU.BID list"), enter it in Ledgerport's Advanced panel, and re-export.</p>
<h2>3. Wrong account type</h2>
<p>A credit-card export imported into a checking account (or vice versa) fails or posts reversed. The file's
internal account type must match the QuickBooks account — set it in Ledgerport's account settings.</p>
<h2>4. Duplicate FITIDs</h2>
<p>QuickBooks silently skips transactions whose FITID it has seen before. If a previous import used the same IDs,
new transactions may not appear. Ledgerport generates stable content-based FITIDs and its duplicate firewall
warns when you're re-exporting transactions you already imported.</p>
<h2>5. Malformed structure</h2>
<p>Hand-edited or badly generated files break on unescaped characters (<code>&amp;</code> especially), missing
required tags, or wrong date formats. Regenerating the file from the original CSV is faster than repairing by hand.</p>`,
  },
  {
    slug: "fix-debit-credit-columns",
    title: "Fix debit/credit columns and reversed amounts in bank CSVs",
    desc: "Bank CSVs disagree about signs: separate debit/credit columns, spending as positive, parentheses negatives, CR/DR codes. How to normalize them correctly.",
    body: `<h1>Fix debit/credit columns and reversed signs</h1>
<p>Accounting software wants one signed amount per transaction: negative = money out. Banks export anything but:</p>
<ul><li><strong>Two columns</strong> — "Debit" and "Credit" (or "Money out"/"Money in", "Withdrawals"/"Deposits")</li>
<li><strong>Spending as positive</strong> — common on credit-card exports, where a purchase shows as +82.17</li>
<li><strong>Parentheses</strong> — (82.17) means −82.17 in accounting style</li>
<li><strong>Trailing minus</strong> — 82.17-</li>
<li><strong>CR/DR codes</strong> — "82.17 DR" is a debit, "82.17 CR" a credit</li></ul>
<h2>How Ledgerport handles it</h2>
<ol><li>Detects two-column debit/credit layouts from headers and merges them into signed amounts (debits negative).</li>
<li>Parses parentheses, trailing minus, CR/DR codes, currency symbols, and European decimal commas automatically.</li>
<li>For spending-positive files, one "Flip signs" checkbox reverses everything — and the reconciliation card shows
money in/out immediately, so a reversed file is obvious before export.</li></ol>
<p>The check that saves you: <strong>money out should be bigger than money in on most spending accounts</strong>.
If the reconciliation card shows the opposite on your checking account, the signs are probably flipped.</p>`,
  },
  {
    slug: "remove-duplicate-transactions",
    title: "Remove duplicate transactions before importing into QuickBooks",
    desc: "Overlapping bank downloads create duplicate transactions in QuickBooks. How to catch exact and probable duplicates before import — locally, without uploading data.",
    body: `<h1>Remove duplicates before they reach QuickBooks</h1>
<p>Duplicates sneak in two ways: the same row appears twice inside one download, or this month's download overlaps
last month's (banks love including a few days of buffer). Cleaning them up inside QuickBooks afterwards is slow
and risky; the time to catch them is before import.</p>
<h2>Inside one file</h2>
<p>Ledgerport fingerprints every transaction (date + amount + normalized description + check number). Exact
repeats are flagged and excluded automatically — one click brings any of them back if they're real (two identical
coffees on the same day happen).</p>
<h2>Across downloads — the duplicate firewall</h2>
<p>When you export, Ledgerport stores <em>one-way hashed</em> fingerprints of the exported transactions in your
browser's local storage. Next conversion, anything you've already exported is flagged "already exported" and held
back. The history contains no readable transaction data, never leaves your device, can be cleared any time, and
can be switched off.</p>
<h2>QuickBooks' own defense</h2>
<p>QBO/OFX files carry FITIDs that QuickBooks uses to skip transactions it has seen. That works — but only if the
IDs are stable, and it fails silently. QIF and CSV imports have no such protection at all, which is why catching
duplicates before the file is generated is the reliable approach.</p>`,
  },
];

mkdirSync("public/guides", { recursive: true });

for (const p of pages) {
  writeFileSync(`public/guides/${p.slug}.html`, wrap(p.slug, p.title, p.desc, p.body));
}

const index = wrap(
  "index",
  "Bank CSV conversion guides",
  "Practical guides for converting bank CSV exports to QBO, OFX, and QIF, fixing rejected imports, and keeping duplicates out of QuickBooks.",
  `<h1>Conversion &amp; import guides</h1>
<ul>${pages.map((p) => `<li><a href="${p.slug}.html">${p.title}</a></li>`).join("\n")}</ul>`
);
writeFileSync("public/guides/index.html", index);

writeFileSync(
  "public/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${BASE}/</loc></url>
<url><loc>${BASE}/guides/</loc></url>
${pages.map((p) => `<url><loc>${BASE}/guides/${p.slug}.html</loc></url>`).join("\n")}
</urlset>`
);

writeFileSync("public/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);

console.log(`Generated ${pages.length + 1} guide pages + sitemap + robots.`);
