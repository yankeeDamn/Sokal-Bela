/* Dynamic vegetable image mapping with fallbacks */
(function (global) {
  'use strict';

  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=70';

  const IMAGES = [
    { keys: ['potato', 'alu', 'আলু', 'आलू'], url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=70' },
    { keys: ['tomato', 'টমেটো', 'टमाटर'], url: 'https://images.unsplash.com/photo-1546470427-e26264be0b0d?auto=format&fit=crop&w=600&q=70' },
    { keys: ['onion', 'peyaj', 'পেঁয়াজ', 'प्याज'], url: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=600&q=70' },
    { keys: ['green chili', 'green chilli', 'chili', 'chilli', 'কাঁচা মরিচ', 'हरी मिर्च', 'mirch'], url: 'https://images.unsplash.com/photo-1583119022894-0b09136516af?auto=format&fit=crop&w=600&q=70' },
    { keys: ['brinjal', 'eggplant', 'aubergine', 'begun', 'বেগুন', 'बैंगन'], url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=70' },
    { keys: ['spinach', 'palak', 'পালং', 'पालक'], url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=70' },
    { keys: ['cauliflower', 'phulkopi', 'ফুলকপি', 'फूलगोभी'], url: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=600&q=70' },
    { keys: ['cabbage', 'bandhakopi', 'বাঁধাকপি', 'पत्ता गोभी', 'पत्तागोभी'], url: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=600&q=70' },
    { keys: ['bitter gourd', 'karela', 'করলা', 'करेला'], url: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=600&q=70' },
    { keys: ['bottle gourd', 'lau', 'লাউ', 'लौकी'], url: 'https://images.unsplash.com/photo-1590868301237-cd5a901eaa5c?auto=format&fit=crop&w=600&q=70' },
    { keys: ['carrot', 'গাজর', 'गाजर'], url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=70' },
    { keys: ['garlic', 'রসুন', 'लहसुन'], url: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b6be5?auto=format&fit=crop&w=600&q=70' },
    { keys: ['ginger', 'আদা', 'अदरक'], url: 'https://images.unsplash.com/photo-1615485290430-16d55742c5c6?auto=format&fit=crop&w=600&q=70' },
    { keys: ['cucumber', 'শসা', 'खीरा'], url: 'https://images.unsplash.com/photo-1449301254019-f33305cfd170?auto=format&fit=crop&w=600&q=70' },
    { keys: ['lemon', 'লেবু', 'नींबू'], url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=70' }
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
