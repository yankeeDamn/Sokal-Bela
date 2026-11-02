# Sokal Belar Bazar - 24/7

A vanilla HTML, CSS and JavaScript storefront for fresh vegetables, ready baskets, deliveries and event/catering inquiries in Rampurhat, Birbhum. Public deployment: https://sokal-bela.vercel.app/

> **Deployment status:** The secure email OTP and admin migration is developed on a feature branch. It is not production-ready until the deployment environment is configured, the pull request is reviewed, and live end-to-end checks are completed.

## Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript; Firebase browser SDK for Firestore and phone/password legacy login.
- **Backend (Vercel):** Node.js 24 serverless functions in \`api/\`.
- **Database and identity:** Firebase Firestore and Firebase Authentication. Server functions use \`firebase-admin\`.
- **Email OTP:** Resend HTTP API, with server-generated codes and Firestore-backed challenge hashes.
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

The OTP, contact form, and operations portal **require** a configured Firebase Admin service account and email provider. The browser and server Firebase configurations must refer to the same Firebase project. Local service-account credentials stay in \`.env\` (which is ignored by Git); do not commit them.

## Admin authentication

1. Set \`ADMIN_EMAILS\` to the comma-separated approved admin email addresses.
2. Set \`FIREBASE_SERVICE_ACCOUNT_JSON\`, \`OTP_HASH_SECRET\`, \`RESEND_API_KEY\`, \`EMAIL_FROM\`, and public Firebase config variables in Vercel.
3. Enable Firebase Email/Password and custom-token Authentication support as appropriate for your project, verify your sending domain with Resend, and deploy the Vercel functions.
4. Open \`/secure-admin-portal\` directly. It is intentionally absent from the public site's navigation and sitemap.
5. Enter an approved email, receive a six-digit email OTP, and verify it. Session cookies are \`Secure\` and \`HttpOnly\`. The operations API enforces admin allowlist, Firebase claims, and 15-minute inactivity window.

There is **no sample admin password**. A standard customer's sign-in cannot grant access to the admin API. The separate login document is publicly reachable by design, but **dashboard data is not**.

## Store contact and delivery policy

The single source of truth for the storefront's contact number and standard delivery thresholds is \`config/contact.js\`. The current number is +91 7001867903, WhatsApp is https://wa.me/917001867903, minimum order ₹200, and free delivery on ₹300+ within 5 km. Store operations are available for inquiries 24/7; delivery timing is confirmed individually.

## Customer-facing pages

The main SPA \`index.html\` contains Home, Products, Cart/Checkout, My Orders, Order Confirmation, Payment Success/Failure (legacy), Bulk Orders, and Catering. Standalone pages are \`about.html\`, \`contact.html\`, \`faq.html\`, \`terms.html\`, \`privacy.html\`, \`refund-delivery.html\` and \`404.html\`.

## API routes

Vercel: \`GET /api/health\`, \`GET /api/products\` (currently a safe fallback), \`POST /api/auth/request-otp\`, \`POST /api/auth/verify-otp\`, \`POST /api/auth/session\`, \`POST /api/auth/logout\`, \`POST /api/inquiry\`, \`GET/PATCH/POST/DELETE /api/admin-data\` (action-scoped and protected), and \`GET /api/secure-admin-portal\` (login page). Other \`/api/*\` routes default to 404.

The local mock server also retains development-only product, order, bulk-request, review and payment endpoints. Consult \`local-server.js\` before using these; mock responses are not production records. Firebase Cloud Functions in \`backend/functions/index.js\` retain optional payment routes: \`create-payment-order\`, \`verify-payment\`, \`payment-status\`, \`razorpay-webhook\`, \`products\`, and \`health\`.

## Deployment and security notes

- Deploy the Vercel branch preview first, set required environment variables, test OTP through a real Resend verified sender, and then review/merge the pull request.
- Deploy the updated \`firestore.rules\` to Firebase. Existing legacy administrator custom claims and profile roles may require an intentional migration; no automatic privilege escalation is allowed.
- Do not put Firebase Admin service-account JSON, email API keys, OTP HMAC secrets, or payment secrets into browser code.
- The Firebase **web** API key in \`config/firebase-public.js\` is public by design. Restrict it in Google Cloud/Firebase settings as appropriate.
- A noindex, unlinked URL is **not a security boundary**. Every sensitive operation is gated on the server.
- The admin dashboard currently reads up to 250 records per collection. Totals and trend percentages are **sample-based** when datasets exceed that limit.
- The product manager currently accepts validated HTTPS image URLs. Server-side image uploads and storage workflow are still pending.
- Real email delivery, live order write/read, payments, and Lighthouse/mobile accessibility must be tested in a connected staging or production environment before release.

See \`IMPLEMENTATION-REPORT.md\` for the audit, change summary and manual test checklist.
