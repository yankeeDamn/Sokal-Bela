/* Shared contact and delivery configuration for browser and Node.js. */
(function (root) {
  'use strict';
  const config = Object.freeze({
    businessName: 'Sokal Belar Bazar - 24/7',
    phone: '7551858583',
    e164: '+917551858583',
    displayPhone: '+91 7551858583',
    whatsappDigits: '917551858583',
    whatsappColor: '#25d366',
    address: 'Maa Tara Apartment, 1 TRDA Bypass Choaphuka, Choa Poka, Rampurhat, West Bengal 731224',
    minimumOrder: 200,
    freeDeliveryAt: 300,
    freeDeliveryRadiusKm: 5,
    open24Hours: true
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
  root.SOKAL_CONTACT = config;
  if (!root.document) return;
  function apply() {
    root.document.querySelectorAll('[data-contact-phone]').forEach(el => {
      el.textContent = config.displayPhone;
    });
    root.document.querySelectorAll('[data-contact-tel]').forEach(el => {
      el.href = 'tel:' + config.e164;
    });
    root.document.querySelectorAll('[data-contact-wa]').forEach(el => {
      const query = el.dataset.waText ? '?text=' + encodeURIComponent(el.dataset.waText) : '';
      el.href = 'https://wa.me/' + config.whatsappDigits + query;
    });
    root.document.querySelectorAll('[data-contact-address]').forEach(el => {
      el.textContent = config.address;
    });
    const structured = root.document.createElement('script');
    structured.type = 'application/ld+json';
    structured.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'GroceryStore',
      name: config.businessName, url: 'https://sokal-bela.vercel.app/',
      telephone: config.e164, openingHours: 'Mo-Su 00:00-23:59',
      address: { '@type': 'PostalAddress', streetAddress: 'Maa Tara Apartment, 1 TRDA Bypass Choaphuka, Choa Poka',
        addressLocality: 'Rampurhat', addressRegion: 'West Bengal', postalCode: '731224', addressCountry: 'IN' },
      currenciesAccepted: 'INR', priceRange: '₹', areaServed: 'Rampurhat, Birbhum'
    });
    root.document.head.appendChild(structured);
  }
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', apply);
  else apply();
})(typeof window !== 'undefined' ? window : globalThis);
