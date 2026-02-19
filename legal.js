// =========================================
// LEGAL.JS – DSGVO-konformes Cookie-Management & Rechtstexte
// Version: 1.0.1 (Schließen-Button als einfaches X)
// =========================================

(function() {
  'use strict';

  // =========================================
  // KONFIGURATION
  // =========================================
  const CONFIG = {
    gaId: 'G-53RF07VYJ8',
    consentMaxAge: 365,
    bannerDelay: 1000,
    selectors: {
      privacyLink: '#privacyLink',
      imprintLink: '#imprintLink',
      cookieSettingsLink: '#cookieSettingsLink'
    }
  };

  // =========================================
  // INTERNATIONALE TEXTE (DE/EN)
  // =========================================
  const texts = {
    de: {
      cookieBanner: {
        title: '🍪 Cookie-Einstellungen',
        text: 'Wir verwenden Cookies und ähnliche Technologien, um Ihnen die bestmögliche Erfahrung auf unserer Website zu bieten. Einige Cookies sind technisch notwendig, während andere uns helfen, die Nutzung der Website zu analysieren und zu verbessern. Sie können Ihre Einwilligung jederzeit widerrufen.',
        acceptAll: 'Alle akzeptieren',
        acceptNecessary: 'Nur notwendige',
        settings: 'Einstellungen'
      },
      cookieModal: {
        title: 'Cookie-Einstellungen',
        necessary: {
          title: 'Notwendige Cookies',
          desc: 'Diese Cookies sind für die grundlegende Funktionalität der Website erforderlich und können nicht deaktiviert werden.'
        },
        analytics: {
          title: 'Analyse-Cookies',
          desc: 'Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website interagieren, indem sie Informationen anonym sammeln und melden. (Google Analytics)'
        },
        functional: {
          title: 'Funktionale Cookies',
          desc: 'Diese Cookies ermöglichen erweiterte Funktionen wie das Speichern Ihrer Spracheinstellungen und Präferenzen.'
        },
        marketing: {
          title: 'Marketing-Cookies',
          desc: 'Diese Cookies werden verwendet, um Besuchern auf anderen Websites relevante Werbung anzuzeigen. (Derzeit nicht aktiv)'
        },
        save: 'Einstellungen speichern',
        cancel: 'Abbrechen'
      },
      legal: {
        privacyTitle: 'Datenschutzerklärung',
        imprintTitle: 'Impressum'
      }
    },
    en: {
      cookieBanner: {
        title: '🍪 Cookie Settings',
        text: 'We use cookies and similar technologies to provide you with the best possible experience on our website. Some cookies are technically necessary, while others help us analyze and improve the use of the website. You can revoke your consent at any time.',
        acceptAll: 'Accept all',
        acceptNecessary: 'Only necessary',
        settings: 'Settings'
      },
      cookieModal: {
        title: 'Cookie Settings',
        necessary: {
          title: 'Necessary Cookies',
          desc: 'These cookies are required for the basic functionality of the website and cannot be disabled.'
        },
        analytics: {
          title: 'Analytics Cookies',
          desc: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. (Google Analytics)'
        },
        functional: {
          title: 'Functional Cookies',
          desc: 'These cookies enable advanced features such as saving your language settings and preferences.'
        },
        marketing: {
          title: 'Marketing Cookies',
          desc: 'These cookies are used to show visitors relevant advertising on other websites. (Currently not active)'
        },
        save: 'Save settings',
        cancel: 'Cancel'
      },
      legal: {
        privacyTitle: 'Privacy Policy',
        imprintTitle: 'Imprint'
      }
    }
  };

  // Ausführliche Rechtstexte
  const legalContent = {
    de: {
      privacy: `
        <h2>Datenschutzerklärung</h2>
        <h3>1. Verantwortlicher</h3>
        <p>Qerim Banulla<br>
        c/o Online-Impressum.de #6292<br>
        Europaring 90<br>
        53757 Sankt Augustin<br>
        Deutschland<br>
        E-Mail: ai.tool.hub.contact@gmail.com</p>

        <h3>2. Hosting durch GitHub Pages</h3>
        <p>Wir hosten unsere Website bei <strong>GitHub Pages</strong>. Anbieter ist die GitHub Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA (nachfolgend „GitHub“).</p>
        <p>Wenn Sie unsere Website besuchen, erfasst GitHub Ihre IP-Adresse sowie technische Informationen (Logfiles), um die Sicherheit und Auslieferung der Website zu gewährleisten. Die Nutzung von GitHub Pages erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer möglichst zuverlässigen Darstellung unserer Website.</p>
        <p>Die Datenübertragung in die USA wird auf die Standardvertragsklauseln der EU-Kommission gestützt. Weitere Details entnehmen Sie der Datenschutzerklärung von GitHub: <a href="https://docs.github.com/de/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener">https://docs.github.com/de/site-policy/privacy-policies/github-privacy-statement</a>.</p>

        <h3>3. Cookies und Einwilligungsmanagement</h3>
        <p>Unsere Website verwendet Cookies. Notwendige Cookies sind für den Betrieb der Website technisch erforderlich. Analyse-Cookies (Google Analytics) setzen wir nur mit Ihrer ausdrücklichen Einwilligung ein. Ihre Einwilligung können Sie jederzeit über den Link "Cookie-Einstellungen" im Footer widerrufen. Die Rechtsgrundlage für notwendige Cookies ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse), für Analyse-Cookies Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).</p>
        <p>Ihre Cookie-Präferenzen werden für die Dauer von ${CONFIG.consentMaxAge} Tagen in Ihrem Browser gespeichert.</p>

        <h3>4. Google Analytics 4</h3>
        <p>Diese Website verwendet Google Analytics 4, einen Webanalysedienst der Google LLC. Die durch das Cookie erzeugten Informationen über Ihre Benutzung dieser Website werden in der Regel an einen Server von Google in den USA übertragen und dort gespeichert. Wir verwenden die Funktion "IP-Anonymisierung". Ihre IP-Adresse wird von Google innerhalb von Mitgliedstaaten der Europäischen Union oder in anderen Vertragsstaaten des Abkommens über den Europäischen Wirtschaftsraum zuvor gekürzt. Die Speicherdauer beträgt 14 Monate. Weitere Informationen finden Sie in der <a href="https://policies.google.com/privacy" target="_blank">Datenschutzerklärung von Google</a>.</p>

        <h3>5. Supabase</h3>
        <p>Für die Speicherung von Bewertungen (Votes) nutzen wir Supabase, einen cloudbasierten Backend-Dienst. Die gespeicherten Daten (Tool-ID, Bewertungswert) enthalten keine personenbezogenen Informationen. Supabase kann Server in den USA nutzen; die Datenübertragung erfolgt auf Grundlage der Standardvertragsklauseln. Weitere Informationen: <a href="https://supabase.com/privacy" target="_blank">Supabase Datenschutz</a>.</p>

        <h3>6. Ihre Rechte</h3>
        <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Kontaktieren Sie uns dazu unter der oben genannten E-Mail-Adresse.</p>

        <h3>7. Kontakt</h3>
        <p>Bei Fragen zum Datenschutz erreichen Sie uns unter: ai.tool.hub.contact@gmail.com</p>

        <p><em>Stand: Februar 2026</em></p>
      `,
      imprint: `
        <h2>Impressum</h2>
        <h3>Angaben gemäß § 5 DDG</h3>
        <p>Qerim Banulla<br>
        c/o Online-Impressum.de #6292<br>
        Europaring 90<br>
        53757 Sankt Augustin<br>
        Deutschland</p>

        <h3>Kontakt</h3>
        <p>Telefon: +49 173 5489128 (kein Telefonsupport – bitte nutzen Sie E-Mail)<br>
        E-Mail: ai.tool.hub.contact@gmail.com</p>

        <h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
        <p>Qerim Banulla (Adresse wie oben)</p>

        <h3>Haftungsausschluss & Affiliate-Hinweis</h3>
        <p>Die Inhalte dieser Seite wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden. Diese Website enthält zudem Affiliate-Links. Wenn Sie über diese Links ein Produkt kaufen, erhalte ich eine kleine Provision, ohne dass für Sie Mehrkosten entstehen.</p>

        <h4>Haftung für Links</h4>
        <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>

        <h4>Urheberrecht</h4>
        <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>

        <p><em>Stand: Februar 2026</em></p>
      `
    },
    en: {
      privacy: `
        <h2>Privacy Policy</h2>
        <h3>1. Controller</h3>
        <p>Qerim Banulla<br>
        c/o Online-Impressum.de #6292<br>
        Europaring 90<br>
        53757 Sankt Augustin<br>
        Germany<br>
        Email: ai.tool.hub.contact@gmail.com</p>

        <h3>2. Hosting by GitHub Pages</h3>
        <p>We host our website on <strong>GitHub Pages</strong>. The provider is GitHub Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA (hereinafter "GitHub").</p>
        <p>When you visit our website, GitHub collects your IP address and technical information (log files) to ensure security and delivery. The use of GitHub Pages is based on Art. 6 para. 1 lit. f GDPR. We have a legitimate interest in the most reliable presentation of our website.</p>
        <p>The data transfer to the USA is based on the standard contractual clauses of the EU Commission. For more details, please refer to GitHub's privacy policy: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener">https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement</a>.</p>

        <h3>3. Cookies and Consent Management</h3>
        <p>Our website uses cookies. Necessary cookies are technically required for the operation of the website. Analytics cookies (Google Analytics) are only used with your explicit consent. You can revoke your consent at any time via the "Cookie Settings" link in the footer. The legal basis for necessary cookies is Art. 6 para. 1 lit. f GDPR (legitimate interest), for analytics cookies Art. 6 para. 1 lit. a GDPR (consent).</p>
        <p>Your cookie preferences are stored in your browser for ${CONFIG.consentMaxAge} days.</p>

        <h3>4. Google Analytics 4</h3>
        <p>This website uses Google Analytics 4, a web analytics service provided by Google LLC. The information generated by the cookie about your use of this website is usually transmitted to and stored by Google on servers in the United States. We use the "IP anonymization" function. Your IP address will be truncated by Google within member states of the European Union or other parties to the Agreement on the European Economic Area. The storage period is 14 months. For more information, see <a href="https://policies.google.com/privacy" target="_blank">Google's Privacy Policy</a>.</p>

        <h3>5. Supabase</h3>
        <p>We use Supabase, a cloud-based backend service, to store ratings (votes). The stored data (tool ID, rating value) does not contain any personal information. Supabase may use servers in the USA; data transfer is based on standard contractual clauses. For more information: <a href="https://supabase.com/privacy" target="_blank">Supabase Privacy</a>.</p>

        <h3>6. Your Rights</h3>
        <p>You have the right to information, correction, deletion, restriction of processing, data portability and objection. Contact us at the email address above.</p>

        <h3>7. Contact</h3>
        <p>For data protection inquiries: ai.tool.hub.contact@gmail.com</p>

        <p><em>As of: February 2026</em></p>
      `,
      imprint: `
        <h2>Imprint</h2>
        <h3>Information according to § 5 DDG</h3>
        <p>Qerim Banulla<br>
        c/o Online-Impressum.de #6292<br>
        Europaring 90<br>
        53757 Sankt Augustin<br>
        Germany</p>

        <h3>Contact</h3>
        <p>Phone: +49 173 5489128 (no phone support – please use email)<br>
        Email: ai.tool.hub.contact@gmail.com</p>

        <h3>Responsible for content according to § 18 Abs. 2 MStV</h3>
        <p>Qerim Banulla (address as above)</p>

        <h3>Disclaimer & Affiliate Notice</h3>
        <p>The contents of this page have been created with the greatest care. However, no guarantee can be given for the correctness, completeness and topicality of the contents. This website also contains affiliate links. If you purchase a product through these links, I will receive a small commission without any additional cost to you.</p>

        <h4>Liability for Links</h4>
        <p>Our offer contains links to external third-party websites over whose content we have no influence. The content of the linked pages is always the responsibility of the respective provider or operator of the pages.</p>

        <h4>Copyright</h4>
        <p>The content and works created by the site operators on these pages are subject to German copyright law. Reproduction, processing, distribution and any kind of exploitation outside the limits of copyright require the written consent of the respective author or creator.</p>

        <p><em>As of: February 2026</em></p>
      `
    }
  };

  // =========================================
  // HILFSFUNKTIONEN
  // =========================================
  function getCurrentLang() {
    return window.i18n ? window.i18n.currentLang : 'de';
  }

  function t(key) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key) || key;
    }
    return texts[getCurrentLang()]?.cookieBanner?.[key] || key;
  }

  // =========================================
  // COOKIE-MANAGEMENT
  // =========================================
  let cookiePreferences = {
    necessary: true,
    analytics: false,
    functional: false,
    marketing: false
  };

  function loadCookiePreferences() {
    const saved = localStorage.getItem('cookiePreferences');
    if (saved) {
      try {
        cookiePreferences = JSON.parse(saved);
      } catch (e) {
        console.warn('Fehler beim Laden der Cookie-Präferenzen', e);
      }
    }
    updateCheckboxesFromPrefs();
    if (cookiePreferences.analytics) {
      loadGoogleAnalytics();
    }
  }

  function saveCookiePreferences() {
    localStorage.setItem('cookiePreferences', JSON.stringify(cookiePreferences));
    updateCheckboxesFromPrefs();
    if (cookiePreferences.analytics) {
      loadGoogleAnalytics();
    }
    hideCookieBanner();
  }

  function updateCheckboxesFromPrefs() {
    const analyticsCheck = document.getElementById('analyticsCookies');
    const functionalCheck = document.getElementById('functionalCookies');
    const marketingCheck = document.getElementById('marketingCookies');
    if (analyticsCheck) analyticsCheck.checked = cookiePreferences.analytics;
    if (functionalCheck) functionalCheck.checked = cookiePreferences.functional;
    if (marketingCheck) marketingCheck.checked = cookiePreferences.marketing;
  }

  // =========================================
  // GOOGLE ANALYTICS NACHADEN
  // =========================================
  function loadGoogleAnalytics() {
    if (window.gaLoaded) return;
    window.gaLoaded = true;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.gaId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', CONFIG.gaId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_flags: 'SameSite=Strict;Secure',
      cookie_expires: CONFIG.consentMaxAge * 24 * 60 * 60,
      send_page_view: true
    });
  }

  // =========================================
  // COOKIE-BANNER
  // =========================================
  function showCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.classList.add('active');
  }

  function hideCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.classList.remove('active');
  }

  function isConsentGiven() {
    return localStorage.getItem('cookiePreferences') !== null;
  }

  // =========================================
  // HTML-STRUKTUREN ERZEUGEN
  // =========================================
  function createCookieBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.className = 'cookie-banner';
    const lang = getCurrentLang();
    banner.innerHTML = `
      <div class="cookie-banner-content">
        <div class="cookie-banner-text">
          <h3>${texts[lang].cookieBanner.title}</h3>
          <p>${texts[lang].cookieBanner.text}</p>
        </div>
        <div class="cookie-banner-actions">
          <button class="cookie-btn settings" id="cookieSettingsBtn">${texts[lang].cookieBanner.settings}</button>
          <button class="cookie-btn accept-necessary" id="cookieNecessaryBtn">${texts[lang].cookieBanner.acceptNecessary}</button>
          <button class="cookie-btn accept-all" id="cookieAcceptAllBtn">${texts[lang].cookieBanner.acceptAll}</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);
  }

  function createCookieModal() {
    const modal = document.createElement('div');
    modal.id = 'cookieModal';
    modal.className = 'cookie-modal-overlay';
    const lang = getCurrentLang();
    modal.innerHTML = `
      <div class="cookie-modal-content">
        <div class="cookie-modal-header">
          <h3 class="cookie-modal-title">${texts[lang].cookieModal.title}</h3>
          <button class="cookie-modal-close" id="cookieModalClose">✕</button>
        </div>
        <div class="cookie-modal-body">
          <div class="cookie-option">
            <div class="cookie-option-info">
              <div class="cookie-option-title">${texts[lang].cookieModal.necessary.title}</div>
              <div class="cookie-option-desc">${texts[lang].cookieModal.necessary.desc}</div>
            </div>
            <label class="cookie-switch">
              <input type="checkbox" checked disabled>
              <span class="cookie-slider"></span>
            </label>
          </div>
          <div class="cookie-option">
            <div class="cookie-option-info">
              <div class="cookie-option-title">${texts[lang].cookieModal.analytics.title}</div>
              <div class="cookie-option-desc">${texts[lang].cookieModal.analytics.desc}</div>
            </div>
            <label class="cookie-switch">
              <input type="checkbox" id="analyticsCookies">
              <span class="cookie-slider"></span>
            </label>
          </div>
          <div class="cookie-option">
            <div class="cookie-option-info">
              <div class="cookie-option-title">${texts[lang].cookieModal.functional.title}</div>
              <div class="cookie-option-desc">${texts[lang].cookieModal.functional.desc}</div>
            </div>
            <label class="cookie-switch">
              <input type="checkbox" id="functionalCookies">
              <span class="cookie-slider"></span>
            </label>
          </div>
          <div class="cookie-option">
            <div class="cookie-option-info">
              <div class="cookie-option-title">${texts[lang].cookieModal.marketing.title}</div>
              <div class="cookie-option-desc">${texts[lang].cookieModal.marketing.desc}</div>
            </div>
            <label class="cookie-switch">
              <input type="checkbox" id="marketingCookies">
              <span class="cookie-slider"></span>
            </label>
          </div>
          <div class="cookie-modal-actions">
            <button class="cookie-modal-btn cancel" id="cookieModalCancel">${texts[lang].cookieModal.cancel}</button>
            <button class="cookie-modal-btn save" id="cookieModalSave">${texts[lang].cookieModal.save}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function createLegalModal(id, titleContent, bodyContent) {
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'legal-modal-overlay';
    modal.innerHTML = `
      <div class="legal-modal-content">
        <div class="legal-modal-header">
          <h3 class="legal-modal-title">${titleContent}</h3>
          <button class="legal-modal-close" id="${id}Close">✕</button>
        </div>
        <div class="legal-modal-body" id="${id}Body">${bodyContent}</div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // =========================================
  // EVENT-HANDLER
  // =========================================
  function attachEvents() {
    const acceptAllBtn = document.getElementById('cookieAcceptAllBtn');
    const necessaryBtn = document.getElementById('cookieNecessaryBtn');
    const settingsBtn = document.getElementById('cookieSettingsBtn');
    const modalClose = document.getElementById('cookieModalClose');
    const modalCancel = document.getElementById('cookieModalCancel');
    const modalSave = document.getElementById('cookieModalSave');

    if (acceptAllBtn) {
      acceptAllBtn.addEventListener('click', () => {
        cookiePreferences.analytics = true;
        cookiePreferences.functional = true;
        cookiePreferences.marketing = true;
        saveCookiePreferences();
      });
    }

    if (necessaryBtn) {
      necessaryBtn.addEventListener('click', () => {
        cookiePreferences.analytics = false;
        cookiePreferences.functional = false;
        cookiePreferences.marketing = false;
        saveCookiePreferences();
      });
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', openCookieModal);
    }

    if (modalClose) {
      modalClose.addEventListener('click', closeCookieModal);
    }

    if (modalCancel) {
      modalCancel.addEventListener('click', closeCookieModal);
    }

    if (modalSave) {
      modalSave.addEventListener('click', () => {
        cookiePreferences.analytics = document.getElementById('analyticsCookies').checked;
        cookiePreferences.functional = document.getElementById('functionalCookies').checked;
        cookiePreferences.marketing = document.getElementById('marketingCookies').checked;
        saveCookiePreferences();
        closeCookieModal();
      });
    }

    const cookieModal = document.getElementById('cookieModal');
    const privacyModal = document.getElementById('privacyModal');
    const imprintModal = document.getElementById('imprintModal');

    if (cookieModal) {
      cookieModal.addEventListener('click', (e) => {
        if (e.target === cookieModal) closeCookieModal();
      });
    }

    if (privacyModal) {
      privacyModal.addEventListener('click', (e) => {
        if (e.target === privacyModal) closePrivacyModal();
      });
    }

    if (imprintModal) {
      imprintModal.addEventListener('click', (e) => {
        if (e.target === imprintModal) closeImprintModal();
      });
    }

    const privacyLink = document.querySelector(CONFIG.selectors.privacyLink);
    const imprintLink = document.querySelector(CONFIG.selectors.imprintLink);
    const cookieSettingsLink = document.querySelector(CONFIG.selectors.cookieSettingsLink);

    if (privacyLink) {
      privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        openPrivacyModal();
      });
    }

    if (imprintLink) {
      imprintLink.addEventListener('click', (e) => {
        e.preventDefault();
        openImprintModal();
      });
    }

    if (cookieSettingsLink) {
      cookieSettingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        openCookieModal();
      });
    }

    const privacyClose = document.getElementById('privacyModalClose');
    const imprintClose = document.getElementById('imprintModalClose');
    if (privacyClose) privacyClose.addEventListener('click', closePrivacyModal);
    if (imprintClose) imprintClose.addEventListener('click', closeImprintModal);
  }

  // =========================================
  // MODAL-FUNKTIONEN
  // =========================================
  function openCookieModal() {
    const modal = document.getElementById('cookieModal');
    if (modal) {
      updateCheckboxesFromPrefs();
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCookieModal() {
    const modal = document.getElementById('cookieModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  function openPrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) {
      const body = document.getElementById('privacyModalBody');
      body.innerHTML = legalContent[getCurrentLang()].privacy;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  function openImprintModal() {
    const modal = document.getElementById('imprintModal');
    if (modal) {
      const body = document.getElementById('imprintModalBody');
      body.innerHTML = legalContent[getCurrentLang()].imprint;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeImprintModal() {
    const modal = document.getElementById('imprintModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  // =========================================
  // INITIALISIERUNG
  // =========================================
  function init() {
    if (!document.getElementById('cookieBanner')) createCookieBanner();
    if (!document.getElementById('cookieModal')) createCookieModal();
    if (!document.getElementById('privacyModal')) {
      createLegalModal('privacyModal', texts[getCurrentLang()].legal.privacyTitle, legalContent[getCurrentLang()].privacy);
    }
    if (!document.getElementById('imprintModal')) {
      createLegalModal('imprintModal', texts[getCurrentLang()].legal.imprintTitle, legalContent[getCurrentLang()].imprint);
    }

    loadCookiePreferences();

    if (!isConsentGiven()) {
      setTimeout(showCookieBanner, CONFIG.bannerDelay);
    }

    attachEvents();

    window.addEventListener('languagechange', () => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();