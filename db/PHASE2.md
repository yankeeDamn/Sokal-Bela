# Sokal Bela — Phase 2 (PostgreSQL Vegetables Preview)

**Draft PR #32. DO NOT MERGE INTO MAIN until the owner accepts the preview.**
The existing live Firebase storefront still uses root `index.html`. The Phase 2 replacement is separately served from `/phase2-preview/` on the **Preview deployment only**. Phase 3 Dairy, Phase 4 Kitchen and Phase 5 Admin are NOT implemented here.

## Included
- `phase2-preview/index.html`, `phase2-preview/style.css`, `phase2-preview/app.js` — plain mobile-first HTML/CSS/JS; English/Bengali vegetables, category/search, emoji/photo fallback, persistent cart, prepared baskets, custom basket builder, checkout, order lookup, bulk and catering request forms.
- `api/v2/products.js`, `settings.js`, `orders.js`, `order-lookup.js`, `requests.js` — public JSON API, all server-side access via parameterized SQL.
- `lib/neon-core.js` — pooled PostgreSQL connection with production TLS, input validation, security headers, persistent request throttling.
- `db/phase2.sql` — additive rate-limit table and configurable default delivery fee (₹0 while owner has not set one). Do not invent a delivery fee.
- `tests/neon-phase2.test.cjs` and `.github/workflows/neon-phase2.yml` — automated PostgreSQL tests and Chrome 390px screenshot.
- `package.json` adds `pg`; old dependencies are retained temporarily to preserve current production.
- `.env.example` adds blank `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET` names. Only DATABASE_URL is used in Phase 2.

## What remains intentionally unchanged
- Root `index.html`, existing `vercel.json` and existing build step, Firebase files, admin APIs, and live production checkout.
- Existing `db/schema.sql` and `db/seed.sql`; both already ran in Neon.
- The final minimal no-build app replaces the legacy root after Phases 3–5 and user acceptance.
- API is under `/api/v2/` to avoid colliding with legacy `/api/products`. The final public API paths will be standardized after safe cutover.

## Phone setup — do not touch Production variables yet
1. Open https://console.neon.tech/ → project `sokal-bela` → **Branches** → **Create Branch** from Primary. Name it `phase2-testing`. This isolates test orders and stock from the Primary database.
2. Select the NEW testing branch in Neon SQL Editor (database `neondb`); paste and Run `db/phase2.sql` from PR #32. Verify `request_rate_limits` exists.
3. Activate ONLY one starter vegetable in the TEST branch, for example:
   ```sql
   UPDATE products SET price=350.00, stock=5, active=TRUE, updated_at=NOW()
   WHERE kind='vegetable' AND name_en='Potato' AND pack_size='';
   ```
   This price is TEST DATA, not a live price. Do NOT run this on Primary.
4. In Neon, select the `phase2-testing` branch → **Connect** → copy the **pooled connection string** securely. Do NOT put it in GitHub or chat.
5. Vercel Dashboard → Sokal Bela → **Settings → Environment Variables** → add `DATABASE_URL` to **Preview** only, ideally scoped to branch `feat/neon-phase2-vegetables-20261112`. Set its value to the testing-branch connection string. DO NOT add to Production.
6. Vercel → Deployments → find the deployment for `feat/neon-phase2-vegetables-20261112` → Redeploy with current Preview variables.
7. Open the Preview URL and append `/phase2-preview/`. The normal root page is deliberately still the legacy app at this stage.
8. Vegetables should show the test potato; add one unit (₹350, above ₹300 minimum), proceed to checkout. Use a TEST name/phone/address only, because submitted test records are stored in Neon and a WhatsApp confirmation opens only when tapped.
9. Check in Neon (testing branch only):
   ```sql
   SELECT order_no, total, status FROM orders ORDER BY id DESC LIMIT 5;
   SELECT name_en,price,stock,active FROM products WHERE name_en='Potato';
   ```
   Stock should decrease by one after a successful test.
10. Test search, category chips, basket builder, prepared baskets (only available entries get added), cart + quantity changes, order lookup by phone AND order number, bulk/catering enquiry forms and WhatsApp links.
11. After testing, disable the demo product **in the test branch only**:
   ```sql
   UPDATE products SET active=FALSE,stock=0,price=0 WHERE kind='vegetable' AND name_en='Potato' AND pack_size='';
   ```
12. Keep PR #32 as **draft**, do NOT merge, and report test results or screenshots. Phase 3 starts only after your explicit approval.

## Price thresholds and contact
All three values come from Neon `settings` (not browser constants): min order **₹300**, free delivery from **₹500**, within **5 km**, phone **+91 7551858583** (latest provided number). Shop hours **07:00–21:00 Asia/Kolkata**. If settings are unavailable checkout fails rather than switching to Firebase. Delivery below ₹500 currently defaults to ₹0 until the owner chooses a fee; change `delivery_fee` in Neon settings only when confirmed.

## Security / known limitations
- The browser supplies only product IDs and quantities. The server loads approved products, checks stock and pincode, computes prices/totals, writes order+items and decrements stock in ONE transaction with row locks.
- Per-IP throttling uses a Neon table, not Vercel process memory. It limits orders, requests and lookups; it needs periodic retention cleanup in Phase 5.
- The order lookup GET includes phone number in the query URL (as explicitly requested); HTTPS is required and URLs may be logged by infrastructure. Consider switching to POST in the hardening phase to avoid logging customer numbers.
- Preview currently inherits the legacy `build.js` deployment process because removing it before replacing the live homepage would risk downtime. The new storefront frontend itself uses NO build or framework.
- Preview contains no customer login, Firebase, Razorpay, online payment or sellers. Old code still exists elsewhere in the repo until Phase 5.
- Phase 5 will build a secured admin UI. In Phase 2, verify orders and update test products using Neon SQL Editor.
- The database test is real isolated PostgreSQL in GitHub Actions; the browser screenshot checks layout at 390px but does NOT replace live API, Chrome console or complete checkout testing with the owner's Preview URL.

## Acceptance checklist
- [ ] Vercel Preview `/phase2-preview/` loads at phone width.
- [ ] Vegetables show only active products; bilingual name and search work.
- [ ] Emoji fallback works for missing/broken images.
- [ ] Ready baskets and custom bucket add products to existing cart.
- [ ] Cart badge, quantity, totals and minimum ₹300 behave correctly.
- [ ] ₹299 order is rejected; ₹500+ free delivery; DB recalculates any client-tampered price.
- [ ] Successful checkout creates an order, stores items, reduces stock and supplies WhatsApp link.
- [ ] Two simultaneous requests for the last item: one succeeds, one gets a stock error (automated test).
- [ ] Order lookup needs both order number and correct phone.
- [ ] Bulk and catering enquiries save and provide WhatsApp confirmation.
- [ ] No payment gateway or account login in the new Preview.
- [ ] No Firebase/Razorpay cleanup performed until Phase 5 and owner approval.
