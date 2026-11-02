// Copies the static site into ./dist so Vercel always has an explicit folder to serve.
// No frontend file is modified; files are copied exactly as they are.
const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const OUT = path.join(SRC, 'dist');
const SKIP = new Set([
  'dist', 'api', 'backend', 'scripts', 'node_modules', '.git', '.github', '.vercel',
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
  fs.cpSync(path.join(SRC, name), path.join(OUT, name), { recursive: true });
  count++;
}

if (!fs.existsSync(path.join(OUT, 'index.html'))) {
  console.error('BUILD FAILED: index.html not found in project root');
  process.exit(1);
}
console.log(`Built ${count} entries into dist/ (index.html OK)`);
