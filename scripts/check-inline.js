'use strict';
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
let checked = 0;
for (const [tag, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=/.test(tag) || /\btype\s*=\s*["']application\/ld\+json/.test(tag)) continue;
  if (code.trim()) { new vm.Script(code, { filename: 'index.html inline script #' + (++checked) }); }
}
const checks = [
  [!html.includes('data-page="admin"'), 'Public navigation cannot link to the admin portal'],
  [!html.includes('id="admin-page"'), 'Public HTML cannot bundle admin page'],
  [!html.includes('admin123'), 'No demo credentials in the storefront'],
  [!html.includes('7551858583'), 'Old phone number absent from public HTML'],
  [html.includes('config/contact.js'), 'Shared contact configuration imported'],
  [html.includes('email-otp-inputs'), 'Email OTP verification UI present'],
  [html.includes('id="featured-grid"') && html.includes('id="baskets-grid"'), 'Featured produce and baskets present']
];
for (const [ok, message] of checks) {
  if (!ok) throw new Error('Lint failed: ' + message);
}
console.log('Inline JS syntax checked (' + checked + ' blocks); static storefront assertions passed.');
