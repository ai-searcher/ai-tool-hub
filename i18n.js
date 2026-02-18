// i18n.js – Einfache Sprachumschaltung (DE/EN)
(function() {
  'use strict';

  const translations = {
    de: {
      // Header
      title: '⚡ Quantum AI Hub',
      subtitle: 'Deine kuratierte AI Tool-Sammlung',
      searchPlaceholder: 'Tool suchen... (z.B. ChatGPT, Midjourney)',
      // Tabs
      viewGrid: 'Raster',
      viewStacks: 'Kategorien',
      sortTrigger: 'Sortieren ▾',
      sortNameAsc: 'Name (A-Z)',
      sortNameDesc: 'Name (Z-A)',
      sortRatingDesc: 'Bewertung (absteigend)',
      sortRatingAsc: 'Bewertung (aufsteigend)',
      sortDateDesc: 'Neueste zuerst',
      sortDateAsc: 'Älteste zuerst',
      // Subline
      subline: '▽▽ Finde KI-Tools für Text, Bild, Code und mehr ▽▽',
      // Footer
      footerText: 'Gebaut mit 💙',
      footerGitHub: 'GitHub',
      dataSource: 'Datenquelle',
      // Detailseite
      category: 'Kategorie',
      provider: 'Anbieter',
      rating: 'Bewertung',
      sectionStrengths: 'Das kann das Tool',
      sectionUseCases: 'Dafür nutzt du es',
      sectionPrompts: 'Zum Ausprobieren',
      sectionTips: 'So bekommst du bessere Antworten',
      openTool: 'Tool öffnen',
      close: 'Schließen',
      loading: 'Lade Details...',
      error: '❌ Tool nicht gefunden.',
      back: 'Zurück'
    },
    en: {
      title: '⚡ Quantum AI Hub',
      subtitle: 'Your curated AI Tool Collection',
      searchPlaceholder: 'Search tools... (e.g. ChatGPT, Midjourney)',
      viewGrid: 'Grid',
      viewStacks: 'Categories',
      sortTrigger: 'Sort ▾',
      sortNameAsc: 'Name (A-Z)',
      sortNameDesc: 'Name (Z-A)',
      sortRatingDesc: 'Rating (highest first)',
      sortRatingAsc: 'Rating (lowest first)',
      sortDateDesc: 'Newest first',
      sortDateAsc: 'Oldest first',
      subline: '▽▽ Find AI tools for text, image, code and more ▽▽',
      footerText: 'Built with 💙',
      footerGitHub: 'GitHub',
      dataSource: 'Data source',
      category: 'Category',
      provider: 'Provider',
      rating: 'Rating',
      sectionStrengths: 'What it can do',
      sectionUseCases: 'What it\'s good for',
      sectionPrompts: 'Try it out',
      sectionTips: 'Tips for better results',
      openTool: 'Open tool',
      close: 'Close',
      loading: 'Loading details...',
      error: '❌ Tool not found.',
      back: 'Back'
    }
  };

  // Aktuelle Sprache ermitteln
  let currentLang = localStorage.getItem('language');
  if (!currentLang) {
    // Browser-Sprache erkennen (z.B. 'de-DE' → 'de')
    const browserLang = navigator.language.split('-')[0];
    currentLang = browserLang === 'de' ? 'de' : 'en';
    localStorage.setItem('language', currentLang);
  }

  // Übersetzungsfunktion
  function t(key) {
    return translations[currentLang][key] || key;
  }

  // Alle übersetzbaren Elemente aktualisieren
  function updatePageLanguage() {
    // Elemente mit data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    // Platzhalter (z.B. Suchfeld)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
    // ggf. weitere Attribute (z.B. value bei Buttons) – hier nicht nötig
  }

  // Sprache umschalten
  function setLanguage(lang) {
    if (translations[lang]) {
      currentLang = lang;
      localStorage.setItem('language', lang);
      updatePageLanguage();
      // Seite neu rendern? Für dynamische Inhalte (z.B. Tool-Karten) nicht nötig, 
      // da sie aus Daten kommen. Aber falls Kategorienamen übersetzt werden sollen, 
      // müsste man ein Event auslösen, das app.js abfängt. Vereinfacht: Seite neu laden.
      // Für bessere UX könnten wir ein Custom Event dispatchen.
      window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
    }
  }

  // Initialisierung
  document.addEventListener('DOMContentLoaded', () => {
    updatePageLanguage();

    // Sprachumschalter-Button (muss in HTML existieren)
    const langToggle = document.getElementById('languageToggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        const newLang = currentLang === 'de' ? 'en' : 'de';
        setLanguage(newLang);
      });
    }
  });

  // Globale API bereitstellen
  window.i18n = {
    t,
    setLanguage,
    get currentLang() { return currentLang; }
  };
})();
