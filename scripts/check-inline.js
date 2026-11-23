'use strict';
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
let checked = 0;
for (const [, tag, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=/.test(tag) || /\btype\s*=\s*["']application\/ld\+json/.test(tag)) continue;
  if (code.trim()) { new vm.Script(code, { filename: 'index.html inline script #' + (++checked) }); }
}
const neonHome = html.includes('/phase2-preview/app.js') && html.includes('id="product-grid"');
const checks = [
  [!html.includes('data-page="admin"'), 'Public navigation cannot link to the admin portal'],
  [!html.includes('id="admin-page"'), 'Public HTML cannot bundle admin page'],
  [!html.includes('admin123'), 'No demo credentials in the storefront'],
  [neonHome ? html.includes('/phase2-preview/style.css') : html.includes('type="module" src="/config/contact.mjs"'), 'Storefront styling/contact configuration present'],
  [neonHome ? !html.includes('signInWithEmailAndPassword') : html.includes('signInWithEmailAndPassword') && !html.includes('auth-tab-phone'), 'Storefront authentication is isolated from admin'],
  [neonHome ? html.includes('id="product-grid"') && html.includes('id="baskets"') : html.includes('id="featured-grid"') && html.includes('id="baskets-grid"'), 'Produce and baskets present']
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
    if (!/\.(?:m?js|html|css|json|md|xml|txt|yml|rules)$/.test(ent.name) || ['package-lock.json','check-inline.js'].includes(ent.name)) continue;
    const path = require('node:path').join(dir, ent.name);
    const source = fs.readFileSync(path, 'utf8');
    if (ent.name.endsWith('.html') && source.includes('data-contact-') && !source.includes('type="module" src="/config/contact.mjs"'))
      throw new Error('Contact controls need the shared contact module in ' + path);
    if (/(?:wa\.me\/|(?:api|web)\.whatsapp\.com\/send\?phone=|tel:)\+?\d|\+91[ -]?[6-9](?:[ -]?\d){9}\b/i.test(source))
      throw new Error('Use the shared contact config for business phone numbers in ' + path);
  }
};
scan('.');

console.log('Inline JS syntax checked (' + checked + ' blocks); static storefront assertions passed.');
