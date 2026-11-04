import { storeAccess } from '../../config/commerce.mjs';

export function StoreModeSwitcher() {
  let storage;
  try { storage = window.localStorage; } catch { /* Still allow URL previews. */ }
  const access = storeAccess(location.search, storage);
  if (!access.visible) return;
  const switcher = document.getElementById('store-mode-switcher');
  const fresh = document.getElementById('fresh-store-panel'), partner = document.getElementById('partner-store-panel');
  const freshHero = document.getElementById('fresh-hero'), partnerHero = document.getElementById('partner-hero');
  fresh.setAttribute('role', 'tabpanel');
  fresh.setAttribute('aria-labelledby', 'fresh-tab');
  const navbar = document.querySelector('.navbar');
  function positionSwitcher() {
    switcher.style.setProperty('--nav-height', navbar.getBoundingClientRect().height + 'px');
  }
  if ('ResizeObserver' in window) new ResizeObserver(positionSwitcher).observe(navbar);
  positionSwitcher();
  const tabs = [...switcher.querySelectorAll('[role="tab"]')];
  let loaded, pendingAdmin = access.admin;
  async function loadPartner() {
    partner.setAttribute('aria-busy', 'true');
    partner.innerHTML = '<div class="container"><p role="status">Loading partner products…</p><div class="ps-grid" aria-hidden="true">' +
      '<div class="ps-skeleton"></div>'.repeat(4) + '</div></div>';
    try {
      const { PartnerStoreView } = await import('./PartnerStoreView.mjs');
      const openGenerator = await PartnerStoreView(partner, access.admin, storage);
      if (pendingAdmin && !partner.hidden) { pendingAdmin = false; openGenerator?.(); }
    } catch {
      loaded = null;
      partner.innerHTML = '<div class="container ps-empty"><h2>Partner products could not load</h2><p>Your fresh cart is saved.</p><button type="button" class="ps-btn">Try again</button></div>';
      partner.querySelector('button').onclick = () => { loaded = loadPartner(); };
    } finally { partner.removeAttribute('aria-busy'); }
  }
  function activate(isPartner, focus = false) {
    fresh.hidden = freshHero.hidden = isPartner;
    partner.hidden = partnerHero.hidden = !isPartner;
    document.body.classList.toggle('partner-mode', isPartner);
    for (const [i, tab] of tabs.entries()) {
      const selected = i === Number(isPartner);
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    }
    window.updateCartBar?.();
    if (isPartner && !loaded) loaded = loadPartner();
  }
  function choose(isPartner, keyboard = false) {
    if (isPartner === !partner.hidden) return;
    activate(isPartner, keyboard);
    // A tall vegetable rate board collapses when switching. Keep the new store's terms in view.
    if (isPartner && !keyboard) window.scrollTo({ top: 0, behavior: 'instant' });
    else switcher.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  tabs.forEach((tab, i) => {
    tab.onclick = () => choose(i === 1);
    tab.onkeydown = event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      choose(event.key === 'End' || (event.key !== 'Home' && i === 0), true);
    };
  });
  document.addEventListener('sokal:page', () => {
    if (!partner.hidden) activate(false);
  });
  switcher.hidden = false;
  activate(access.admin);
}
StoreModeSwitcher();
