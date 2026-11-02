# Password login setup and preview checks

This change uses Firebase email/password for storefront and admin sign-in. No account or database data is migrated automatically. Email/password must be enabled in the same Firebase project used by the site. Password resets are sent by Firebase, not Resend. Phone-only users cannot sign in with email/password until their provider is securely linked to their existing Firebase UID. Do not delete or recreate users: that changes their UID and can disconnect orders. Keep Firebase phone sign-in enabled while arranging account recovery and linking with verified ownership.

## Admin setup

1. Confirm Firebase Authentication has an existing, enabled admin user with a verified email and a password. Set a password securely using Firebase's password reset process where appropriate; never commit or share it. If the account has only another provider, link a password provider to the existing UID using a verified flow.
2. In the preview deployment's Vercel settings configure `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `OTP_HASH_SECRET` (still used to hash admin sessions, minimum 32 unpredictable characters), and `ADMIN_EMAILS`. The browser configuration and service account must refer to the same Firebase project. Add the preview domain to Firebase authorized domains as needed. Redeploy the preview after environment changes.
3. The administrator needs a server-set `role: admin` Firebase custom claim in addition to the allowlist. For a test account in a test Firebase project, on a trusted computer with Node and dependencies installed, set environment variables without committing them. For PowerShell, examples:

```powershell
$env:ADMIN_EMAILS = 'admin@example.com'
$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content -Raw 'C:\secure\firebase-service-account.json'
node scripts/grant-admin.js admin@example.com
Remove-Item Env:FIREBASE_SERVICE_ACCOUNT_JSON
```

The script only modifies an existing, enabled, email-verified Firebase account, preserves other custom claims, and requires the email in the local allowlist. Ensure the target service account is for the intended Firebase project. Never share the service-account file. Sign out and back in after the claim is set. For production, apply this setup intentionally after reviewing the PR; do not use a production service account for preview tests.

## Preview acceptance

- Open `/secure-admin-portal`, sign in using a verified, allowlisted admin with a claim, and confirm dashboard data loads, refresh and logout work, and a wrong password is rejected.
- Check that an ordinary customer, an admin-claimed account not in the allowlist, and a signed-out visitor cannot access `/api/admin-data`. Check inactivity expiry and re-login.
- Sign up and sign in as a test customer, use password reset, place a test order only in an isolated test environment, and confirm existing email/password test accounts retain their UID and orders.
- Confirm OTP controls and endpoints no longer work. Test phone-only account recovery separately before disabling the Firebase phone provider.

The preview requires a Firebase project and Vercel environment configuration; automated syntax checks cannot establish live login, email delivery, or claim setup.
