import { categories, DRAFT_KEY, filterCatalog, PLATFORMS, publicProduct, readDrafts, withDrafts } from './catalog.mjs';
import { PartnerProductCard } from './PartnerProductCard.mjs';
import { PartnerOrderModal } from './PartnerOrderModal.mjs';
import { QuickAdminGenerator } from './QuickAdminGenerator.mjs';

export async function PartnerStoreView(panel, admin, storage) {
  const response = await fetch('/public/partner-catalog.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Catalogue unavailable');
  const snapshot = await response.json();
  snapshot.products = snapshot.products.map(publicProduct);
  const filters = { category: '', platform: '', search: '', sort: 'featured' };
  const openOrder = PartnerOrderModal();
  panel.innerHTML = `<div class="container ps-content">
    <div class="ps-notice"><span aria-hidden="true">✦</span><div><strong>✨ Sokal Bela Partner Store</strong>
      <p>Handpicked deals from Amazon, Flipkart &amp; Meesho. Estimated delivery in 3–5 days across Rampurhat (731224). No ₹200 minimum cart restriction!</p>
      <small>Shipping and final dates are confirmed by the seller. We may earn a commission on affiliate purchases.</small></div></div>
    <div class="ps-tools"><div class="ps-section-head"><div><small>THE COLLECTION · পছন্দের পণ্য</small><h2>Shop the collection</h2></div>
      <button type="button" class="ps-btn ps-outline ps-open-admin" hidden>Quick Product Generator</button></div>
      <div class="ps-input-row"><label>Search / খুঁজুন<input type="search" class="ps-search" placeholder="Search products, categories or tags"></label>
        <label>Sort by<select class="ps-sort"><option value="featured">Featured</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option><option value="discount">Biggest Discount (%)</option></select></label></div>
      <div class="ps-group" role="group" aria-label="Categories"><span>Category</span><div class="ps-pills ps-category"></div></div>
      <div class="ps-group" role="group" aria-label="Platforms"><span>Platform</span><div class="ps-pills ps-platforms"></div></div>
    </div>
    <p class="ps-results" role="status"></p><div class="ps-grid"></div>
    <div class="ps-empty" hidden><h3>No matching products</h3><p>Try another title, category or platform.</p><button type="button" class="ps-btn ps-outline">Clear filters</button></div>
  </div>`;
  const search = panel.querySelector('.ps-search'), sort = panel.querySelector('.ps-sort');
  const results = panel.querySelector('.ps-results'), grid = panel.querySelector('.ps-grid');
  const empty = panel.querySelector('.ps-empty');
  const getDrafts = () => readDrafts(storage);
  let products;
  function renderList() {
    const items = filterCatalog(products, filters);
    grid.replaceChildren(...items.map(item => PartnerProductCard(item, openOrder)));
    results.textContent = items.length + (items.length === 1 ? ' product' : ' products');
    empty.hidden = items.length > 0;
  }
  function pills(target, options, field) {
    const wrapper = panel.querySelector(target);
    wrapper.replaceChildren(...options.map(([value, label]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label; button.className = 'ps-pill';
      button.setAttribute('aria-pressed', String(filters[field] === value));
      button.onclick = () => {
        filters[field] = value;
        for (const el of wrapper.children) el.setAttribute('aria-pressed', String(el === button));
        renderList();
      };
      return button;
    }));
  }
  function refresh(reset = false) {
    products = withDrafts(snapshot.products, getDrafts().map(publicProduct));
    if (reset) {
      Object.assign(filters, { category: '', platform: '', search: '', sort: 'featured' });
      search.value = ''; sort.value = 'featured';
    }
    pills('.ps-category', [['', 'All'], ...categories(products).map(value => [value, value])], 'category');
    pills('.ps-platforms', [['', 'All Platforms'], ...Object.entries(PLATFORMS)], 'platform');
    renderList();
  }
  search.oninput = () => { filters.search = search.value; renderList(); };
  sort.onchange = () => { filters.sort = sort.value; renderList(); };
  empty.querySelector('button').onclick = () => { refresh(true); search.focus(); };
  refresh();
  if (admin) {
    const button = panel.querySelector('.ps-open-admin');
    button.hidden = false;
    button.onclick = QuickAdminGenerator(snapshot, getDrafts, product => {
      const drafts = withDrafts(getDrafts(), [product]);
      try { storage.setItem(DRAFT_KEY, JSON.stringify(drafts)); }
      catch { throw new Error('Browser storage is unavailable. Use Copy Updated partnerProducts.js Code to keep this product.'); }
      refresh(true);
      results.textContent += ' · Preview added on this device: ' + product.titleEn;
      grid.querySelector('[data-product-id="' + product.id + '"]')?.scrollIntoView({ block: 'center' });
    });
    return button.onclick;
  }
}
