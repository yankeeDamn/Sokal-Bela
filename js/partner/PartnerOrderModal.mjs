import { whatsappUrl } from '../../config/contact.mjs';

const currency = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
export const rupees = amount => '₹' + currency.format(amount);

export function orderMessage(product, { name, phone, address, quantity }) {
  if (product.nonElectric !== true || !product.inStock || product.fulfillmentMode !== 'whatsapp_cod') throw new Error('This item cannot be ordered here.');
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 99 || !/^[6-9]\d{9}$/.test(phone) ||
      !name.trim() || !address.trim()) throw new Error('Check your name, mobile number, landmark and quantity.');
  return [
    '🛍️ *NEW PARTNER STORE ORDER - SOKAL BELA*', '----------------------------------',
    '*Item:* ' + product.titleEn + ' (' + product.titleBn + ')',
    '*Product ID:* ' + product.id + ' | *Platform:* ' + product.platform,
    '*Price:* ' + rupees(product.sellingPrice) + (product.codAvailable ? ' (Cash on Delivery)' : ' (confirm payment with Sokal Bela)'),
    '*Qty:* ' + qty, '*Item total:* ' + rupees(product.sellingPrice * qty), '----------------------------------',
    '*Customer Name:* ' + name.trim(), '*Phone:* ' + phone,
    '*Delivery Address:* ' + address.trim() + ', Rampurhat (731224)', '*Est. Delivery:* 3–5 Days'
  ].join('\n');
}

export function PartnerOrderModal() {
  const dialog = document.createElement('dialog');
  dialog.className = 'ps-dialog';
  dialog.setAttribute('aria-labelledby', 'ps-order-title');
  dialog.innerHTML = `<form class="ps-form">
    <div class="ps-dialog-head"><div><small>PARTNER STORE · RAMPURHAT</small><h2 id="ps-order-title">Order on WhatsApp</h2></div>
      <button type="button" class="ps-close" aria-label="Close order form">✕</button></div>
    <p class="ps-detail"></p>
    <label>Your name / নাম<input name="name" autocomplete="name" maxlength="80" required></label>
    <label>Mobile number / মোবাইল নম্বর<input name="phone" type="tel" inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" autocomplete="tel-national" placeholder="10-digit Indian mobile number" required></label>
    <label>Rampurhat address &amp; landmark / ঠিকানা<textarea name="address" rows="2" maxlength="300" autocomplete="street-address" placeholder="House or street, area and landmark, e.g. Station Road" required></textarea></label>
    <label>Quantity / পরিমাণ<input name="quantity" type="number" min="1" max="99" step="1" value="1" inputmode="numeric" required></label>
    <p class="ps-total" aria-live="polite"></p><p class="ps-fine">WhatsApp opens with your request. Send it there for Sokal Bela to confirm availability, delivery and any shipping charge.</p>
    <p role="alert" class="ps-error"></p><button class="ps-btn ps-wa" type="submit">💬 Continue to WhatsApp</button>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const total = dialog.querySelector('.ps-total');
  const error = dialog.querySelector('.ps-error');
  let current;
  function updateTotal() {
    total.textContent = form.elements.quantity.validity.valid ? 'Item total · ' + rupees(current.sellingPrice * Number(form.elements.quantity.value)) : '';
  }
  form.elements.quantity.addEventListener('input', updateTotal);
  dialog.querySelector('.ps-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { form.reset(); error.textContent = ''; current = null; });
  form.onsubmit = event => {
    event.preventDefault();
    try {
      const message = orderMessage(current, Object.fromEntries(new FormData(form)));
      const url = whatsappUrl(message);
      dialog.close();
      window.location.assign(url);
    } catch (e) { error.textContent = e.message; }
  };
  return product => {
    current = product;
    dialog.querySelector('.ps-detail').textContent = product.titleEn + ' · ' + product.titleBn + ' · ' + rupees(product.sellingPrice) + ' each';
    updateTotal();
    dialog.showModal();
    form.elements.name.focus();
  };
}
