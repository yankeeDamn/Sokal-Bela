/* Dynamic vegetable image mapping with reliable local fallbacks */
(function (global) {
  'use strict';

  const PUBLIC_BASE = '/public/images';
  const FALLBACK_IMG = `${PUBLIC_BASE}/veg-fallback.svg`;

  function assetPath(fileName) {
    if (!fileName) return FALLBACK_IMG;
    if (fileName.startsWith('http://') || fileName.startsWith('https://') || fileName.startsWith('data:')) return fileName;
    if (fileName.startsWith('/')) return fileName;
    if (fileName.startsWith('./') || fileName.startsWith('../')) return fileName;
    return `${PUBLIC_BASE}/${fileName}`;
  }

  const IMAGES = [
    { keys: ['potato', 'alu', 'আলু', 'आलू'], url: assetPath('potato.svg') },
    { keys: ['tomato', 'টমেটো', 'टमाटর'], url: assetPath('tomato.svg') },
    { keys: ['onion', 'peyaj', 'পেঁয়াজ', 'प्याज'], url: assetPath('onion.svg') },
    { keys: ['green chili', 'green chilli', 'chili', 'chilli', 'কাঁচা মরিচ', 'हरी मिर्च', 'mirch'], url: assetPath('chili.svg') },
    { keys: ['brinjal', 'eggplant', 'aubergine', 'begun', 'বেগুন', 'बैंगन'], url: FALLBACK_IMG },
    { keys: ['spinach', 'palak', 'পালং', 'पालक'], url: assetPath('spinach.svg') },
    { keys: ['cauliflower', 'phulkopi', 'ফুলকপি', 'ফুলगोभी'], url: assetPath('cauliflower.svg') },
    { keys: ['cabbage', 'bandhakopi', 'বাঁধাকপি', 'पत्ता गोभी', 'पत्तागोभी'], url: assetPath('cabbage.svg') },
    { keys: ['bitter gourd', 'karela', 'করলা', 'करेला'], url: assetPath('bitter-gourd.svg') },
    { keys: ['bottle gourd', 'lau', 'লাউ', 'लौकी'], url: assetPath('bottle-gourd.svg') },
    { keys: ['carrot', 'গাজর', 'गाजর'], url: assetPath('carrot.svg') },
    { keys: ['garlic', 'রসুন', 'लहसुन'], url: FALLBACK_IMG },
    { keys: ['ginger', 'আদা', 'अदरक'], url: assetPath('ginger.svg') },
    { keys: ['cucumber', 'শসা', 'खीरा'], url: assetPath('cucumber.svg') },
    { keys: ['lemon', 'লেবু', 'नींबू'], url: assetPath('lemon.svg') }
  ];

  const BEST_PRICE_KEYS = ['potato', 'onion', 'tomato', 'alu', 'peyaj', 'আলু', 'পেঁয়াজ', 'টমেটো', 'आलू', 'प्याज', 'टमाटर'];

  function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9ঀ-৿]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function matchesKey(sourceText, key) {
    const text = normalizeText(sourceText);
    const needle = normalizeText(key);
    if (!needle) return false;
    return text.includes(needle) || text.replace(/\s+/g, '').includes(needle.replace(/\s+/g, ''));
  }

  function haystack(product) {
    if (!product) return '';
    if (typeof product === 'string') return product;
    return [product.name, product.bengaliName, product.hindiName, product.id, product.displayName]
      .filter(Boolean)
      .join(' ');
  }

  function resolveLocalImage(value) {
    if (!value) return '';
    if (typeof value !== 'string') return '';
    const cleaned = value.trim();
    if (!cleaned || cleaned === 'null' || cleaned.includes('placeholder')) return '';
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('data:')) return cleaned;
    if (cleaned.startsWith('/')) return cleaned;
    if (cleaned.startsWith('./') || cleaned.startsWith('../')) return cleaned;
    return `${PUBLIC_BASE}/${cleaned}`;
  }

  function getVegImage(product) {
    const text = haystack(product);
    for (const entry of IMAGES) {
      if (entry.keys.some((k) => matchesKey(text, k))) return entry.url;
    }

    const productUrl = product && typeof product === 'object' ? (product.imageUrl || product.image || '') : '';
    const normalizedUrl = resolveLocalImage(productUrl);
    if (normalizedUrl) return normalizedUrl;
    return FALLBACK_IMG;
  }

  function isBestPriceItem(product) {
    const text = haystack(product);
    return BEST_PRICE_KEYS.some((k) => matchesKey(text, k));
  }

  function vegImgTag(product, alt) {
    const url = getVegImage(product);
    const label = alt || (product && (product.displayName || product.name)) || 'Vegetable';
    const safeLabel = String(label).replace(/\\/g, '\\\\').replace(/"/g, '&quot;');
    const safeUrl = String(url).replace(/\\/g, '\\\\');
    return '<img src="' + safeUrl + '" alt="' + safeLabel + '" loading="lazy" decoding="async" onerror="if (typeof vegImgError === \"function\") vegImgError(this);">';
  }

  global.VEG_IMAGES = { getVegImage, isBestPriceItem, vegImgTag, FALLBACK_IMG };

})(window);
