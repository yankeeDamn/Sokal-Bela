/* Vegetable image mapping with reliable local fallbacks.
 *
 * Rule: the picture always matches the product NAME.
 *   1. If the name is recognised (English, Bengali or Hindi), the built-in picture for that
 *      vegetable is used - whatever image path is stored in the database. (Old data had e.g.
 *      Cauliflower pointing at carrot.svg.)
 *   2. Otherwise the Image URL set in Admin is used, if it is a real photo link.
 *   3. Otherwise a neutral fallback picture.
 *
 * Want your own uploaded photos to win over the built-in pictures? Set PREFER_OWN_PHOTOS = true.
 */
(function (global) {
  'use strict';

  const PREFER_OWN_PHOTOS = false;
  const PUBLIC_BASE = '/public/images';
  const FALLBACK_IMG = `${PUBLIC_BASE}/veg-fallback.svg`;

  function assetPath(fileName) {
    if (!fileName) return FALLBACK_IMG;
    if (/^(https?:|data:)/i.test(fileName)) return fileName;
    if (fileName.startsWith('/') || fileName.startsWith('./') || fileName.startsWith('../')) return fileName;
    return `${PUBLIC_BASE}/${fileName}`;
  }

  /* More specific names must come BEFORE generic ones
     (e.g. "bitter gourd" before anything that could match "gourd"). */
  const IMAGES = [
    { keys: ['bitter gourd', 'bitter melon', 'karela', 'korola', 'উচ্ছে', 'করলা', 'करेला'], file: 'bitter-gourd.svg' },
    { keys: ['bottle gourd', 'lau', 'lauki', 'লাউ', 'लौकी'], file: 'bottle-gourd.svg' },
    { keys: ['capsicum', 'bell pepper', 'shimla', 'ক্যাপসিকাম', 'शिमला मिर्च'], file: 'capsicum.svg' },
    { keys: ['green chili', 'green chilli', 'chili', 'chilli', 'chile', 'morich', 'mirch', 'কাঁচা মরিচ', 'কাঁচালঙ্কা', 'লঙ্কা', 'हरी मिर्च', 'मिर्च'], file: 'chili.svg' },
    { keys: ['potato', 'alu', 'aloo', 'আলু', 'आलू'], file: 'potato.svg' },
    { keys: ['tomato', 'টমেটো', 'टमाटर'], file: 'tomato.svg' },
    { keys: ['onion', 'peyaj', 'piyaj', 'পেঁয়াজ', 'প্যাঁজ', 'प्याज'], file: 'onion.svg' },
    { keys: ['brinjal', 'eggplant', 'aubergine', 'begun', 'baingan', 'বেগুন', 'बैंगन'], file: 'brinjal.svg' },
    { keys: ['spinach', 'palak', 'palong', 'পালং', 'পালংশাক', 'पालक'], file: 'spinach.svg' },
    { keys: ['leafy greens', 'leafy green', 'greens', 'shak', 'saag', 'sag', 'শাক', 'साग'], file: 'leafy-greens.svg' },
    { keys: ['cauliflower', 'phulkopi', 'phulkopi', 'ফুলকপি', 'फूलगोभी', 'फूल गोभी'], file: 'cauliflower.svg' },
    { keys: ['cabbage', 'bandhakopi', 'bandhakopi', 'বাঁধাকপি', 'पत्ता गोभी', 'पत्तागोभी', 'बंद गोभी'], file: 'cabbage.svg' },
    { keys: ['carrot', 'gajar', 'গাজর', 'गाजर'], file: 'carrot.svg' },
    { keys: ['garlic', 'roshun', 'lahsun', 'রসুন', 'लहसुन'], file: 'garlic.svg' },
    { keys: ['ginger', 'ada', 'adrak', 'আদা', 'अदरक'], file: 'ginger.svg' },
    { keys: ['cucumber', 'sosha', 'kheera', 'শসা', 'खीरा'], file: 'cucumber.svg' },
    { keys: ['lemon', 'lime', 'lebu', 'nimbu', 'লেবু', 'নেবু', 'नींबू'], file: 'lemon.svg' },
    { keys: ['okra', 'ladies finger', "lady's finger", 'ladyfinger', 'bhindi', 'dherosh', 'ঢেঁড়স', 'ভেন্ডি', 'भिंडी'], file: 'okra.svg' },
    { keys: ['pumpkin', 'kumro', 'kaddu', 'কুমড়া', 'কুমড়ো', 'मीठा कद्दू', 'कद्दू'], file: 'pumpkin.svg' },
    { keys: ['radish', 'mulo', 'muli', 'mooli', 'মুলো', 'মূলা', 'मूली'], file: 'radish.svg' },
    { keys: ['beetroot', 'beet', 'chukandar', 'বিট', 'চুকন্দর', 'चुकंदर'], file: 'beetroot.svg' }
  ].map((entry) => ({ keys: entry.keys, url: assetPath(entry.file) }));

  const BEST_PRICE_KEYS = ['potato', 'onion', 'tomato', 'alu', 'peyaj', 'আলু', 'পেঁয়াজ', 'টমেটো', 'आलू', 'प्याज', 'टमाटर'];

  /* Keep letters, combining marks (vowel signs) and digits from ANY script,
     so Bengali and Devanagari names can be matched too. */
  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const ASCII_ONLY = /^[a-z0-9 ]+$/;

  /* Latin keys must match whole words ("alu" must not match "valuable");
     Bengali / Hindi keys are matched as substrings because those scripts
     attach suffixes to words. */
  function matchesKey(normalizedText, key) {
    const needle = normalizeText(key);
    if (!needle) return false;
    if (ASCII_ONLY.test(needle)) {
      // whole word, optionally plural: potato / potatoes, chilli / chillies, onion / onions
      const padded = ' ' + normalizedText + ' ';
      return [' ', 's ', 'es '].some((ending) => padded.includes(' ' + needle + ending));
    }
    return normalizedText.includes(needle);
  }

  function haystack(product) {
    if (!product) return '';
    if (typeof product === 'string') return product;
    return [product.name, product.nameEn, product.name_en, product.bengaliName, product.nameBn, product.name_bn,
      product.hindiName, product.nameHi, product.name_hi, product.displayName, product.id]
      .filter(Boolean)
      .join(' ');
  }

  function resolveLocalImage(value) {
    if (!value || typeof value !== 'string') return '';
    const cleaned = value.trim();
    if (!cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned.includes('placeholder')) return '';
    return assetPath(cleaned);
  }

  function findBundledImage(product) {
    const text = normalizeText(haystack(product));
    if (!text) return '';
    for (const entry of IMAGES) {
      if (entry.keys.some((k) => matchesKey(text, k))) return entry.url;
    }
    return '';
  }

  /* A path inside /public/images is one of our own built-in pictures, not an owner's photo. */
  function isBundledPath(url) {
    return typeof url === 'string' && url.indexOf(PUBLIC_BASE + '/') === 0;
  }

  function getVegImage(product) {
    const raw = product && typeof product === 'object'
      ? resolveLocalImage(product.imageUrl || product.image || (Array.isArray(product.images) ? product.images[0] : ''))
      : '';
    const ownPhoto = raw && !isBundledPath(raw) ? raw : '';
    if (PREFER_OWN_PHOTOS && ownPhoto) return ownPhoto;
    // Picture that matches the name -> owner's photo for things we have no picture of -> neutral fallback.
    return findBundledImage(product) || ownPhoto || FALLBACK_IMG;
  }

  /* The bundled illustration for a product, if there is one (used as the
     second attempt when the owner's own image fails to load). */
  function getBundledImage(product) {
    return findBundledImage(product) || FALLBACK_IMG;
  }

  function isBestPriceItem(product) {
    const text = normalizeText(haystack(product));
    return BEST_PRICE_KEYS.some((k) => matchesKey(text, k));
  }

  function escAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Ready-made <img> markup with a two-step fallback:
     own image -> bundled illustration -> emoji. */
  function vegImgTag(product, alt) {
    const url = getVegImage(product);
    const label = alt || (product && (product.displayName || product.name)) || 'Vegetable';
    const emoji = (typeof global.emoji === 'function' && product && typeof product === 'object') ? global.emoji(product) : '🥬';
    return '<img src="' + escAttr(url) + '" alt="' + escAttr(label) + '" loading="lazy" decoding="async"' +
      ' data-fallback="' + escAttr(getBundledImage(product)) + '" data-e="' + escAttr(emoji) + '"' +
      ' onerror="if(window.vegImgError)vegImgError(this)">';
  }

  global.VEG_IMAGES = { getVegImage, getBundledImage, isBestPriceItem, vegImgTag, FALLBACK_IMG };

})(window);
