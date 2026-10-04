/* Sokal Bela i18n — EN / BN / HI with localStorage persistence */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'sb_lang';
  const SUPPORTED = ['en', 'bn', 'hi'];
  const DIGITS = {
    en: '0123456789',
    bn: '০১২৩৪৫৬৭৮৯',
    hi: '०१२३४५६७८९'
  };

  const FALLBACK = {
    en: {},
    bn: {},
    hi: {}
  };

  const I18N = {
    lang: 'en',
    dicts: { en: {}, bn: {}, hi: {} },
    listeners: [],
    ready: null
  };

  function readSavedLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.includes(saved)) return saved;
    } catch (_) { /* ignore */ }
    const htmlLang = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
    return SUPPORTED.includes(htmlLang) ? htmlLang : 'en';
  }

  function t(key, vars) {
    const dict = I18N.dicts[I18N.lang] || {};
    const en = I18N.dicts.en || {};
    let str = dict[key] || en[key] || key;
    if (vars && typeof vars === 'object') {
      Object.keys(vars).forEach((k) => {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), localizeDigits(String(vars[k])));
      });
    }
    return str;
  }

  function localizeDigits(value) {
    const map = DIGITS[I18N.lang] || DIGITS.en;
    return String(value).replace(/\d/g, (d) => map[d] || d);
  }

  function formatPrice(amount, unit) {
    const n = Number(amount);
    const num = localizeDigits(Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(2)) : '0');
    const unitKey = unit ? 'unit.' + unit : '';
    const unitLabel = unit ? (t(unitKey) !== unitKey ? t(unitKey) : unit) : '';
    return unitLabel ? ('₹' + num + '/' + unitLabel) : ('₹' + num);
  }

  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    document.documentElement.lang = I18N.lang === 'bn' ? 'bn' : (I18N.lang === 'hi' ? 'hi' : 'en');
    document.documentElement.setAttribute('data-lang', I18N.lang);
    const select = document.getElementById('lang-select');
    if (select && select.value !== I18N.lang) select.value = I18N.lang;
  }

  async function loadDict(lang) {
    try {
      const res = await fetch('locales/' + lang + '.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      I18N.dicts[lang] = Object.assign({}, FALLBACK[lang] || {}, json);
    } catch (err) {
      I18N.dicts[lang] = Object.assign({}, FALLBACK[lang] || {});
      console.warn('i18n: could not load locales/' + lang + '.json', err.message);
    }
  }

  function setLang(lang, skipNotify) {
    const next = SUPPORTED.includes(lang) ? lang : 'en';
    I18N.lang = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) { /* ignore */ }
    apply();
    if (!skipNotify) I18N.listeners.forEach((fn) => { try { fn(next); } catch (e) { console.warn(e); } });
  }

  function onChange(fn) {
    if (typeof fn === 'function') I18N.listeners.push(fn);
  }

  I18N.t = t;
  I18N.localizeDigits = localizeDigits;
  I18N.formatPrice = formatPrice;
  I18N.apply = apply;
  I18N.setLang = setLang;
  I18N.onChange = onChange;
  I18N.supported = SUPPORTED;

  I18N.ready = (async function init() {
    I18N.lang = readSavedLang();
    await Promise.all(SUPPORTED.map(loadDict));
    apply();
    return I18N.lang;
  })();

  global.I18N = I18N;
  global.t = t;
})(window);
