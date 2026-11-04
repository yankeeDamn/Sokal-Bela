export const FALLBACK_IMAGE = '/public/images/partner-goods.svg';
export const DEFAULT_DELIVERY = '🚚 3–5 Days Delivery in Rampurhat';
export const DRAFT_KEY = 'sb_partner_products_v1';
export const EVERYDAY = 'Other Everyday Items';
export const PARTNER_DEPARTMENTS = ['Beauty & Health', 'Home & Kitchen', EVERYDAY];
export const EVERYDAY_GROUPS = ['Sports & Fitness', 'Gardening'];
export const PLATFORMS = {
  Meesho: 'Meesho Resell (COD Available)',
  Amazon: 'Amazon Deals',
  Flipkart: 'Flipkart Specials'
};
const AFFILIATE_HOSTS = {
  Amazon: ['www.amazon.in', 'amazon.in', 'amzn.in', 'amzn.to', 'amzn.eu', 'a.co'],
  Flipkart: ['www.flipkart.com', 'flipkart.com', 'dl.flipkart.com', 'fkrt.it', 'fkrt.co', 'fktr.in']
};

export function affiliateUrl(value, platform) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        AFFILIATE_HOSTS[platform]?.includes(url.hostname)) return url.href;
  } catch { /* Show validation feedback to the author. */ }
  return '';
}

