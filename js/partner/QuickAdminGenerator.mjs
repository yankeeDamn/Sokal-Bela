import { categories, normalizeProduct, readAuthorFile, sourceCode, withDrafts } from './catalog.mjs';

export function QuickAdminGenerator(snapshot, getDrafts, saveDraft) {
  const dialog = document.createElement('dialog');
  dialog.className = 'ps-dialog ps-generator';
  dialog.setAttribute('aria-labelledby', 'ps-admin-title');
  dialog.innerHTML = `<form class="ps-form">
    <div class="ps-dialog-head"><div><small>LOCAL CATALOGUE EDITOR</small><h2 id="ps-admin-title">Quick Product Generator</h2></div>
      <button type="button" class="ps-close" aria-label="Close generator">✕</button></div>
    <p class="ps-fine">Products preview on this browser. Copy your catalogue when you are ready to update the repository.</p>
    <label>Product title (English)<input name="titleEn" maxlength="160" required></label>
    <label>পণ্যের নাম (Bengali title)<input name="titleBn" lang="bn" maxlength="160" required></label>
    <label>Category · choose or type a new niche<input name="category" list="ps-categories" maxlength="80" required><datalist id="ps-categories"></datalist></label>
    <div class="ps-form-row"><label>Platform<select name="platform"><option>Meesho</option><option>Amazon</option><option>Flipkart</option></select></label>
      <label>Fulfilment<select name="fulfillmentMode"><option value="whatsapp_cod">WhatsApp reselling</option><option value="affiliate_redirect">Retailer checkout</option></select></label></div>
    <div class="ps-form-row"><label>Selling price (₹)<input name="sellingPrice" type="number" inputmode="decimal" min="0.01" step="0.01" required></label>
      <label>MRP (₹)<input name="mrp" type="number" inputmode="decimal" min="0.01" step="0.01" required></label></div>
    <label>Image URL (optional)<input name="image" type="url" placeholder="https://…"></label>
    <label class="ps-affiliate">Affiliate or retailer link<input name="externalUrl" type="url" placeholder="https://…"></label>
    <label>Private supplier code or link (optional)<input name="supplierCode" maxlength="1000" autocomplete="off"></label>
    <label>Search tags (comma separated)<input name="tags" placeholder="cotton, শাড়ি"></label>
    <div class="ps-checks"><label><input name="inStock" type="checkbox" checked>In stock</label>
      <label><input name="featured" type="checkbox">Featured</label><label class="ps-cod"><input name="codAvailable" type="checkbox" checked>COD available</label></div>
    <details class="ps-private" hidden><summary>Preserve private supplier references</summary><p class="ps-fine">
      Sign in to the operations portal in another tab, or select this deployment’s original partnerProducts.js here. The file stays on this device.</p>
      <label>Current private catalogue<input name="baseline" type="file" accept=".js"></label></details>
    <p class="ps-error" role="alert"></p><p class="ps-status" role="status"></p>
    <button type="submit" class="ps-btn">Preview Live on My Device</button>
    <button type="button" class="ps-btn ps-outline ps-copy">Copy Updated partnerProducts.js Code</button>
    <label class="ps-manual" hidden>Copy this complete file<textarea rows="5" readonly></textarea></label>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form'), fields = form.elements;
  const error = dialog.querySelector('.ps-error'), status = dialog.querySelector('.ps-status');
  const manual = dialog.querySelector('.ps-manual'), privatePanel = dialog.querySelector('.ps-private');
  const copy = dialog.querySelector('.ps-copy');
  privatePanel.hidden = !snapshot.privateReferences;
  let draftId;
  function syncPlatform() {
    const resell = fields.platform.value === 'Meesho';
    fields.fulfillmentMode.value = resell ? 'whatsapp_cod' : 'affiliate_redirect';
    dialog.querySelector('.ps-affiliate').hidden = resell;
    fields.externalUrl.disabled = resell;
    fields.externalUrl.required = !resell;
    dialog.querySelector('.ps-cod').hidden = !resell;
  }
  fields.platform.onchange = syncPlatform;
  fields.fulfillmentMode.onchange = () => {
    if (fields.fulfillmentMode.value === 'whatsapp_cod') fields.platform.value = 'Meesho';
    else if (fields.platform.value === 'Meesho') fields.platform.value = 'Amazon';
    syncPlatform();
  };
  function readForm() {
    const data = Object.fromEntries(new FormData(form));
    return normalizeProduct({ ...data, id: draftId, sellingPrice: Number(data.sellingPrice), mrp: Number(data.mrp),
      images: data.image ? [data.image.trim()] : [], tags: data.tags.split(','), inStock: fields.inStock.checked,
      featured: fields.featured.checked, codAvailable: fields.codAvailable.checked });
  }
  function reset() {
    form.reset(); syncPlatform(); draftId = 'SB-PARTNER-' + crypto.randomUUID();
    manual.hidden = true; manual.querySelector('textarea').value = ''; status.textContent = ''; error.textContent = '';
  }
  dialog.querySelector('.ps-close').onclick = () => dialog.close();
  form.onsubmit = event => {
    event.preventDefault(); error.textContent = '';
    try {
      saveDraft(readForm()); reset(); dialog.close();
    } catch (err) { error.textContent = err.message; }
  };
  async function exportBase() {
    if (!snapshot.privateReferences) return snapshot.products;
    if (fields.baseline.files[0]) return readAuthorFile(await fields.baseline.files[0].text(), snapshot);
    const response = await fetch('/api/admin-data?action=partner-catalog', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('To keep existing supplier codes, select your current catalogue file above or sign in at /secure-admin-portal.');
    const { products } = await response.json();
    return readAuthorFile(sourceCode(products), snapshot);
  }
  copy.onclick = async () => {
    error.textContent = ''; status.textContent = ''; manual.hidden = true;
    const entered = ['titleEn', 'titleBn', 'category', 'sellingPrice', 'mrp', 'image', 'externalUrl', 'supplierCode', 'tags'].some(key => fields[key].value.trim());
    if (entered && !form.reportValidity()) return;
    copy.disabled = true;
    try {
      const pending = entered ? [readForm()] : [];
      const rows = withDrafts(await exportBase(), [...getDrafts(), ...pending]);
      const code = sourceCode(rows);
      try {
        await navigator.clipboard.writeText(code);
        status.textContent = 'Copied ' + rows.length + ' products. Replace src/data/partnerProducts.js with this file.';
      } catch {
        manual.hidden = false;
        const area = manual.querySelector('textarea');
        area.value = code; area.focus(); area.select();
        status.textContent = 'Clipboard unavailable. Copy the selected code below.';
      }
    } catch (err) { privatePanel.open = true; error.textContent = err.message; }
    finally { copy.disabled = false; }
  };
  reset();
  return () => {
    const names = categories(withDrafts(snapshot.products, getDrafts()));
    dialog.querySelector('datalist').replaceChildren(...names.map(name => new Option(name, name)));
    dialog.showModal(); fields.titleEn.focus();
  };
}
