// i18n.js – Professionelle Sprachumschaltung (DE/EN) mit allen UI-Texten
(function() {
  'use strict';

  const translations = {
    de: {
      // Header
      title: '⚡ Quantum AI Hub',
      subtitle: 'Finde das richtige Tool für dein Problem',
      searchPlaceholder: 'z.B. ein Bild erstellen, Text übersetzen, Musik machen',
      // Tabs
      viewGrid: 'Alle Tools',
      viewStacks: 'Kategorien',
      sortTrigger: 'Sortieren ▾',
      sortNameAsc: 'Name (A-Z)',
      sortNameDesc: 'Name (Z-A)',
      sortSchool: 'Für Schule / Studium',
      sortWork: 'Für Beruf / Arbeit',
      sortDateDesc: 'Neueste zuerst',
      sortDateAsc: 'Älteste zuerst',
      // Subline
      subline: '▽Finde das passende KI-Tool für dein Vorhaben▽',
      // Footer
      footerText: 'Gebaut mit 💙',
      footerGitHub: 'GitHub',
      dataSource: 'Datenquelle',
      privacy: 'Datenschutz',
      imprint: 'Impressum',
      cookieSettings: 'Cookie-Einstellungen',
      // Detailseite (Meta)
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
      back: 'Zurück',
      // Kategorienamen (für Badges, Kategorie-Köpfe, etc.)
      cat_text: 'Texte schreiben & bearbeiten',
      cat_image: 'Bilder erstellen & designen',
      cat_code: 'codieren & entwickeln',
      cat_audio: 'Audio & Podcasts',
      cat_video: 'Videos & Animationen',
      cat_data: 'Daten auswerten & visualisieren',
      cat_other: 'Sonstige',
      // Stats-Marquee
      statsTools: 'Verfügbare Tools',
      statsCategories: 'Kategorien',
      statsFeatured: 'Empfohlene Tools',
      statsBest: 'Top bewertet',
      statsNew: 'Neu hinzugefügt',
      // Fallback-Tags für Kategorie-Köpfe (falls keine categoryTags)
      fallbackTags: ['Texte schreiben', 'Chatten', 'Übersetzen', 'Korrekturlesen'],
      // Im translations.de-Objekt:
      neonHelpTitle: '🔮 Verbindungen im Netzwerk',
      neonHelpStrong: 'Starke Verbindung – gleiche Kategorie, nah',
      neonHelpWeak: 'Schwächere Verbindung – gleiche Kategorie, weiter weg',
      neonHelpBridge: 'Brücken-Verbindung – zwischen verschiedenen Kategorien',
      neonHelpColorHint: 'Die Farbe der Linie entspricht der Kategorie der Ausgangskarte.',
      // Weitere allgemeine Texte
      unknownTool: 'Unbekannt',
      noDescription: 'Keine Beschreibung verfügbar.',
      noProvider: 'Unbekannt',
      linkNotAvailable: 'Link nicht verfügbar',
      noResults: 'Keine Ergebnisse für "{query}"',
      tryOther: 'Versuche einen anderen Suchbegriff'
    },
    en: {
      title: '⚡ Quantum AI Hub',
      subtitle: 'Find the right tool for your problem',
      searchPlaceholder: 'E.g. create a picture, translate text, make music',
      viewGrid: 'All Tools',
      viewStacks: 'Categories',
      sortTrigger: 'Sort ▾',
      sortNameAsc: 'Name (A-Z)',
      sortNameDesc: 'Name (Z-A)',
      sortSchool: 'For school / study',
      sortWork: 'For work / business',
      sortDateDesc: 'Newest first',
      sortDateAsc: 'Oldest first',
      subline: '▽Find the right AI tool for your task▽',
      footerText: 'Built with 💙',
      footerGitHub: 'GitHub',
      dataSource: 'Data source',
      privacy: 'Privacy Policy',
      imprint: 'Imprint',
      cookieSettings: 'Cookie Settings',
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
      back: 'Back',
      cat_text: 'Write & edit texts',
      cat_image: 'Create & design images',
      cat_code: 'Programming & developing',
      cat_audio: 'Audio & Podcasts',
      cat_video: 'Videos & Animations',
      cat_data: 'Evaluate & visualize data',
      cat_other: 'Others',
      statsTools: 'Available Tools',
      statsCategories: 'Categories',
      statsFeatured: 'Featured Tools',
      statsBest: 'Top Rated',
      statsNew: 'Recently Added',
      fallbackTags: ['Write texts', 'Chat', 'Translate', 'Proofread'],
      // Im translations.en-Objekt:
      neonHelpTitle: '🔮 Network Connections',
      neonHelpStrong: 'Strong connection – same category, nearby',
      neonHelpWeak: 'Weaker connection – same category, farther away',
      neonHelpBridge: 'Bridge connection – between different categories',
      neonHelpColorHint: 'The line color matches the category of the source card.',
      unknownTool: 'Unknown',
      noDescription: 'No description available.',
      noProvider: 'Unknown',
      linkNotAvailable: 'Link not available',
      noResults: 'No results for "{query}"',
      tryOther: 'Try a different search term'
    }
  };

  // Aktuelle Sprache ermitteln
  let currentLang = localStorage.getItem('language');
  if (!currentLang) {
    const browserLang = navigator.language.split('-')[0];
    currentLang = browserLang === 'de' ? 'de' : 'en';
    localStorage.setItem('language', currentLang);
  }

  function t(key) {
    return translations[currentLang][key] || key;
  }

  function updatePageLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
  }

  function setLanguage(lang) {
    if (translations[lang]) {
      currentLang = lang;
      localStorage.setItem('language', lang);
      updatePageLanguage();
      // Button-Beschriftung aktualisieren
      const langToggle = document.getElementById('languageToggle');
      if (langToggle) langToggle.textContent = lang === 'de' ? 'DE' : 'EN';
      // Event auslösen, damit app.js neu rendert (für Kategorienamen, Stats, etc.)
      window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
    }
  }

  // Initialisierung nach DOM-Laden
  document.addEventListener('DOMContentLoaded', () => {
    updatePageLanguage();
    const langToggle = document.getElementById('languageToggle');
    if (langToggle) {
      langToggle.textContent = currentLang === 'de' ? 'DE' : 'EN';
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