// Shared by the storefront, Partner Store and server-side operations portal.
export const SOKAL_BELA_PHONE = "9986418638";
export const SOKAL_BELA_WHATSAPP = "919986418638";

export function whatsappUrl(message = '') {
  const url = 'https://wa.me/' + SOKAL_BELA_WHATSAPP;
  return message ? url + '?text=' + encodeURIComponent(message) : url;
}

const contact = Object.freeze({
  businessName: 'Sokal Belar Bazar - 24/7',
  phone: SOKAL_BELA_PHONE,
  e164: '+91' + SOKAL_BELA_PHONE,
  displayPhone: '+91 ' + SOKAL_BELA_PHONE,
  whatsappDigits: SOKAL_BELA_WHATSAPP,
  whatsappUrl,
  whatsappColor: '#25d366',
  address: 'Maa Tara Apartment, 1 TRDA Bypass Choaphuka, Choa Poka, Rampurhat, West Bengal 731224',
  minimumOrder: 200,
  freeDeliveryAt: 300,
  freeDeliveryRadiusKm: 5,
  open24Hours: true
});
export default contact;

if (typeof window !== 'undefined') {
  // Module scripts run after the page has been parsed, before DOMContentLoaded.
  window.SOKAL_CONTACT = contact;
  document.querySelectorAll('[data-contact-phone]').forEach(el => {
    el.textContent = contact.displayPhone;
  });
  document.querySelectorAll('[data-contact-tel]').forEach(el => {
    el.href = 'tel:' + contact.e164;
  });
  document.querySelectorAll('[data-contact-wa]').forEach(el => {
    el.href = whatsappUrl(el.dataset.waText);
  });
  document.querySelectorAll('[data-contact-address]').forEach(el => {
    el.textContent = contact.address;
  });
  const structured = document.createElement('script');
  structured.type = 'application/ld+json';
  structured.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'GroceryStore',
    name: contact.businessName, url: 'https://sokal-bela.vercel.app/',
    telephone: contact.e164, openingHours: 'Mo-Su 00:00-23:59',
    address: { '@type': 'PostalAddress', streetAddress: 'Maa Tara Apartment, 1 TRDA Bypass Choaphuka, Choa Poka',
      addressLocality: 'Rampurhat', addressRegion: 'West Bengal', postalCode: '731224', addressCountry: 'IN' },
    currenciesAccepted: 'INR', priceRange: '₹', areaServed: 'Rampurhat, Birbhum'
  });
  document.head.appendChild(structured);
}
