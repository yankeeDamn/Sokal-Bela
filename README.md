# Sokal Belar Bazar - 24/7

A vanilla HTML, CSS and JavaScript storefront for fresh vegetables, ready baskets, deliveries and event/catering inquiries in Rampurhat, Birbhum. Public deployment: https://sokal-bela.vercel.app/

> **Deployment status:** The secure email OTP and admin migration is developed on a feature branch. It is not production-ready until the deployment environment is configured, the pull request is reviewed, and live end-to-end checks are completed.

## Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript; Firebase browser SDK for Firestore and phone/password legacy login.
- **Backend (Vercel):** Node.js 24 serverless functions in \`api/\`.
- **Database and identity:** Firebase Firestore and Firebase Authentication. Server functions use \`firebase-admin\`.
- **Authentication:** Firebase email/password; Firebase sends password reset emails.
- **Other services:** Optional Razorpay Cloud Functions (online checkout is currently disabled); WhatsApp link-based ordering.
- **Build:** \`node build.js\` copies public assets into \`dist/\`, with server/admin legacy assets excluded. Vercel uses \`vercel.json\`; Firebase Hosting is a legacy alternative and does not automatically provide the new Vercel OTP APIs.
- **CI:** \`.github/workflows/storefront-checks.yml\` runs lint, smoke scripts, build, and checks for public admin asset leakage.

## Run

Requires Node.js 24 and npm.

\`\`\`bash
git clone https://github.com/yankeeDamn/Sokal-Bela.git
cd Sokal-Bela
npm install
cp .env.example .env
npm run lint
npm test
npm run build
npm start
\`\`\`

The storefront is at http://localhost:3000. The isolated operations portal is at http://localhost:3000/secure-admin-portal.

The contact form and operations portal **require** a configured Firebase Admin service account and email provider. The browser and server Firebase configurations must refer to the same Firebase project. Local service-account credentials stay in \`.env\` (which is ignored by Git); do not commit them.

## Admin authentication

Admin and customer sign-in use Firebase email/password. Admin access also requires an allowlisted email and a server-set Firebase admin claim. See [PASSWORD-LOGIN-SETUP.md](PASSWORD-LOGIN-SETUP.md) for preview setup, account migration, and acceptance checks. `OTP_HASH_SECRET` is still required to hash admin session identifiers.

## Store contact and delivery policy

Both stores use `SOKAL_BELA_PHONE` for calls and `SOKAL_BELA_WHATSAPP` for WhatsApp. The build also uses this config for the phone number on the social share card. The fresh store accepts orders of ₹200 or more and offers free delivery on ₹300+ within 5 km. The store handles inquiries 24/7 and confirms delivery timing individually. [Contact and delivery config](config/contact.mjs)

## Customer-facing pages

The main SPA \`index.html\` contains Home, Products, Cart/Checkout, My Orders, Order Confirmation, Payment Success/Failure (legacy), Bulk Orders, and Catering. Standalone pages are \`about.html\`, \`contact.html\`, \`faq.html\`, \`terms.html\`, \`privacy.html\`, \`refund-delivery.html\` and \`404.html\`.

## API routes

Vercel: \`GET /api/health\`, \`GET /api/products\` (currently a safe fallback), \`POST /api/auth/request-otp\`, \`POST /api/auth/verify-otp\`, \`POST /api/auth/session\`, \`POST /api/auth/logout\`, \`POST /api/inquiry\`, \`GET/PATCH/POST/DELETE /api/admin-data\` (action-scoped and protected), and \`GET /api/secure-admin-portal\` (login page). Other \`/api/*\` routes default to 404.

The local mock server also retains development-only product, order, bulk-request, review and payment endpoints. Consult \`local-server.js\` before using these; mock responses are not production records. Firebase Cloud Functions in \`backend/functions/index.js\` retain optional payment routes: \`create-payment-order\`, \`verify-payment\`, \`payment-status\`, \`razorpay-webhook\`, \`products\`, and \`health\`.

## Deployment and security notes

- Deploy a preview first and follow the password-login acceptance steps before reviewing the pull request.
- Deploy the updated \`firestore.rules\` to Firebase. Existing legacy administrator custom claims and profile roles may require an intentional migration; no automatic privilege escalation is allowed.
- Do not put Firebase Admin service-account JSON, email API keys, OTP HMAC secrets, or payment secrets into browser code.
- The Firebase **web** API key in \`config/firebase-public.js\` is public by design. Restrict it in Google Cloud/Firebase settings as appropriate.
- A noindex, unlinked URL is **not a security boundary**. Every sensitive operation is gated on the server.
- The admin dashboard currently reads up to 250 records per collection. Totals and trend percentages are **sample-based** when datasets exceed that limit.
- The product manager currently accepts validated HTTPS image URLs. Server-side image uploads and storage workflow are still pending.
- Real email delivery, live order write/read, payments, and Lighthouse/mobile accessibility must be tested in a connected staging or production environment before release.

See \`IMPLEMENTATION-REPORT.md\` for the audit, change summary and manual test checklist.

## Fresh Bazar and Partner Store

The home page opens in Fresh Vegetables. On a Vercel Preview deployment, open the following paths on the **same origin**.

| Path | Expected behaviour |
| --- | --- |
| `/` in a new private window | Fresh store only while the public flag is false |
| `/?preview=true` | Unlocks the Partner Store tab on this browser. Start in Fresh, add a vegetable, switch to Partner, then switch back to check the saved cart. |
| `/?admin=sokal247` | Opens the local Quick Product Generator. Preview an item with a new category, then use **Copy Updated partnerProducts.js Code**. |
| `/?preview=false` | Clears this browser’s preview unlock. Locally authored drafts are retained. |

The sample catalogue has eight illustrated products. Sample prices, stock and delivery windows are illustrative. The Amazon and Flipkart sample links have no affiliate tracking. Before launch, check each listing, replace the samples with your products and approved affiliate links, and confirm who fulfills each Meesho item. Change `sample` to `false` on verified listings. Set `ENABLE_PARTNER_STORE_PUBLIC` in `config/commerce.mjs` to `true` in a separate release when ready.

Replace **`src/data/partnerProducts.js`** with the generator’s complete export and review the change in GitHub. Each row has one unique ID. Categories come from the data. `tags` support both languages, `discountPercent` is derived, and `supplierCode` is private. The build writes only shopper fields to `dist/public/partner-catalog.json`. Once the deployed catalogue contains private references, an exact export also requires your existing operations-portal sign-in or selecting the matching private source file in the generator. Local previews and copy do not update Firebase, GitHub or a deployment.

For acceptance, inspect a Meesho order draft in WhatsApp before sending it. Check the number, names, product ID, quantity and address. Check an Amazon or Flipkart link opens the matching retailer in a new tab. In the fresh drawer, try subtotals below ₹200, from ₹200 to ₹299.99, and at ₹300. Free delivery requires an address within 5 km. The store confirms distance and any other fee with the customer.
