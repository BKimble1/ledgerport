# Payments — status & implementation path

## Current state (honest)

Ledgerport is **free during launch** and the site says exactly that. No checkout exists because:

1. GitHub Pages is static — there is no server to verify payments, and client-only "checkout"
   that grants entitlements from client state is trivially bypassed and dishonest.
2. No Stripe account/credentials are configured in this environment.
3. Product rule: no fake buttons. A "Buy" button that doesn't charge is worse than none.

Pricing is centralized in `src/config.ts` (`PRICING`) and displayed from there on the Pricing
section and Refunds page.

## Implementation path (when the owner is ready)

Recommended: **Stripe Checkout + a serverless verifier** (Netlify/Vercel functions or Cloudflare
Workers — this repo already carries `netlify.toml`/`vercel.json`).

1. Server function `create-checkout-session`: creates a Checkout Session for
   `price_per_export` or `price_pro_monthly` (Price IDs in env vars). Secret key lives only in
   `STRIPE_SECRET_KEY` env var on the host — never in client code.
2. Success URL returns `session_id`; client calls server function `verify-session`, which
   retrieves the session server-side and returns a signed entitlement token (short-lived JWT,
   `ENTITLEMENT_SIGNING_KEY` env var). Client stores it; the export path checks it.
3. Webhook `checkout.session.completed` (STRIPE_WEBHOOK_SECRET) records subscriptions for
   restore-purchase (`customer_email` lookup) — no financial file data ever touches the server.
4. Free tier keeps: parse, mapping, preview, warnings, limited preflight, sample flow — users see
   Ledgerport solve their problem before any paywall.

Environment variables required (all server-side):
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRICE_PER_EXPORT`, `PRICE_PRO_MONTHLY`,
`ENTITLEMENT_SIGNING_KEY`.

Dev mode: with no env vars set, functions return `{devMode:true}` and the client shows the free
experience — the app never breaks because billing is absent.
