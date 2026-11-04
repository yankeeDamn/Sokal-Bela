import { EVERYDAY, EVERYDAY_GROUPS, normalizeProduct, PARTNER_DEPARTMENTS, readAuthorFile, readDrafts, sourceCode, unreviewedDrafts, withDrafts } from './catalog.mjs';

export function QuickAdminGenerator(snapshot, storage, saveDraft) {
  const dialog = document.createElement('dialog');
  dialog.className = 'ps-dialog ps-generator';
  dialog.setAttribute('aria-labelledby', 'ps-admin-title');
  dialog.innerHTML = `<form class="ps-form">
    <div class="ps-dialog-head"><div><small>LOCAL CATALOGUE EDITOR</small><h2 id="ps-admin-title">Quick Product Generator</h2></div>
      <button type="button" class="ps-close" aria-label="Close generator">✕</button></div>
    <p class="ps-fine">Products preview on this browser. Copy your catalogue when you are ready to update the repository.</p>
    <label class="ps-review" hidden>Review an older draft on this device<select name="review"></select>
      <small>Choose its department and confirm it works without power before previewing or exporting it.</small></label>
    <label>Product title (English)<input name="titleEn" maxlength="160" required></label>
    <label>পণ্যের নাম (Bengali title)<input name="titleBn" lang="bn" maxlength="160" required></label>
    <label>Department<select name="category" required><option value="">Choose a department</option></select></label>
    <label class="ps-group-field" hidden>Everyday group<select name="subcategory" disabled><option value="">Choose a group</option></select></label>
    <label class="ps-power-check"><input type="checkbox" name="nonElectric" required>I confirm this item works without electricity, batteries or charging.</label>
    <div class="ps-form-row"><label>Platform<select name="platform"><option>Meesho</option><option>Amazon</option><option>Flipkart</option></select></label>
      <label>Fulfilment<select name="fulfillmentMode"><option value="whatsapp_cod">WhatsApp reselling</option><option value="affiliate_redirect">Retailer checkout</option></select></label></div>
    <div class="ps-form-row"><label>Selling price (₹)<input name="sellingPrice" type="number" inputmode="decimal" min="0.01" step="0.01" required></label>
      <label>MRP (₹)<input name="mrp" type="number" inputmode="decimal" min="0.01" step="0.01" required></label></div>
    <label>Image URL (optional)<input name="image" type="url" placeholder="https://…"></label>
    <label class="ps-affiliate">Affiliate or retailer link<input name="externalUrl" type="url" placeholder="https://…"></label>
    <label>Private supplier code or link (optional)<input name="supplierCode" maxlength="1000" autocomplete="off"></label>
    <label>Search tags (comma separated)<input name="tags" placeholder="cotton, বাগান"></label>
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
  for (const name of PARTNER_DEPARTMENTS) fields.category.add(new Option(name, name));
  for (const name of EVERYDAY_GROUPS) fields.subcategory.add(new Option(name, name));
  const reviewLabel = dialog.querySelector('.ps-review');
  let draftId, original, older = [];
  function syncDepartment() {
    const enabled = fields.category.value === EVERYDAY;
    dialog.querySelector('.ps-group-field').hidden = !enabled;
    fields.subcategory.disabled = !enabled; fields.subcategory.required = enabled;
    if (!enabled) fields.subcategory.value = '';
  }
  fields.category.onchange = syncDepartment;
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
    const oldImages = original?.images || [];
    const images = data.image === form.elements.image.defaultValue ? oldImages : [data.image.trim()].filter(Boolean);
    return normalizeProduct({ ...original, ...data, id: draftId, nonElectric: fields.nonElectric.checked,
      subcategory: data.subcategory || '', sellingPrice: Number(data.sellingPrice), mrp: Number(data.mrp),
      images, tags: data.tags.split(','), inStock: fields.inStock.checked,
      featured: fields.featured.checked, codAvailable: fields.codAvailable.checked });
  }
  function reset() {
    fields.image.defaultValue = '';
    form.reset(); syncPlatform(); syncDepartment(); original = null; draftId = 'SB-PARTNER-' + crypto.randomUUID();
    manual.hidden = true; manual.querySelector('textarea').value = ''; status.textContent = ''; error.textContent = '';
  }
  fields.review.onchange = () => {
    const row = older.find(p => p.id === fields.review.value);
    reset();
    if (!row) return;
    original = row; draftId = row.id; fields.review.value = row.id;
    for (const key of ['titleEn','titleBn','platform','sellingPrice','mrp','externalUrl','supplierCode']) fields[key].value = row[key] ?? '';
    fields.category.value = PARTNER_DEPARTMENTS.includes(row.category) ? row.category : '';
    syncDepartment(); syncPlatform();
    fields.subcategory.value = row.subcategory || '';
    const firstImage = Array.isArray(row.images) ? row.images[0] : '';
    fields.image.defaultValue = typeof firstImage === 'string' && firstImage.startsWith('https://') ? firstImage : '';
    fields.image.value = fields.image.defaultValue;
    fields.tags.value = Array.isArray(row.tags) ? row.tags.filter(t => typeof t === 'string').join(', ') : '';
    fields.inStock.checked = row.inStock !== false; fields.featured.checked = row.featured === true;
    fields.codAvailable.checked = row.codAvailable !== false;
  };
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
      const rows = withDrafts(await exportBase(), [...pending, ...readDrafts(storage)]);
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
    older = unreviewedDrafts(storage).filter(row => !snapshot.products.some(p => p.id === row.id));
    reviewLabel.hidden = !older.length;
    fields.review.replaceChildren(new Option('New product',''), ...older.map(row => new Option(row.titleEn, row.id)));
    if (original) fields.review.value = original.id;
    dialog.showModal(); fields.titleEn.focus();
  };
}
