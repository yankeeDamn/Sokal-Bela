// Copies the static site into ./dist so Vercel always has an explicit folder to serve.
// Contact-dependent share images and metadata are generated from the same config as the storefront.
const fs = require('fs');
const path = require('path');
const contact = require('./config/contact.mjs').default;
const renderShareCard = require('./scripts/render-share-card');

const SRC = __dirname;
const OUT = path.join(SRC, 'dist');
const SKIP = new Set([
  'dist', 'src', 'api', 'backend', 'scripts', 'node_modules', '.git', '.github', '.vercel',
  'local-server.js', 'build.js', 'vercel.json', 'package.json', 'package-lock.json',
  'admin.html', 'admin.js', 'app.js', 'style.css', 'db-operations.js', 'notifications.js', 'razorpay-integration.js', 'lib',
  '.vercelignore', '.gitignore', '.env', '.env.example', '.firebaserc', 'firebase.json',
  'firestore.rules', 'storage.rules', 'README.md', 'BUSINESS-SETUP.md'
]);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let count = 0;
for (const name of fs.readdirSync(SRC)) {
  if (SKIP.has(name) || name.endsWith('.zip') || name.startsWith('.env')) continue;
  if (name.endsWith('.html')) {
    const html = fs.readFileSync(path.join(SRC, name), 'utf8');
    const image = '/public/images/og-cover.png';
    fs.writeFileSync(path.join(OUT, name), html.replaceAll(image + '"', image + '?v=' + contact.phone + '"'));
  } else {
    fs.cpSync(path.join(SRC, name), path.join(OUT, name), { recursive: true });
  }
  count++;
}

renderShareCard(path.join(OUT, 'public', 'images'));

// Only the shopper projection is served. The editable source may contain private supplier codes.
const { publicCatalog } = require('./js/partner/catalog.mjs');
const catalog = publicCatalog(require('./src/data/partnerProducts.js'));
fs.writeFileSync(path.join(OUT, 'public', 'partner-catalog.json'), JSON.stringify(catalog));

if (!fs.existsSync(path.join(OUT, 'index.html'))) {
  console.error('BUILD FAILED: index.html not found in project root');
  process.exit(1);
}
console.log(`Built ${count} entries into dist/ (index.html OK)`);
