'use strict';
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
let checked = 0;
for (const [, tag, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=/.test(tag) || /\btype\s*=\s*["']application\/ld\+json/.test(tag)) continue;
  if (code.trim()) { new vm.Script(code, { filename: 'index.html inline script #' + (++checked) }); }
}
const checks = [
  [!html.includes('data-page="admin"'), 'Public navigation cannot link to the admin portal'],
  [!html.includes('id="admin-page"'), 'Public HTML cannot bundle admin page'],
  [!html.includes('admin123'), 'No demo credentials in the storefront'],
  [!html.includes('7551858583'), 'Old phone number absent from public HTML'],
  [html.includes('config/contact.js'), 'Shared contact configuration imported'],
  [html.includes('signInWithEmailAndPassword') && !html.includes('auth-tab-phone'), 'Password login present without phone OTP'],
  [html.includes('id="featured-grid"') && html.includes('id="baskets-grid"'), 'Featured produce and baskets present']
];
for (const [ok, message] of checks) {
  if (!ok) throw new Error('Lint failed: ' + message);
}

const adminPage = fs.readFileSync('api/secure-admin-portal.js', 'utf8');
const adminMatch = adminPage.match(/<script nonce="__NONCE__">([\s\S]*?)<\/script>/);
if (!adminMatch) throw new Error('Admin inline script missing');
new vm.Script(adminMatch[1].replace('__FIREBASE_CFG__', '{}'), { filename: 'admin portal inline JS' });
if (!adminPage.includes('signInWithEmailAndPassword') || adminPage.includes("'/api/auth/verify-otp'")) throw new Error('Admin password login missing');
const contactPage = fs.readFileSync('contact.html', 'utf8');
for (const [, code] of contactPage.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  new vm.Script(code, { filename: 'contact form inline JS' });
}
const skipDirs = new Set(['node_modules','dist','.git','.vercel']);
const scan = dir => {
  for (const ent of fs.readdirSync(dir, { withFileTypes:true })) {
    if (ent.isDirectory()) { if (!skipDirs.has(ent.name)) scan(require('node:path').join(dir,ent.name)); continue; }
    if (!/\.(?:js|html|css|json|md|xml|txt|yml|rules)$/.test(ent.name) || ['package-lock.json','check-inline.js'].includes(ent.name)) continue;
    const path = require('node:path').join(dir, ent.name);
    if (/755[\s.-]*185[\s.-]*8583|917551858583/.test(fs.readFileSync(path,'utf8')))
      throw new Error('Old contact number remains in '+path);
  }
};
scan('.');

console.log('Inline JS syntax checked (' + checked + ' blocks); static storefront assertions passed.');
