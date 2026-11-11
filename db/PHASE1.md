# Sokal Bela — PostgreSQL rebuild, Phase 1 only

**Status:** planning and SQL files only. No deletes, no production deployment, no database created, no app rewrite.

## Rollback / preservation
- GitHub `main` is untouched.
- Backup branch: `backup-firebase-version-20261112` created from original `main` commit `1ee4c35f85762267e65599e96e8f06786dd821c6`.
- Before any future deletion, download GitHub repository ZIP or create an immutable GitHub tag. Do not delete the backup branch.
- The existing Firestore data is NOT contained in a Git repository ZIP; export Firestore separately before decommissioning Firebase.

## Decisions from latest instructions
- Keep: bulk orders, catering, ready baskets, custom bucket builder. Your deletion paragraph conflicts with the feature list; **these features must survive**. They need a tiny PostgreSQL `bulk_requests` table.
- New pricing: minimum order **₹300** and free delivery at **₹500+ within 5 km**. A test order below ₹200 must fail as a subset; also test ₹299 rejected and ₹300 accepted.
- Owner WhatsApp: use the shared value in `config/contact.mjs`. Older project discussions used other numbers, so confirm the number before cutover. Nothing in the live store is modified in Phase 1.
- Shop hours: **07:00–21:00 Asia/Kolkata**. Early subscription windows beginning at 06:00 are a separate morning-delivery service and should be explicitly confirmed.
- No customer login, no Firebase, no online payment, no other sellers. Admin login uses one server-verified password hash, secure session cookie and rate limiter.
- No external affiliate scraping; only owner-authored product details and links.
- Placeholder seed prices/stock are ZERO and all seed products INACTIVE to prevent accidental real sales at invented prices.
- Phone + order number lookup will expose personal order details if both are known; add rate limiting and return minimum required fields.

## Files prepared
- `db/schema.sql`: all requested PostgreSQL tables and indexes plus `bulk_requests` for preserved features.
- `db/seed.sql`: ~20 vegetables and six dairy SKUs, starter JSONB settings. Idempotent by unique product kind/name/pack size.

## Target repository after Phase 5
```
index.html                 static shopping shell, unchanged name
style.css                  mobile-first forest-green styles
app.js                     vanilla JS, vegetables, dairy, kitchen, cart, requests
admin/index.html           independent admin page served at /admin/
admin/admin.js             admin UI logic
api/                       minimal endpoint handlers, auth guard, parameterized SQL
lib/                       small SQL and session helpers if needed
db/schema.sql              database schema
db/seed.sql                initial catalogue/settings
package.json               only actual runtime libraries
package-lock.json          REGENERATED, committed for reproducible npm install
.env.example               variable NAMES only
.gitignore                 excludes .env*, node_modules, exports
README.md                  short phone-first guide
vercel.json                static routing + /admin rewrite when needed
```
No build step, framework or secrets in GitHub. The existing repo uses a build currently, so switch only when new static+API app works in Preview.

## Confirmed existing files explicitly authorized for later deletion
Only after new app passes production-equivalent tests and backup is verified:
- `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, `firebase-config.js`
- `backend/` including Firebase Functions
- `razorpay-integration.js`, `local-server.js`, `notifications.js`, `db-operations.js`
- `admin.html`, `admin.js` IF they exist (neither is currently present)
- `.github/workflows/npm-publish-github-packages.yml`
- Old `package-lock.json` **only as part of regeneration and recommit**
- Old `.env.example`, `README.md`, `BUSINESS-SETUP.md` **replace carefully, not leave absent**
- Firebase/Razorpay/marketplace/account code and unused page sections inside `index.html` (editing, not deleting the file)

### Conflicting deletion instruction — NOT authorized
- **Do not remove** bulk orders, catering, ready baskets, or custom bucket builder; they are required elsewhere in this request.

### Additional potentially obsolete repository paths — require owner's explicit OK before removing
- `build.js`, `api/auth/[action].js`, `api/admin-data.js`, `api/secure-admin-portal.js`, `api/inquiry.js`, `api/products.js`, `api/health.js`, `api/[...slug].js`, `api/package.json`
- `config/firebase-public.js`, `config/contact.mjs`, `config/commerce.mjs`
- `js/partner/`, `src/data/partnerProducts.js`, `public/partner-store.css`
- `lib/server-auth.js`, `scripts/`, `.github/workflows/storefront-checks.yml`
- `js/i18n.js`, `js/veg-images.js`, `locales/` (preserve translations or port into new UI first)
- `about.html`, `contact.html`, `faq.html`, `terms.html`, `privacy.html`, `refund-delivery.html`, `404.html`, `robots.txt`, `sitemap.xml`, `public/info-pages.css`, `public/images/`
- `Sokal-Bela-updated.zip`, `PASSWORD-LOGIN-SETUP.md`, `.vercelignore`, existing `style.css`
Do not delete these until each is audited for functionality, legal pages, SEO, or required dependencies. Particularly keep published privacy/terms information until replaced.

## Phase-by-phase cutover
1. **Now**: schema, seed, cleanup inventory, backups; no deploy.
2. Node/Vercel API and vegetable storefront + cart, server-side pricing/stock/checkout, bulk/catering/baskets.
3. Dairy, subscriptions and delivery ledger.
4. Kitchen affiliate list, disclosure, admin-maintainable data.
5. Admin /admin, hardening, end-to-end tests, deletion commit, doc replacement, switch Vercel to new static root; only then disable Firebase credentials.

## Phone steps — testing Phase 1 only
1. Open GitHub branch `feat/neon-migration-phase1-20261112`; review `db/schema.sql`, `db/seed.sql`.
2. Open https://console.neon.tech/ → New Project → `sokal-bela` → Free plan (check limits) → Create.
3. Open SQL Editor for the empty project's **development** branch/database. Run all of `db/schema.sql`; then run all of `db/seed.sql`.
4. In Neon Tables verify `products`, `orders`, `order_items`, `subscriptions`, `subscription_items`, `subscription_deliveries`, `kitchen_items`, `settings`, `bulk_requests`.
5. Run `SELECT kind, count(*) FROM products GROUP BY kind ORDER BY kind;` Expected `vegetable=20`, `dairy=6`.
6. Run `SELECT key, value FROM settings ORDER BY key;` Verify 300 minimum, 500 free delivery and shop hours 7–21.
7. Confirm `SELECT count(*) FROM products WHERE active = TRUE;` returns **0** (safety).
8. **Do not add DATABASE_URL to the live production site yet.** Never paste your connection string, password or secrets in chat or GitHub.
9. Phase 1 has no new UI, so phone browser/checkout tests remain for Phase 2 onward. Existing live site is unchanged.

## SQL and security review
- Parameterized SQL is mandatory in future functions; no dynamic string-assembled SQL.
- Future checkout must lock affected product rows inside a single SQL transaction (or equivalent single atomic update), recalculate totals server-side, enforce settings, insert order + items, and rollback on insufficient stock.
- Only one password hash and JWT secret will live in Vercel env vars; session HttpOnly/Secure/SameSite=Strict, 12-hour max, safe origin checks, login rate limits.
- Phone-only order search is not authorized; require both phone and unique order number.
- Neon project not available/created by agent; live SQL migration not tested. Test schema in a fresh, empty Neon SQL Editor before any backend deployment.
