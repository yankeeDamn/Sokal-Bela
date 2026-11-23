# Sokal Bela — Phase 3: accounts, Cashfree, Morning Pass, admin dashboard

Everything is additive. Test on a **Neon branch** first (same steps as Phase 2). Nothing here deletes data.

## What was added
| Area | Files |
| --- | --- |
| Database | `db/phase3.sql` — `users`, `user_sessions`, `auth_logs`, `payments`; orders/subscriptions get `user_id`, payment state; new product kind `newspaper` (5 inactive starter papers) |
| Customer accounts | `lib/auth-core.js`, `lib/v2-handlers/auth.js` — phone + password (scrypt), HttpOnly session cookie, every sign-in/out/failure logged, lockout after 6 failed attempts in 15 min |
| Cashfree | `lib/cashfree.js`, `lib/payments-core.js`, `lib/v2-handlers/payments.js`, `api/cashfree-webhook.js` — payment is only marked paid after the server re-reads the order from Cashfree and the amount matches |
| Customer screens | `index.html`, `js/account.js`, `public/account.css` — Sign in, My Account (orders, Morning Passes, profile), Morning Pass builder, Newspaper tab, Pay online at checkout |
| Morning Pass | `lib/v2-handlers/subscriptions.js` (now needs sign-in; milk, ghee, paneer **and** newspapers in one pass), `lib/v2-handlers/account.js` (pause, resume, cancel), prepay next 30 days via Cashfree |
| Admin | `admin/` (served at `/admin`), `lib/v2-handlers/admin.js` — overview + sales chart, orders, today's deliveries sheet, passes, products & prices, customers, payments, sign-in logs |
| Tests | `tests/phase3.test.cjs` (real PostgreSQL, fake Cashfree), CI updated |

Bug fixed on the way: the old Morning Pass start-date check used a doubly-escaped regex and rejected every date.

## Setup (phone-friendly)
1. Neon → branch `phase3-testing` → SQL Editor → run `db/phase3.sql`. Check: `SELECT count(*) FROM products WHERE kind='newspaper';` returns 5.
2. Vercel → Environment Variables (Preview first): `DATABASE_URL` (testing branch), `IP_HASH_SALT` (random), and for payments `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV=sandbox`.
3. Redeploy. Open the site → **Sign in → Create account** with your own phone number.
4. Make yourself admin, in Neon SQL Editor: `UPDATE users SET role='admin' WHERE phone='YOUR_10_DIGIT_NUMBER';` (or `DATABASE_URL=… node scripts/make-admin.js YOUR_NUMBER`). Sign out and in again, then open `/admin`.
5. In `/admin → Products & prices` set real prices/stock and switch products on. Newspapers: price is per copy.
6. Cashfree dashboard → Developers → Webhooks → add `https://YOUR-SITE/api/cashfree-webhook` (payment events). The webhook only nudges the server; status is always re-read from Cashfree.
7. Turn online payment on (only after sandbox test succeeds):
   `UPDATE settings SET value='true'::jsonb WHERE key='online_payments_enabled';`
   Without this (or without Cashfree keys) the checkout shows cash/UPI only.
8. Sandbox test: place an order choosing **Pay online**, pay with a Cashfree test UPI/card, confirm the order turns **Paid / Confirmed** in `/admin → Orders` and in the Payments tab.
9. Go live: switch to production keys, `CASHFREE_ENV=production`, set variables on Production, repeat step 6 with the live dashboard.

## Morning Pass flow
Customer builds a pass (milk, ghee, paneer, papers) → **Pending** → admin **Approves** → customer can **Pay next 30 days** online (or pay on delivery) → admin ticks deliveries on **Today's deliveries** → customer can pause/resume/cancel from My Account.

## Security notes and limits
- Phone numbers are **not** verified by SMS/OTP. Anyone can register any number, so "My Orders" shows only orders placed while signed in, never orders matched by phone alone. Add an OTP provider before relying on phone identity.
- No self-service password reset yet. The owner resets it with `NEW_PASSWORD='…' DATABASE_URL=… node scripts/reset-password.js PHONE` (also signs the customer out everywhere). Add email/OTP reset later.
- Admin sessions last 8 hours; customer sessions 30 days. A password change signs out other devices; blocking a customer ends their sessions.
- Sign-in logs store a salted hash of the IP, never the raw address.
- Online-order stock is reserved at checkout. Cancel unpaid/failed online orders in `/admin` to return the stock.
- Cashfree values (`CASHFREE_*`) live only in Vercel environment variables.
- Legacy Firebase files and APIs are untouched.

## Two admin screens (after merging with PR #38)
- `/neon-admin/` (from PR #38): single owner password, order email alerts, campaigns, enquiries, kitchen, settings. Needs `ADMIN_PASSWORD_HASH` and `JWT_SECRET`.
- `/admin` (this PR): role-based staff console for customers, sign-in logs, payments, Morning Pass runs, orders and prices. Sign in with an account whose `users.role='admin'`. API: `/api/v2/manage`.
Both work side by side and link to each other. Run `db/phase5-operations.sql` and then `db/phase3.sql`. Pick one later if you want a single admin.
