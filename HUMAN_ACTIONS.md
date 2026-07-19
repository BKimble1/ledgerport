# HUMAN ACTIONS

Everything below is blocked only on owner credentials/identity — all surrounding work is done.

## 1. Deploy publicly (5 minutes) — the only step between "done" and "live"

No deployment credentials exist in this environment (checked: no Netlify/Vercel CLI auth, no gh
auth, no tokens in env). The repo is deploy-ready with configs and verified build.

**Easiest:** log in at https://app.netlify.com → "Deploy manually" → drag the folder
`C:\Users\Admin\ledgerport\dist` onto the drop zone. Done — you get a live URL immediately.
(`npm run build` in `C:\Users\Admin\ledgerport` regenerates `dist/` if needed.)

**Better long-term:** push the repo to GitHub (`gh auth login` first, then
`gh repo create ledgerport --private --source . --push`) and connect it to Netlify/Vercel —
both read the included config files automatically.

**Verify after deploy:** open the URL, click "Try with sample data", download the .qbo, confirm
the file opens as text and starts with `OFXHEADER:100`.

## 2. Optional: custom domain

Buy a domain (e.g. ledgerport.app) and point it at the Netlify/Vercel site. Requires payment —
owner only.

## 3. Optional: payments (only when Pro tier is real)

Requires the owner's Stripe account and identity/banking details. Recommended smallest step:
a Stripe Payment Link for "Ledgerport Pro — $29/year"; no code changes needed until entitlements
matter. Do NOT activate before batch/preset-sync features exist (LAUNCH.md has the plan).

## 4. Optional: Terms page

LAUNCH.md contains a terms draft labeled for legal review. Have counsel review before publishing.
