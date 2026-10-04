/* Dynamic vegetable image mapping with reliable local fallbacks */
(function (global) {
  'use strict';

  const PUBLIC_BASE = './public/images';
  const FALLBACK_IMG = `${PUBLIC_BASE}/veg-fallback.svg`;

  const IMAGES = [
    { keys: ['potato', 'alu', 'আলু', 'आলু'], url: `${PUBLIC_BASE}/potato.svg` },
    { keys: ['tomato', 'টমেটো', 'टमाटর'], url: `${PUBLIC_BASE}/tomato.svg` },
    { keys: ['onion', 'peyaj', 'পেঁয়াজ', 'प्याज'], url: `${PUBLIC_BASE}/onion.svg` },
    { keys: ['green chili', 'green chilli', 'chili', 'chilli', 'কাঁচা মরিচ', 'हरी मिर्च', 'mirch'], url: `${PUBLIC_BASE}/chili.svg` },
    { keys: ['brinjal', 'eggplant', 'aubergine', 'begun', 'বেগুন', 'बैंगन'], url: `${PUBLIC_BASE}/veg-fallback.svg` },
    { keys: ['spinach', 'palak', 'পালং', 'पालक'], url: `${PUBLIC_BASE}/spinach.svg` },
    { keys: ['cauliflower', 'phulkopi', 'ফুলকপি', 'फूलगोभी'], url: `${PUBLIC_BASE}/cauliflower.svg` },
    { keys: ['cabbage', 'bandhakopi', 'বাঁধাকপি', 'पत्ता गोभी', 'पत्तागोभी'], url: `${PUBLIC_BASE}/cabbage.svg` },
    { keys: ['bitter gourd', 'karela', 'করला', 'करेला'], url: `${PUBLIC_BASE}/bitter-gourd.svg` },
    { keys: ['bottle gourd', 'lau', 'লাউ', 'लौकी'], url: `${PUBLIC_BASE}/bottle-gourd.svg` },
    { keys: ['carrot', 'গাজর', 'गाजर'], url: `${PUBLIC_BASE}/carrot.svg` },
    { keys: ['garlic', 'রসুন', 'लहसुन'], url: `${PUBLIC_BASE}/veg-fallback.svg` },
    { keys: ['ginger', 'আদা', 'अदरक'], url: `${PUBLIC_BASE}/ginger.svg` },
    { keys: ['cucumber', 'শসা', 'खीरा'], url: `${PUBLIC_BASE}/cucumber.svg` },
    { keys: ['lemon', 'লেবু', 'नींबू'], url: `${PUBLIC_BASE}/lemon.svg` }
  ];

  const BEST_PRICE_KEYS = ['potato', 'onion', 'tomato', 'alu', 'peyaj', 'আলু', 'পেঁয়াজ', 'টমেটো', 'आलू', 'प्याज', 'टमाटर'];

  function haystack(product) {
    if (!product) return '';
    if (typeof product === 'string') return product.toLowerCase();
    return [product.name, product.bengaliName, product.hindiName, product.id, product.displayName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  function getVegImage(product) {
    const text = haystack(product);
    for (const entry of IMAGES) {
      if (entry.keys.some((k) => text.includes(k.toLowerCase()))) return entry.url;
    }
    if (product && typeof product === 'object' && product.imageUrl) return product.imageUrl;
    return FALLBACK_IMG;
  }

  function isBestPriceItem(product) {
    const text = haystack(product);
    return BEST_PRICE_KEYS.some((k) => text.includes(k.toLowerCase()));
  }

  function vegImgTag(product, alt) {
    const url = getVegImage(product);
    const label = alt || (product && (product.displayName || product.name)) || 'Vegetable';
    const emoji = (global.emoji && product && typeof product === 'object') ? global.emoji(product) : '🥬';
    return '<img src="' + url + '" alt="' + label + '" loading="lazy" decoding="async" ' +
      'onerror="this.onerror=null;this.src=\'' + FALLBACK_IMG + '\';this.addEventListener(\'error\',function(){this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'prod-emoji\',textContent:\'' + emoji + '\'}));},{once:true});">';
  }

  global.VEG_IMAGES = { getVegImage, isBestPriceItem, vegImgTag, FALLBACK_IMG };
})(window);