function imageUrl(value) {
  if (typeof value !== 'string') return '';
  if (/^\/public\/images\/[\w-]+\.(?:svg|png|webp|jpe?g|avif)(?:#[\w-]+)?$/i.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* Use a local illustration for missing photos. */ }
  return '';
}

function textField(value, name, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new Error('Enter a valid ' + name + '.');
  return value.trim();
}

// The owner confirms the power requirement. Also catch common powered goods put in an allowed department.
function checkAssortment({ category, subcategory, nonElectric, titleEn, titleBn, tags }) {
  if (!PARTNER_DEPARTMENTS.includes(category)) throw new Error('Choose a Partner Store department.');
  const allowedGroups = category === EVERYDAY ? EVERYDAY_GROUPS : [''];
  if (!allowedGroups.includes(subcategory))
    throw new Error('Choose Sports & Fitness or Gardening only for Other Everyday Items.');
  if (nonElectric !== true) throw new Error('Confirm that this product works without electricity or batteries.');
  const names = [titleEn, titleBn, ...tags].join('\n').normalize('NFKC').toLowerCase()
    .replace(/\b(?:non[- ]?electric(?:al)?|electric[- ]blue|battery[- ]free|(?:without|no) (?:batteries|battery|electricity))\b|অবৈদ্যুতিক|ব্যাটারি ছাড়া/gu, '');
  const powered = /\b(?:electric(?:al)?|electronics?|rechargeable|batter(?:y|ies)[- ](?:operated|powered)|motori[sz]ed|(?:usb|mains|solar)[- ]powered|bluetooth|smartwatch|power bank|led (?:bulb|light)|digital (?:kitchen |weighing )?scale)\b|বৈদ্যুতিক|বিদ্যুৎচালিত|ইলেকট্রিক|ইলেকট্রনিক|রিচার্জেবল|ব্যাটারি[- ]?চালিত|এলইডি (?:বাল্ব|লাইট)/u;
  if (powered.test(names)) throw new Error('Powered products cannot be listed in the Partner Store.');
}

export function normalizeProduct(row) {
  const id = textField(row.id, 'product ID', 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) throw new Error('Invalid product ID.');
  const titleEn = textField(row.titleEn, 'English title'), titleBn = textField(row.titleBn, 'Bengali title');
  const tags = Array.isArray(row.tags) ? row.tags.filter(t => typeof t === 'string').map(t => t.trim()).filter(Boolean) : [];
  const category = textField(row.category, 'department', 80);
  const subcategory = row.subcategory ? textField(row.subcategory, 'everyday group', 80) : '';
  const { platform, fulfillmentMode, sellingPrice, mrp } = row;
  if (!Object.hasOwn(PLATFORMS, platform)) throw new Error('Choose a supported platform.');
  const resell = platform === 'Meesho';
  if (fulfillmentMode !== (resell ? 'whatsapp_cod' : 'affiliate_redirect'))
    throw new Error('Choose WhatsApp for Meesho or retailer checkout for Amazon and Flipkart.');
  if (![sellingPrice, mrp].every(n => Number.isFinite(n) && n > 0 && n <= 10000000 && Number(n.toFixed(2)) === n) || mrp < sellingPrice)
    throw new Error('Enter positive INR prices with up to two decimals. MRP must cover the selling price.');
  const externalUrl = resell ? '' : affiliateUrl(row.externalUrl, platform);
  if (!resell && !externalUrl) throw new Error('Use an HTTPS product or affiliate link from ' + platform + '.');
  const images = Array.isArray(row.images) ? row.images.filter(Boolean).map(imageUrl) : [];
  if (images.includes('')) throw new Error('Use an HTTPS image URL or a bundled product illustration.');
  const product = {
    id, titleEn, titleBn, category, subcategory, nonElectric: row.nonElectric,
    platform, fulfillmentMode, sellingPrice, mrp,
    discountPercent: Math.round(100 * (mrp - sellingPrice) / mrp),
    images: images.length ? images : [FALLBACK_IMAGE], externalUrl,
    supplierCode: typeof row.supplierCode === 'string' ? row.supplierCode.trim() : '',
    deliveryBadge: textField(row.deliveryBadge || DEFAULT_DELIVERY, 'delivery badge'),
    codAvailable: resell && (row.codAvailable ?? true) === true,
    inStock: (row.inStock ?? true) === true, featured: row.featured === true,
    tags,
    sample: row.sample === true
  };
  checkAssortment(product);
  return product;
}

export function publicProduct(row) {
  const { supplierCode, ...publicFields } = normalizeProduct(row);
  return publicFields;
}

export function publicCatalog(rows) {
  const products = rows.map(publicProduct);
  if (new Set(products.map(p => p.id)).size !== products.length) throw new Error('Duplicate partner product ID.');
  return { products, privateReferences: rows.some(p => Boolean(p.supplierCode?.trim())) };
}

function storedRows(storage) {
  const rows = JSON.parse(storage.getItem(DRAFT_KEY) || '[]');
  if (!Array.isArray(rows)) throw new Error('Invalid local catalogue.');
  return rows;
}

export function readDrafts(storage) {
  let rows;
  try { rows = storedRows(storage); } catch { return []; }
  return rows.flatMap(row => {
    try { return [normalizeProduct(row)]; } catch { return []; }
  });
}

// Older device drafts remain private until the owner reviews them under the new assortment.
export function unreviewedDrafts(storage) {
  let rows;
  try { rows = storedRows(storage); } catch { return []; }
  return rows.filter(row => row && typeof row.id === 'string' && typeof row.titleEn === 'string' && row.nonElectric !== true);
}

export function saveLocalDraft(storage, row) {
  const approved = normalizeProduct(row);
  const saved = storedRows(storage).filter(old => old?.id !== approved.id);
  storage.setItem(DRAFT_KEY, JSON.stringify([...saved, approved]));
}

// Once a local draft ships, the deployed version wins, even on its original device.
export function withDrafts(base, drafts) {
  const all = new Map(base.map(p => [p.id, p]));
  for (const p of drafts) if (!all.has(p.id)) all.set(p.id, p);
  return [...all.values()];
}

export function categories(rows) {
  return [...new Set(rows.map(p => p.category))];
}

export function everydayGroups(rows) {
  return [...new Set(rows.filter(p => p.category === EVERYDAY).map(p => p.subcategory))];
}

export function filterCatalog(rows, { category = '', subcategory = '', platform = '', search = '', sort = 'featured' } = {}) {
  const query = search.trim().normalize('NFC').toLowerCase();
  const found = rows.filter(p =>
    (!category || p.category === category) && (!subcategory || p.subcategory === subcategory) &&
    (!platform || (p.platform === platform && (platform !== 'Meesho' || p.codAvailable))) &&
    (!query || [p.titleEn, p.titleBn, p.category, p.subcategory, ...p.tags].some(s => s.normalize('NFC').toLowerCase().includes(query)))
  );
  const comparisons = {
    featured: (a, b) => Number(b.featured) - Number(a.featured),
    low: (a, b) => a.sellingPrice - b.sellingPrice,
    high: (a, b) => b.sellingPrice - a.sellingPrice,
    discount: (a, b) => b.discountPercent - a.discountPercent
  };
  return found.sort(comparisons[sort] || comparisons.featured);
}

export function sourceCode(rows) {
  const header = '// Private authoring catalogue. Only confirmed non-electric items may be listed.\n';
  return header + 'module.exports = ' + JSON.stringify(rows.map(normalizeProduct), null, 2) + ';\n';
}

export function readAuthorFile(source, expected) {
  // Parse the generator's JSON array only. Never execute an uploaded JavaScript file.
  const match = /^(?:\s*\/\/[^\n]*(?:\n|$))*\s*module\.exports\s*=\s*(\[[\s\S]*\])\s*;?\s*$/.exec(source);
  if (!match) throw new Error('Choose the current src/data/partnerProducts.js from your repository.');
  const rows = JSON.parse(match[1]);
  const projected = publicCatalog(rows);
  if (JSON.stringify(projected.products) !== JSON.stringify(expected.products) ||
      projected.privateReferences !== expected.privateReferences)
    throw new Error('That file does not match this deployment. Select its current catalogue.');
  return rows.map(normalizeProduct);
}
