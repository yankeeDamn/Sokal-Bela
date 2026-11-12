# Phase 3–5 rollout notes (isolated Neon storefront)

The old homepage and old /admin are deliberately unchanged. New storefront: /phase2-preview/. New PostgreSQL admin: /neon-admin/.

## Merge order
1. PR #34 (Phase 3 dairy / Morning Pass)
2. PR #35 (Phase 4 kitchen affiliate catalogue, stacked on #34)
3. Phase 5 admin PR (stacked on #35)

**Do not merge without passing checks and testing against the separate Neon testing branch.** Stacked PRs should be rebased/retargeted as their parent PRs merge.

## Phase 3
- Dairy cards display only active dairy items with real prices and stock.
- Morning Pass creates a *pending request* in subscriptions and subscription_items. It does not create delivery rows, charge customers, or decrement stock.
- Owner must confirm pricing, product availability and schedule; activation, pausing, cancellation and deliveries are managed by the shop.
- The existing 6 dairy seed items remain inactive until the owner enters real prices/stock and explicitly approves activation.
- Test against the testing branch; do not create fake production subscriptions.

## Phase 4
- Kitchen cards come from active kitchen_items only. The API accepts HTTPS links whose host is amazon.in or flipkart.com (or their subdomains).
- A visible affiliate disclosure appears on the Kitchen tab.
- No kitchen items or affiliate URLs are inserted or activated automatically. Owner must provide approved partner URLs.
- Purchases are handled by the partner, not Sokal Bela.

## Phase 5 — security configuration
- Separate admin page /neon-admin/ (the old /admin still belongs to the legacy app).
- Required **server-only** Vercel environment variables:
  - ADMIN_PASSWORD_HASH: scrypt:<32 lowercase hex salt>:<128 lowercase hex digest>
  - JWT_SECRET: random secret of at least 32 characters
  - DATABASE_URL: existing Neon pooled connection string
- To generate a password hash and secret **locally in a trusted Node.js shell**, run:
  `node -e "const c=require('node:crypto');const p=process.env.ADMIN_NEW_PASSWORD;if(!p||p.length<12)throw Error('Set a strong ADMIN_NEW_PASSWORD first');const s=c.randomBytes(16);console.log('ADMIN_PASSWORD_HASH=scrypt:'+s.toString('hex')+':'+c.scryptSync(p,s,64).toString('hex'));console.log('JWT_SECRET='+c.randomBytes(32).toString('hex'))"`
- Never paste the raw password, password hash, JWT secret, or database URL into GitHub, public chat, or browser JS. Configure secrets in Vercel server environment settings and redeploy.
- Login is rate limited, cookie is HttpOnly + Secure + SameSite Strict, and sessions expire after 8 hours. Mutations require same-origin requests and an authenticated session.
- Admin currently supports product price/stock/activation, order status, subscription status, enquiry status, kitchen item activation, and read-only shop settings. It does **not** yet create kitchen links, edit subscription schedules, generate recurring deliveries, restore stock on cancellation, or edit settings.
- Verify access control, cross-origin POST rejection, login rate limiting, input validation and session expiry before using admin against production.

## Still needed before replacing the homepage
- Automated tests for Phase 3/4/5 and end-to-end manual tests on a test deployment connected only to the test branch.
- Confirm shop phone, real dairy prices/stock, subscription fulfilment rules, and approved affiliate links.
- Final controlled test checkout against the test branch, including delivery fee and stock decrement.
- Owner sign-off on the new storefront and explicit authorization for root homepage cutover.
- Remove old Firebase/Razorpay code only after successful cutover and rollback plan.
