# Sokal Bela — owner alerts and operations studio

## Release scope

- A new `/neon-admin/` responsive operations dashboard with overview, orders,
  order details, inventory edits, Morning Pass, enquiries, Kitchen, campaign
  planning, and read-only settings.
- API endpoints `/api/v2/admin` and `/api/v2/admin-auth`, handled by the
  **existing consolidated** `api/v2/[endpoint].js` Vercel function, so these
  do **not** add two standalone Vercel functions.
- Transactional owner email using existing Resend account settings.
- Additive `db/phase5-operations.sql` tables for alert status and marketing
  campaigns. No existing products, prices, inventory, orders or settings are changed.

## Release sequence (mandatory)

1. Test the GitHub PR checks. Test admin login, invalid password, cross-origin
   requests, all updates, phone viewport and alerts against a disposable database.
2. Review the migration file. Apply it to the intended Neon database **before**
   deploying this feature. It creates two tables and indexes only; it does not
   alter existing rows. Do not run it on a different application's database.
3. In Vercel, confirm server-only environment values:
   - `DATABASE_URL`: existing Neon connection string (already used by storefront).
   - `RESEND_API_KEY`: active server-only Resend key.
   - `EMAIL_FROM`: verified sender identity.
   - `ORDER_ALERT_EMAIL`: optional owner notification address. If omitted,
     the **first** valid email in existing `ADMIN_EMAILS` receives notifications.
     Confirm the address is correct before taking orders.
   - `ADMIN_PASSWORD_HASH`: strong scrypt hash in the form
     `scrypt:<32 lowercase hex salt>:<128 lowercase hex digest>`.
   - `JWT_SECRET`: independent random string at least 32 characters.
4. Do **not** place any credentials, email API keys, or database URLs in GitHub,
   client JavaScript, screenshots or public chat. Configure them as Vercel
   environment secrets, then redeploy.
5. Check `/neon-admin/` login, view orders, adjust a **test product in a test
   database**, create a test campaign, and verify unauthorized calls return 401/403.
6. Verify a controlled order returns 201, saves items and stock changes exactly
   once, sends email, and marks `order_alerts.status='sent'`. If Resend fails,
   checkout still succeeds; the alert appears as failed and can be retried in
   the Orders view. Do not submit fake production orders without consent.
7. Only then approve PR merge and release. Post-release monitor Vercel Functions
   and the admin Orders alert status.

## Set up your admin credentials

Generate the hash and secret locally in a trusted Node.js shell. Set
`ADMIN_NEW_PASSWORD` locally to your chosen password (at least 12 characters),
then run:

```sh
node -e "const c=require('node:crypto');const p=process.env.ADMIN_NEW_PASSWORD;if(!p||p.length<12)throw Error('Choose a stronger password');const salt=c.randomBytes(16);console.log('ADMIN_PASSWORD_HASH=scrypt:'+salt.toString('hex')+':'+c.scryptSync(p,salt,64).toString('hex'));console.log('JWT_SECRET='+c.randomBytes(32).toString('hex'))"
```

Store the output in Vercel production environment settings, never in a commit.
The cookie is Secure, HttpOnly, SameSite=Strict and has an eight-hour lifetime.
The login endpoint is rate-limited. Login/mutations accept only same-origin JSON.

## Email notification behavior

- The server inserts the order and its notification queue record in the **same
  transaction**. It attempts Resend delivery after commit, using a stable
  per-order Idempotency-Key; customer checkout never depends on email delivery.
- Email contains order number, products and quantities, subtotal, delivery fee,
  total, customer name/phone/address and delivery time. Only a configured owner
  recipient receives it. No customer data is printed to function logs.
- A failed notification is retained for **manual retry** from the admin Orders
  screen. This version does not yet have a scheduled retry service.
- Resend's API accepts an idempotency key; its deduplication window is limited
  (currently 24 hours), so an unusually delayed retry can still duplicate an
  email. Never treat an email as the primary order record; Neon is canonical.

## Campaigns & advertising

The Campaigns & Ads section saves plans, channel, dates, budget, spend, objective,
status, notes, and a storefront landing path. It can copy UTM-tagged links. It
does **not** create live Google/Meta campaigns, charge ad accounts, or measure
clicks/conversions. For that, add analytics and integrations in a separate
approved release.

## Operating notes

- Stock is decremented when customers successfully place orders. Cancelling an
  order does **not** automatically restore stock; reconcile manually.
- Settings remain read-only intentionally. Changing live delivery fees or service
  areas needs a separate, reviewed operation.
- The prior Firebase `/secure-admin-portal` remains separate. The Neon admin
  starts at `/neon-admin/`.
- Vercel Hobby's commercial-use policy and project limits must be resolved
  before using the website for a commercial business.
