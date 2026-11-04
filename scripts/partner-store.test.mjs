import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';
import { storeAccess } from '../config/commerce.mjs';
import { affiliateUrl, categories, DRAFT_KEY, EVERYDAY, everydayGroups, FALLBACK_IMAGE, filterCatalog, normalizeProduct, publicCatalog, readAuthorFile, readDrafts, saveLocalDraft, sourceCode, unreviewedDrafts, withDrafts } from '../js/partner/catalog.mjs';
import { orderMessage } from '../js/partner/PartnerOrderModal.mjs';
import raw from '../src/data/partnerProducts.js';
import { SOKAL_BELA_PHONE, SOKAL_BELA_WHATSAPP, whatsappUrl } from '../config/contact.mjs';

const rows = raw.map(normalizeProduct);
const cod = rows.find(p => p.platform === 'Meesho');
const retail = rows.find(p => p.platform === 'Amazon');
const data = { name: 'পরীক্ষা', phone: '9876543210', address: 'A & B, Station Road', quantity: '2' };
function memoryStorage() {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
}

test('preview is opt-in, persists per device, can be relocked, and works without storage', () => {
  const storage = memoryStorage();
  assert.deepEqual(storeAccess('', storage, false), { visible: false, admin: false });
  assert.equal(storeAccess('?preview=1', storage, false).visible, false);
  assert.equal(storeAccess('?preview=true', storage, false).visible, true);
  assert.equal(storeAccess('', storage, false).visible, true);
  assert.equal(storeAccess('?preview=false', storage, false).visible, false);
  assert.equal(storeAccess('', storage, false).visible, false);
  assert.deepEqual(storeAccess('?admin=sokal247', undefined, false), { visible: true, admin: true });
  assert.equal(storeAccess('?preview=true', undefined, false).visible, true);
  assert.equal(storeAccess('?admin=wrong', undefined, false).visible, false);
  assert.equal(storeAccess('', storage, true).visible, true);
});

test('catalogue derives discounts, unique categories, sorts and bilingual search', () => {
  assert.equal(rows.length, 8);
  assert.deepEqual(categories(rows), ['Beauty & Health', 'Home & Kitchen', 'Other Everyday Items']);
  assert.deepEqual(everydayGroups(rows), ['Sports & Fitness', 'Gardening']);
  assert.equal(new Set(rows.map(p => p.platform)).size, 3);
  assert.ok(rows.every(p => p.nonElectric === true));
  const newProduct = normalizeProduct({ ...cod, id: 'SB-NEW', category: EVERYDAY, subcategory: 'Gardening', tags: ['মাটি'], featured: true, images: [] });
  assert.deepEqual(newProduct.images, [FALLBACK_IMAGE]);
  const catalogue = [...rows, newProduct];
  assert.ok(filterCatalog(catalogue, { search: 'মাটি' }).some(p => p.id === 'SB-NEW'));
  for (const group of everydayGroups(rows)) {
    const found = filterCatalog(catalogue, { category: EVERYDAY, subcategory: group });
    assert.ok(found.length && found.every(p => p.category === EVERYDAY && p.subcategory === group));
    assert.equal(filterCatalog(catalogue, { search: group.toLowerCase() }).length, found.length);
  }
  assert.ok(filterCatalog(rows, { search: retail.titleBn, platform: 'Amazon' }).some(p => p.id === retail.id));
  assert.equal(filterCatalog(rows, { category: EVERYDAY, subcategory: 'Gardening', platform: 'Amazon' }).length, 0);
  for (const [sort, field, direction] of [['low','sellingPrice',1], ['high','sellingPrice',-1], ['discount','discountPercent',-1], ['featured','featured',-1]]) {
    const items = filterCatalog(rows,{ sort });
    assert.ok(items.every((p,i) => !i || (p[field] - items[i-1][field]) * direction >= 0));
  }
  assert.equal(normalizeProduct({ ...cod, sellingPrice: 250, mrp: 500, discountPercent: 2 }).discountPercent, 50);
});

