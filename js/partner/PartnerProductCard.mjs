import { FALLBACK_IMAGE } from './catalog.mjs';
import { rupees } from './PartnerOrderModal.mjs';
import { whatsappUrl } from '../../config/contact.mjs';

export function PartnerProductCard(product, openOrder) {
  const card = document.createElement('article');
  card.className = 'ps-card';
  card.dataset.productId = product.id;
  card.innerHTML = `<div class="ps-art"><img loading="lazy" decoding="async" alt=""><span class="ps-deal"></span></div>
    <div class="ps-card-body"><div class="ps-attribution"><span class="ps-platform"></span><span class="ps-sample"></span></div>
    <h3></h3><p lang="bn" class="ps-bn"></p><p class="ps-price"><strong></strong> <del></del></p>
    <p class="ps-delivery"></p><p class="ps-stock"></p><div class="ps-actions"></div></div>`;
  const set = (selector, value) => { card.querySelector(selector).textContent = value; };
  const image = card.querySelector('img');
  const [first, ...others] = product.images;
  const fallbacks = [...others, FALLBACK_IMAGE].filter(url => url !== first);
  image.onerror = () => { if (fallbacks.length) image.src = fallbacks.shift(); else image.onerror = null; };
  image.src = first;
  const deal = card.querySelector('.ps-deal');
  deal.hidden = !product.discountPercent;
  deal.textContent = product.discountPercent + '% off';
  set('.ps-platform', product.platform);
  set('.ps-sample', [product.subcategory || product.category, product.sample && 'Sample listing'].filter(Boolean).join(' · '));
  set('h3', product.titleEn);
  set('.ps-bn', product.titleBn);
  set('.ps-price strong', rupees(product.sellingPrice));
  if (product.mrp > product.sellingPrice) set('del', rupees(product.mrp));
  set('.ps-delivery', product.deliveryBadge);
  const actions = card.querySelector('.ps-actions');
  if (!product.inStock) {
    set('.ps-stock', 'Out of stock · স্টক নেই');
  } else if (product.fulfillmentMode === 'whatsapp_cod') {
    const order = document.createElement('button');
    order.type = 'button';
    order.className = 'ps-btn ps-wa';
    order.textContent = product.codAvailable ? '💬 Order on WhatsApp (Cash on Delivery)' : '💬 Order on WhatsApp';
    order.onclick = () => openOrder(product);
    actions.append(order);
  } else {
    const buy = document.createElement('a');
    buy.className = 'ps-btn'; buy.href = product.externalUrl; buy.target = '_blank';
    buy.rel = 'noopener noreferrer sponsored'; buy.textContent = '🛒 Buy on ' + product.platform + ' ↗';
    const help = document.createElement('a');
    help.className = 'ps-btn ps-outline'; help.target = '_blank'; help.rel = 'noopener noreferrer';
    help.textContent = 'Need COD Help? Order via Sokal Bela WhatsApp';
    help.href = whatsappUrl('🛍️ Partner Store · COD assistance\n' + product.titleEn + ' (' + product.titleBn + ')\n' +
      product.id + ' | ' + product.platform + '\n' + product.externalUrl +
      '\nCan you help me order this to Rampurhat (731224)? Please confirm COD, price, shipping and delivery.');
    actions.append(buy, help);
  }
  return card;
}
