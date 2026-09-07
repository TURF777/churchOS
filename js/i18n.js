/* ===================================================
   ChurchOS — Internationalization (i18n) Module
   Shared across all pages. Provides:
   - Language loading from /lang/*.json
   - t(key, params?) translation function with English fallback
   - DOM auto-translation via data-i18n attributes
   - Language switcher initialization
   - Locale-aware date/number/currency formatting
   =================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------
     Supported Languages
     --------------------------------------------------- */
  const LANGUAGES = [
    // International
    { code: 'en',  name: 'English',   group: 'international' },
    { code: 'fr',  name: 'Français',  group: 'international' },
    { code: 'es',  name: 'Español',   group: 'international' },
    { code: 'pt',  name: 'Português', group: 'international' },
    { code: 'zh',  name: '中文',      group: 'international' },
    // Ghanaian
    { code: 'tw',  name: 'Twi',       group: 'ghanaian' },
    { code: 'ga',  name: 'Ga',        group: 'ghanaian' },
    { code: 'ee',  name: 'Eʋegbe',    group: 'ghanaian' },
    { code: 'fat', name: 'Mfantse',   group: 'ghanaian' },
  ];

  /* Map language codes to BCP-47 locale tags for Intl APIs */
  const LOCALE_MAP = {
    en: 'en-GH', fr: 'fr-FR', es: 'es-ES', pt: 'pt-PT',
    zh: 'zh-CN', tw: 'ak-GH', ga: 'gaa', ee: 'ee-GH', fat: 'ak-GH',
  };

  const STORAGE_KEY = 'preferredLanguage';
  const DEFAULT_LANG = 'en';

  let currentLang = DEFAULT_LANG;
  let translations = {};      // { langCode: { key: value, ... }, ... }
  let englishLoaded = false;

  /* ---------------------------------------------------
     Core: Load a language file
     --------------------------------------------------- */
  async function load(langCode) {
    if (!LANGUAGES.find(l => l.code === langCode)) {
      console.warn(`[i18n] Unknown language code: ${langCode}, falling back to English.`);
      langCode = DEFAULT_LANG;
    }

    // Always ensure English is loaded (fallback source)
    if (!englishLoaded) {
      try {
        const enRes = await fetch(getBasePath() + 'lang/en.json');
        if (enRes.ok) {
          translations.en = await enRes.json();
          englishLoaded = true;
        }
      } catch (e) {
        console.error('[i18n] Failed to load English translations:', e);
      }
    }

    // Load the requested language (skip if English — already loaded)
    if (langCode !== 'en' && !translations[langCode]) {
      try {
        const res = await fetch(getBasePath() + `lang/${langCode}.json`);
        if (res.ok) {
          translations[langCode] = await res.json();
        } else {
          console.warn(`[i18n] Could not load lang/${langCode}.json (${res.status}), using English fallback.`);
        }
      } catch (e) {
        console.warn(`[i18n] Failed to fetch lang/${langCode}.json:`, e);
      }
    }

    currentLang = langCode;
    localStorage.setItem(STORAGE_KEY, langCode);

    // Update HTML lang attribute
    document.documentElement.lang = langCode === 'tw' ? 'ak' : langCode;

    // Apply translations to the DOM
    apply();

    // Update switcher UI if present
    updateSwitcherUI();

    // Dispatch event for JS modules to react
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: langCode } }));

    return langCode;
  }

  /* ---------------------------------------------------
     Core: Translate a key
     --------------------------------------------------- */
  function t(key, params) {
    // Look up in current language, fall back to English, fall back to key itself
    let value = (translations[currentLang] && translations[currentLang][key])
             || (translations.en && translations.en[key])
             || key;

    // Substitute {placeholders}
    if (params && typeof value === 'string') {
      Object.keys(params).forEach(k => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
      });
    }

    return value;
  }

  /* ---------------------------------------------------
     Core: Apply translations to the DOM
     --------------------------------------------------- */
  let isApplying = false;

  function apply(root) {
    if (isApplying) return;
    isApplying = true;
    try {
      const scope = (root && typeof root.querySelectorAll === 'function') ? root : document;

      // data-i18n → textContent
      scope.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
          // Preserve child elements (like icons) by only replacing text nodes
          const translated = t(key);
          if (el.childElementCount === 0) {
            el.textContent = translated;
          } else {
            // Find or create a text node for the translatable part
            const textNodes = Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
            if (textNodes.length > 0) {
              const lastText = textNodes[textNodes.length - 1];
              lastText.textContent = ' ' + translated;
            }
          }
        }
      });

      // data-i18n-placeholder → placeholder attribute
      scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) el.placeholder = t(key);
      });

      // data-i18n-title → title attribute
      scope.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) el.title = t(key);
      });

      // data-i18n-html → innerHTML (for strings with simple markup like <br>)
      scope.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) el.innerHTML = t(key);
      });
    } finally {
      isApplying = false;
    }
  }

  /* ---------------------------------------------------
     Auto-observe DOM for dynamically inserted elements
     --------------------------------------------------- */
  let domObserver = null;
  function startObserver() {
    if (domObserver || typeof MutationObserver === 'undefined') return;
    let debounceTimer = null;

    domObserver = new MutationObserver((mutations) => {
      if (isApplying) return;
      let shouldApply = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) { // ELEMENT_NODE
              if (node.hasAttribute && (node.hasAttribute('data-i18n') || node.hasAttribute('data-i18n-placeholder') || node.hasAttribute('data-i18n-html') || node.hasAttribute('data-i18n-title'))) {
                shouldApply = true;
                break;
              }
              if (node.querySelector && node.querySelector('[data-i18n], [data-i18n-placeholder], [data-i18n-html], [data-i18n-title]')) {
                shouldApply = true;
                break;
              }
            }
          }
        }
        if (shouldApply) break;
      }
      if (shouldApply) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => apply(), 50);
      }
    });

    const target = document.body || document.documentElement;
    if (target) {
      domObserver.observe(target, { childList: true, subtree: true });
    }
  }

  /* ---------------------------------------------------
     Language Switcher: Build & Initialize
     --------------------------------------------------- */
  function initSwitcher() {
    const containers = document.querySelectorAll('.lang-switcher');
    containers.forEach(container => {
      const toggle = container.querySelector('.lang-switcher__toggle');
      const dropdown = container.querySelector('.lang-switcher__dropdown');

      if (!toggle || !dropdown) return;

      // Toggle dropdown
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        container.classList.toggle('open');
      });

      // Language selection
      dropdown.querySelectorAll('[data-lang]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const lang = btn.getAttribute('data-lang');
          container.classList.remove('open');
          load(lang);
        });
      });

      // Close on outside click
      document.addEventListener('click', () => {
        container.classList.remove('open');
      });
    });

    updateSwitcherUI();
  }

  function updateSwitcherUI() {
    document.querySelectorAll('.lang-switcher').forEach(container => {
      // Update current language display
      const currentDisplay = container.querySelector('.lang-switcher__current');
      if (currentDisplay) {
        currentDisplay.textContent = currentLang.toUpperCase();
      }

      // Highlight active language
      container.querySelectorAll('[data-lang]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
      });
    });
  }

  /* ---------------------------------------------------
     Intl Formatting Helpers
     --------------------------------------------------- */
  function getLocale() {
    return LOCALE_MAP[currentLang] || 'en-GH';
  }

  function formatDate(date, options) {
    const defaults = { year: 'numeric', month: 'short', day: 'numeric' };
    try {
      return new Intl.DateTimeFormat(getLocale(), options || defaults).format(
        typeof date === 'string' ? new Date(date) : date
      );
    } catch (e) {
      // Fallback for unsupported locales (Twi, Ga, etc.)
      return new Intl.DateTimeFormat('en-GH', options || defaults).format(
        typeof date === 'string' ? new Date(date) : date
      );
    }
  }

  function formatNumber(num, options) {
    try {
      return new Intl.NumberFormat(getLocale(), options).format(num);
    } catch (e) {
      return new Intl.NumberFormat('en-GH', options).format(num);
    }
  }

  function formatCurrency(amount) {
    // Always GHS, but locale-aware number formatting
    try {
      return new Intl.NumberFormat(getLocale(), {
        style: 'currency', currency: 'GHS',
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(amount);
    } catch (e) {
      return new Intl.NumberFormat('en-GH', {
        style: 'currency', currency: 'GHS',
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(amount);
    }
  }

  /* ---------------------------------------------------
     Utility: Determine base path for lang/ folder
     --------------------------------------------------- */
  function getBasePath() {
    // Works whether the page is at root or in a subdirectory
    const path = window.location.pathname;
    const lastSlash = path.lastIndexOf('/');
    return path.substring(0, lastSlash + 1);
  }

  /* ---------------------------------------------------
     Auto-initialize on load
     --------------------------------------------------- */
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const langToLoad = saved && LANGUAGES.find(l => l.code === saved) ? saved : DEFAULT_LANG;

    startObserver();

    load(langToLoad).then(() => {
      initSwitcher();
    });
  }

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---------------------------------------------------
     Expose Public API
     --------------------------------------------------- */
  window.ChurchOS = window.ChurchOS || {};
  window.ChurchOS.i18n = {
    load,
    t,
    apply,
    get lang() { return currentLang; },
    languages: LANGUAGES,
    formatDate,
    formatNumber,
    formatCurrency,
    initSwitcher,
  };

  // Convenience global: window.t = short alias
  window.t = t;

})();