test('build, export and local previews enforce the non-electric assortment', () => {
  for (const bad of [
    { category: 'Daily Electronics' }, { category: 'Fashion & Sarees' }, { nonElectric: false },
    { nonElectric: undefined }, { category: EVERYDAY, subcategory: '' }, { category: EVERYDAY, subcategory: 'Electronics' },
    { titleEn: 'Electric kitchen kettle' }, { titleBn: 'ব্যাটারিচালিত পাম্প' },
    { titleEn: 'USB-powered desk fan' }, { tags: ['rechargeable'] }
  ]) {
    const row = { ...cod, ...bad };
    assert.throws(() => publicCatalog([row]));
    assert.throws(() => sourceCode([row]));
    assert.throws(() => saveLocalDraft(memoryStorage(), row));
  }
  assert.doesNotThrow(() => normalizeProduct({ ...cod, titleEn: 'Non-electric battery-free manual chopper' }));
  assert.throws(() => orderMessage({ ...cod, nonElectric: false }, data));
});

test('older device drafts stay off the storefront and keep private details until individually reviewed', () => {
  const storage = memoryStorage();
  const older = { ...retail, id: 'saved-manual', category: 'Kitchen & Home', nonElectric: undefined, supplierCode: 'mine' };
  const oldScale = { ...retail, id: 'saved-scale', titleEn: 'Digital kitchen scale', category: 'Daily Electronics', nonElectric: undefined };
  storage.setItem(DRAFT_KEY, JSON.stringify([older, oldScale]));
  assert.deepEqual(readDrafts(storage), []);
  saveLocalDraft(storage, { ...cod, id: 'new-manual' });
  assert.deepEqual(unreviewedDrafts(storage).map(p => p.id), ['saved-manual','saved-scale']);
  saveLocalDraft(storage, { ...older, category: 'Home & Kitchen', nonElectric: true });
  assert.equal(readDrafts(storage).find(p => p.id === older.id).supplierCode, 'mine');
  assert.deepEqual(unreviewedDrafts(storage).map(p => p.id), ['saved-scale']);
  assert.ok(!sourceCode(readDrafts(storage)).includes('saved-scale'));
});

test('validated links, stocks and prices guard each fulfilment path', () => {
  for (const link of ['javascript:alert(1)', 'https://www.amazon.in.evil.example/a', 'https://evil.example@www.amazon.in/x'])
    assert.equal(affiliateUrl(link, 'Amazon'), '');
  assert.equal(affiliateUrl(retail.externalUrl, 'Flipkart'), '');
  assert.throws(() => normalizeProduct({ ...retail, fulfillmentMode: 'whatsapp_cod' }));
  assert.throws(() => normalizeProduct({ ...retail, sellingPrice: Infinity }));
  assert.throws(() => normalizeProduct({ ...retail, images: ['javascript:alert(1)'] }));
  assert.throws(() => publicCatalog([cod, cod]), /Duplicate/);
  assert.equal(normalizeProduct({ ...cod, externalUrl: 'https://example.org/private' }).externalUrl, '');
  assert.equal(normalizeProduct({ ...cod, codAvailable: false }).codAvailable, false);
});

test('WhatsApp order draft is encoded, has no vegetable minimum, and requires a valid address and quantity', () => {
  const small = { ...cod, sellingPrice: 79 };
  const text = orderMessage(small, data);
  const url = new URL(whatsappUrl(text));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/' + SOKAL_BELA_WHATSAPP);
  assert.equal(SOKAL_BELA_WHATSAPP, '91' + SOKAL_BELA_PHONE);
  assert.equal(url.searchParams.get('text'), text);
  for (const part of [small.titleEn, small.titleBn, small.id, 'Meesho', '₹79', '₹158', 'Cash on Delivery', 'Qty:* 2', data.address, data.name, data.phone, 'Rampurhat (731224)', '3–5 Days'])
    assert.ok(text.includes(part), part);
  for (const values of [{ quantity: '0' }, { quantity: '1.1' }, { quantity: '100' }, { name: ' ' }, { address: '' }, { phone: '123' }])
    assert.throws(() => orderMessage(small, { ...data, ...values }));
  assert.throws(() => orderMessage({ ...cod, inStock: false }, data));
  assert.throws(() => orderMessage(retail, data));
});

test('local drafts never write fresh cart keys and deployed records take precedence', () => {
  const storage = memoryStorage(), freshKey = 'sb_cart_v2_guest';
  storage.setItem(freshKey, '[{"id":"alu","qty":3}]');
  storage.setItem(DRAFT_KEY, 'not-json'); assert.deepEqual(readDrafts(storage), []);
  const local = { ...cod, id: 'NEW-1', supplierCode: 'local-private' };
  storage.setItem(DRAFT_KEY, JSON.stringify([null, local, { ...cod, sellingPrice: 1 }]));
  const combined = withDrafts(rows, readDrafts(storage));
  assert.equal(combined.length, rows.length + 1); assert.equal(combined.find(p => p.id === cod.id).sellingPrice, cod.sellingPrice);
  assert.equal(storage.getItem(freshKey), '[{"id":"alu","qty":3}]');
});

test('authoring export round-trips private refs without putting them in the public catalogue', () => {
  const secret = 'sample-private-supplier-ref';
  const input = rows.map((p, i) => ({...p, supplierCode: i === 0 ? secret : '', unknownPrivateNote: secret }));
  const published = publicCatalog(input);
  assert.equal(published.privateReferences, true);
  assert.ok(!JSON.stringify(published).includes(secret));
  assert.ok(!published.products.some(p => Object.hasOwn(p, 'supplierCode')));
  const file = sourceCode(input);
  const context = { module: {} }; vm.runInNewContext(file, context);
  assert.equal(context.module.exports[0].supplierCode, secret);
  assert.deepEqual(readAuthorFile(file, published), input.map(normalizeProduct));
  assert.throws(() => readAuthorFile('globalThis.hacked = true;', published));
  assert.throws(() => readAuthorFile(sourceCode(rows.slice(1)), published));
  assert.deepEqual(readAuthorFile(readFileSync(new URL('../src/data/partnerProducts.js', import.meta.url), 'utf8'), publicCatalog(rows)), rows);
});

test('the production builder excludes the private authoring file and emits a shopper-only snapshot', t => {
  const dir = mkdtempSync(join(tmpdir(), 'sokal-partner-build-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const path of ['public/images', 'src/data', 'js/partner', 'config', 'scripts']) mkdirSync(join(dir, path), { recursive: true });
  for (const path of ['build.js', 'js/partner/catalog.mjs', 'scripts/render-share-card.js', 'config/contact.mjs',
    ...['tomato','brinjal','carrot','cauliflower'].map(veg => 'public/images/' + veg + '.svg')])
    cpSync(new URL('../' + path, import.meta.url), join(dir, path));
  writeFileSync(join(dir, 'index.html'), '<meta property="og:image" content="/public/images/og-cover.png">');
  writeFileSync(join(dir, 'src/data/partnerProducts.js'), sourceCode([{ ...cod, supplierCode: 'test-private-code-012' }]));
  execFileSync(process.execPath, ['build.js'], {
    cwd: dir, env: { ...process.env, NODE_PATH: fileURLToPath(new URL('../node_modules', import.meta.url)) }
  });
  const cover = readFileSync(join(dir, 'dist/public/images/og-cover.png'));
  assert.deepEqual([cover.readUInt32BE(16), cover.readUInt32BE(20)], [1200, 630]);
  assert.ok(readFileSync(join(dir, 'dist/index.html'), 'utf8').includes('og-cover.png?v=' + SOKAL_BELA_PHONE));
  assert.equal(existsSync(join(dir, 'dist/src')), false);
  const artifact = readFileSync(join(dir, 'dist/public/partner-catalog.json'), 'utf8');
  assert.ok(!artifact.includes('test-private-code-012'));
  assert.ok(!artifact.includes('"supplierCode"'));
  assert.equal(JSON.parse(artifact).products[0].id, cod.id);
});
