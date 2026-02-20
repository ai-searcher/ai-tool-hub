// =========================================
// PERFORMANCE.JS – Optimierungs-Engine für Quantum AI Hub
// Version: 3.0.0 (Maximale Performance & Intelligenz)
// Enthält: Suchindex (TF‑IDF + Trie), adaptiver Animation-Scheduler,
//          DOM-Batcher mit Prioritäten, mehrstufiger Cache (LRU + IndexedDB),
//          optimierte throttle/debounce, erweiterter LazyLoader,
//          SmartSearch mit umfangreicher Intent-Erkennung.
// KEINE Änderungen an der öffentlichen API – voll kompatibel mit app.js u.a.
// =========================================

(function(global) {
  'use strict';

  // -------------------------------------------------------------
  // INTERNE HILFSFUNKTIONEN (performance-optimiert)
  // -------------------------------------------------------------
  const hasPerformance = typeof performance !== 'undefined';
  const now = hasPerformance ? () => performance.now() : () => Date.now();
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  // -------------------------------------------------------------
  // 1. SUCHINDEX – Schnelle Volltextsuche mit TF‑IDF und Prefix‑Trie
  // -------------------------------------------------------------
  class SearchIndex {
    constructor() {
      this.index = new Map();          // term -> Map<docId, tf>
      this.tools = new Map();          // docId -> tool
      this.docFreq = new Map();        // term -> df
      this.totalDocs = 0;
      this.trie = new Map();           // Prefix-Trie für schnelle Autocomplete-Vorschläge
      // Tokenizer (behält Worttrennung bei)
      this.tokenizer = (text) => text.toLowerCase().split(/\W+/).filter(t => t.length > 1);
    }

    addTools(tools) {
      if (Array.isArray(tools)) {
        tools.forEach(t => this.addTool(t));
      } else {
        this.addTool(tools);
      }
    }

    addTool(tool) {
      if (!tool || !tool.id) return;
      const docId = tool.id;
      this.tools.set(docId, tool);
      this.totalDocs++;

      // Alle durchsuchbaren Felder sammeln (deutsch + englisch)
      const fields = this._collectFields(tool);
      const termFreq = new Map();

      fields.forEach(text => {
        if (!text) return;
        this.tokenizer(text).forEach(token => {
          termFreq.set(token, (termFreq.get(token) || 0) + 1);
        });
      });

      // In invertierten Index eintragen
      for (let [term, tf] of termFreq) {
        if (!this.index.has(term)) this.index.set(term, new Map());
        this.index.get(term).set(docId, tf);
        // Dokumentenhäufigkeit erhöhen (nur einmal pro Dokument)
        const df = this.docFreq.get(term) || 0;
        this.docFreq.set(term, df + 1);
      }

      // Prefix-Trie für Tool-Namen (nur Titel, für schnelle Autocomplete-Vorschläge)
      if (tool.title) {
        const titleLower = tool.title.toLowerCase();
        for (let i = 1; i <= titleLower.length; i++) {
          const prefix = titleLower.substring(0, i);
          if (!this.trie.has(prefix)) this.trie.set(prefix, new Set());
          this.trie.get(prefix).add(docId);
        }
      }
    }

    _collectFields(tool) {
      const fields = [];
      if (tool.title) fields.push(tool.title);
      if (tool.description) fields.push(tool.description);
      if (tool.tags) fields.push(...tool.tags);
      if (tool.provider) fields.push(tool.provider);
      if (tool.badges) fields.push(...tool.badges);
      if (tool.category) fields.push(tool.category);
      if (tool.en) {
        if (tool.en.title) fields.push(tool.en.title);
        if (tool.en.description) fields.push(tool.en.description);
        if (tool.en.badges) fields.push(...tool.en.badges);
      }
      return fields;
    }

    // IDF für einen Term (logarithmisch)
    _idf(term) {
      const df = this.docFreq.get(term) || 0;
      return df ? Math.log(this.totalDocs / df) : 0;
    }

    search(query) {
      if (!query || query.length < 2) return [];
      const tokens = this.tokenizer(query);
      if (tokens.length === 0) return [];

      // Scores pro Dokument aufbauen (TF‑IDF)
      const scores = new Map();
      tokens.forEach(token => {
        const postings = this.index.get(token);
        if (!postings) return;
        const idf = this._idf(token);
        for (let [docId, tf] of postings) {
          const score = (scores.get(docId) || 0) + tf * idf;
          scores.set(docId, score);
        }
      });

      if (scores.size === 0) return [];

      // Prefix‑Matching (Tool-Namen, die mit Query beginnen) bekommen Bonus
      const prefixMatches = this.trie.get(query.toLowerCase());
      if (prefixMatches) {
        prefixMatches.forEach(docId => {
          scores.set(docId, (scores.get(docId) || 0) + 10);
        });
      }

      // Sortieren nach Score absteigend
      const sorted = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([docId]) => docId);
      return sorted;
    }

    getTool(id) {
      return this.tools.get(id);
    }

    clear() {
      this.index.clear();
      this.tools.clear();
      this.docFreq.clear();
      this.totalDocs = 0;
      this.trie.clear();
    }
  }

  // -------------------------------------------------------------
  // 2. ADAPTIVER ANIMATION-SCHEDULER – dynamische Framerate, Idle-Tasks
  // -------------------------------------------------------------
  class AnimationScheduler {
    constructor(targetFPS = 30, options = {}) {
      this.targetFPS = targetFPS;
      this.interval = 1000 / targetFPS;
      this.tasks = new Set();
      this.running = false;
      this.lastFrame = 0;
      this.frameId = null;
      this.adaptive = options.adaptive || false;
      this.idleThreshold = options.idleThreshold || 3000; // ms
      this.lastTaskTime = now();
      this.cpuLoad = 0;
      this.currentFPS = targetFPS;
      this.frameCount = 0;
      this.lastMeasure = now();
      this.visibilityHidden = false;

      if (isBrowser) {
        document.addEventListener('visibilitychange', () => {
          this.visibilityHidden = document.hidden;
          if (this.visibilityHidden) {
            this.stop();
          } else if (this.tasks.size > 0) {
            this.start();
          }
        });
      }
    }

    add(task) {
      this.tasks.add(task);
      this.lastTaskTime = now();
      this.start();
    }

    remove(task) {
      this.tasks.delete(task);
      if (this.tasks.size === 0) this.stop();
    }

    start() {
      if (this.running || this.visibilityHidden) return;
      this.running = true;
      this.lastFrame = now();
      this.loop();
    }

    stop() {
      if (this.frameId) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      this.running = false;
    }

    _measureLoad() {
      const nowTime = now();
      if (nowTime - this.lastMeasure > 1000) {
        const expectedFrames = this.targetFPS;
        const actualFrames = this.frameCount;
        this.cpuLoad = 1 - (actualFrames / expectedFrames);
        this.frameCount = 0;
        this.lastMeasure = nowTime;
        if (this.adaptive) {
          // Bei hoher Last (CPU > 30%) reduziere FPS, bei niedriger erhöhe
          if (this.cpuLoad > 0.3) {
            this.currentFPS = Math.max(15, Math.floor(this.targetFPS * 0.7));
          } else if (this.cpuLoad < 0.1) {
            this.currentFPS = Math.min(this.targetFPS, this.currentFPS + 2);
          }
          this.interval = 1000 / this.currentFPS;
        }
      }
    }

    loop() {
      const nowTime = now();
      const elapsed = nowTime - this.lastFrame;

      this._measureLoad();

      if (elapsed >= this.interval) {
        this.frameCount++;
        // Alle Tasks ausführen (wenn kein Idle nötig)
        this.tasks.forEach(task => {
          try { task(); } catch (e) { console.error('Animation task error', e); }
        });
        this.lastFrame = nowTime - (elapsed % this.interval);
      }

      this.frameId = requestAnimationFrame(() => this.loop());
    }
  }

  // -------------------------------------------------------------
  // 3. DOM-BATCHER – mit Prioritäten und automatischer Read/Write-Trennung
  // -------------------------------------------------------------
  class DOMBatcher {
    constructor() {
      this.queues = {
        high: new Set(),   // z.B. Scroll-Änderungen
        normal: new Set(),
        low: new Set()     // Hintergrundtasks
      };
      this.readQueue = new Set();
      this.scheduled = false;
    }

    add(updateFn, priority = 'normal') {
      this.queues[priority].add(updateFn);
      this._schedule();
    }

    read(fn) {
      this.readQueue.add(fn);
      this._schedule();
    }

    _schedule() {
      if (this.scheduled) return;
      this.scheduled = true;
      requestAnimationFrame(() => this._flush());
    }

    _flush() {
      // Zuerst alle Leseoperationen (werden gleichzeitig ausgeführt, kein Layout-Thrashing)
      this.readQueue.forEach(fn => {
        try { fn(); } catch (e) { console.error('DOM batch read error', e); }
      });
      this.readQueue.clear();

      // Dann Schreiboperationen nach Priorität
      ['high', 'normal', 'low'].forEach(priority => {
        this.queues[priority].forEach(fn => {
          try { fn(); } catch (e) { console.error(`DOM batch ${priority} error`, e); }
        });
        this.queues[priority].clear();
      });

      this.scheduled = false;
    }
  }

  // -------------------------------------------------------------
  // 4. MEHRSTUFIGER CACHE – LRU + optionale IndexedDB-Persistenz
  // -------------------------------------------------------------
  class Cache {
    constructor(ttl = 60000, maxSize = 100, options = {}) {
      this.ttl = ttl;
      this.maxSize = maxSize;
      this.store = new Map();          // key -> { value, expires, lastAccess }
      this.persist = options.persist || false;
      if (this.persist && isBrowser && typeof indexedDB !== 'undefined') {
        this._initDB();
      }
    }

    _initDB() {
      const request = indexedDB.open('PerformanceCache', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        // Gespeicherte Daten in den Speicher laden
        const tx = this.db.transaction('cache', 'readonly');
        const store = tx.objectStore('cache');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const items = getAll.result;
          items.forEach(item => {
            if (item.expires > Date.now()) {
              this.store.set(item.key, {
                value: item.value,
                expires: item.expires,
                lastAccess: Date.now()
              });
            } else {
              // abgelaufene löschen
              const deleteTx = this.db.transaction('cache', 'readwrite');
              deleteTx.objectStore('cache').delete(item.key);
            }
          });
        };
      };
    }

    set(key, value) {
      // Platz schaffen (LRU)
      if (this.store.size >= this.maxSize) {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (let [k, v] of this.store) {
          if (v.lastAccess < oldestTime) {
            oldestTime = v.lastAccess;
            oldestKey = k;
          }
        }
        if (oldestKey) {
          this.store.delete(oldestKey);
          if (this.persist && this.db) {
            const tx = this.db.transaction('cache', 'readwrite');
            tx.objectStore('cache').delete(oldestKey);
          }
        }
      }
      const expires = Date.now() + this.ttl;
      this.store.set(key, { value, expires, lastAccess: Date.now() });
      if (this.persist && this.db) {
        const tx = this.db.transaction('cache', 'readwrite');
        tx.objectStore('cache').put({ key, value, expires });
      }
    }

    get(key) {
      const item = this.store.get(key);
      if (!item) return null;
      if (Date.now() > item.expires) {
        this.store.delete(key);
        if (this.persist && this.db) {
          const tx = this.db.transaction('cache', 'readwrite');
          tx.objectStore('cache').delete(key);
        }
        return null;
      }
      item.lastAccess = Date.now(); // LRU aktualisieren
      return item.value;
    }

    has(key) {
      return this.get(key) !== null;
    }

    delete(key) {
      this.store.delete(key);
      if (this.persist && this.db) {
        const tx = this.db.transaction('cache', 'readwrite');
        tx.objectStore('cache').delete(key);
      }
    }

    clear() {
      this.store.clear();
      if (this.persist && this.db) {
        const tx = this.db.transaction('cache', 'readwrite');
        tx.objectStore('cache').clear();
      }
    }
  }

  // -------------------------------------------------------------
  // 5. OPTIMIERTE THROTTLE/DEBOUNCE (mit Leading/Trailing)
  // -------------------------------------------------------------
  function throttle(func, limit, options = { leading: true, trailing: true }) {
    let inThrottle = false;
    let lastArgs = null;
    let lastContext = null;
    let timeout = null;

    return function(...args) {
      if (inThrottle) {
        if (options.trailing) {
          lastArgs = args;
          lastContext = this;
        }
        return;
      }

      if (options.leading) {
        func.apply(this, args);
      } else {
        lastArgs = args;
        lastContext = this;
      }

      inThrottle = true;

      timeout = setTimeout(() => {
        inThrottle = false;
        if (options.trailing && lastArgs) {
          func.apply(lastContext, lastArgs);
          lastArgs = null;
          lastContext = null;
        }
        clearTimeout(timeout);
        timeout = null;
      }, limit);
    };
  }

  function debounce(func, delay, options = { leading: false, trailing: true }) {
    let timeout = null;
    let lastArgs = null;
    let lastContext = null;

    return function(...args) {
      if (options.leading && !timeout) {
        func.apply(this, args);
      }

      lastArgs = args;
      lastContext = this;

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (options.trailing) {
          func.apply(lastContext, lastArgs);
        }
        timeout = null;
        lastArgs = null;
        lastContext = null;
      }, delay);
    };
  }

  // -------------------------------------------------------------
  // 6. ERWEITERTER LAZY-LOADER (mit IntersectionObserver-Optionen)
  // -------------------------------------------------------------
  class LazyLoader {
    constructor(selector = '.lazy', options = {}) {
      this.selector = selector;
      this.options = Object.assign({
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      }, options);
      this.observer = null;
      this.init();
    }

    init() {
      if (!isBrowser) return;
      if (!('IntersectionObserver' in window)) {
        // Fallback: alle sofort laden
        document.querySelectorAll(this.selector).forEach(el => {
          if (el.dataset.src) el.src = el.dataset.src;
          if (el.dataset.bg) el.style.backgroundImage = `url(${el.dataset.bg})`;
        });
        return;
      }

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            if (el.dataset.src) el.src = el.dataset.src;
            if (el.dataset.bg) el.style.backgroundImage = `url(${el.dataset.bg})`;
            this.observer.unobserve(el);
          }
        });
      }, this.options);

      document.querySelectorAll(this.selector).forEach(el => this.observer.observe(el));
    }
  }

  // -------------------------------------------------------------
  // 7. SMART SEARCH – Intent-basierte Suchlogik (maximale Erkennung)
  // -------------------------------------------------------------
  const SmartSearch = (function() {
    // Normalisierung
    function normalizeQuery(q) {
      if (typeof q !== 'string') return '';
      return q
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    }

    // Einleitungen (deutsch/englisch)
    const INTRO_PHRASES = [
      'ich will', 'ich brauche', 'suche', 'hilf mir', 'bitte', 'kannst du mir',
      'kennt jemand', 'welches tool', 'tool für', 'app für', 'software für',
      'i want', 'i need', 'find', 'help me', 'please', 'looking for', 'need a',
      'any tool', 'tool to', 'app to', 'software to', 'best tool for'
    ];

    // Flags mit vielen Synonymen
    const FLAG_KEYWORDS = {
      free: [
        'kostenlos', 'gratis', 'umsonst', 'free', 'frei', 'kostenfrei',
        'ohne kosten', 'no cost', 'zero cost', 'fremium', 'freemium',
        'kostenloser', 'kostenlose'
      ],
      beginner: [
        'anfänger', 'einsteiger', 'schüler', 'leicht', 'einfach', 'simple',
        'beginner', 'starter', 'easy', 'learn', 'student', 'newbie',
        'für anfänger', 'für einsteiger', 'for beginners', 'easy to use',
        'nicht kompliziert', 'keine vorkenntnisse', 'simple', 'simpel'
      ],
      top: [
        'beste', 'top', 'empfohlen', 'bewertung', 'rating', 'best',
        'beliebt', 'popular', 'höchste', 'meistgenutzt', 'most popular',
        'highest rated', 'recommended', 'top rated', 'bester', 'beliebteste'
      ],
      premium: [
        'premium', 'bezahlt', 'kostenpflichtig', 'paid', 'pro', 'professionell',
        'professional', 'business', 'zahlungspflichtig', 'kostenpflichtige'
      ],
      new: [
        'neu', 'neueste', 'latest', 'new', 'aktuell', 'upcoming', 'trending',
        'neues', 'neue'
      ]
    };

    // Kategorie-Keywords (sehr umfangreich)
    const CATEGORY_KEYWORDS = {
      image: [
        'bild', 'foto', 'fotografie', 'zeichnung', 'grafik', 'design', 'kunst', 'illustration',
        'cover', 'poster', 'malen', 'generieren', 'logo', 'icon', 'ai art', 'stable diffusion',
        'midjourney', 'dall·e', 'dall-e', 'dalle', 'bilderstellung', 'image generation',
        'photo editing', 'bearbeiten', 'retusche', 'collage', 'moodboard', 'visual',
        'paint', 'sketch', 'canvas', 'kreativ', 'bildbearbeitung', 'fotobearbeitung'
      ],
      text: [
        'text', 'schreiben', 'brief', 'email', 'chat', 'unterhaltung', 'fragen', 'antworten',
        'dokument', 'artikel', 'zusammenfassen', 'übersetzen', 'korrektur', 'bewerbung',
        'aufsatz', 'essay', 'proofread', 'rewrite', 'paraphrase', 'grammatik', 'rechtschreibung',
        'blog', 'content', 'copywriting', 'werbetext', 'marketing', 'kommunikation',
        'konversation', 'dialogue', 'assistent', 'texte schreiben', 'textverarbeitung'
      ],
      code: [
        'code', 'programmieren', 'entwickeln', 'software', 'app', 'website', 'javascript',
        'python', 'html', 'css', 'bug', 'debug', 'copilot', 'programming', 'coding',
        'fehler', 'debuggen', 'entwicklung', 'webseite', 'app entwicklung', 'softwareentwicklung',
        'algorithmus', 'funktion', 'script', 'programm', 'api', 'backend', 'frontend',
        'datenbank', 'sql', 'react', 'node', 'typescript', 'entwickler', 'programmierer'
      ],
      audio: [
        'audio', 'musik', 'sound', 'stimme', 'sprache', 'podcast', 'hörbuch', 'singen',
        'komponieren', 'voice', 'tts', 'text to speech', 'voiceover', 'audiobearbeitung',
        'musikproduktion', 'beat', 'song', 'melodie', 'instrument', 'klang', 'geräusch',
        'aufnahme', 'recording', 'mixing', 'mastering', 'sprachausgabe', 'ton'
      ],
      video: [
        'video', 'film', 'clip', 'animation', 'bearbeiten', 'schneiden', 'effekte',
        'reels', 'shorts', 'tiktok', 'youtube', 'videobearbeitung', 'video editing',
        'filmmaking', 'movie', 'trailer', 'teaser', 'motion graphics', 'vfx',
        'green screen', 'untertitel', 'subtitles', 'transkription', 'videoproduktion'
      ],
      data: [
        'daten', 'analyse', 'tabelle', 'csv', 'excel', 'diagramm', 'statistik', 'zahlen',
        'auswerten', 'forecast', 'prediction', 'bi', 'dashboard', 'data science',
        'machine learning', 'ml', 'ki', 'ai', 'datenvisualisierung', 'data visualization',
        'bericht', 'report', 'kpi', 'metriken', 'auswertung', 'datenanalyse'
      ]
    };

    function stripIntro(q) {
      let result = q;
      for (let phrase of INTRO_PHRASES) {
        const regex = new RegExp('^' + phrase + '\\s+', 'i');
        result = result.replace(regex, '');
      }
      return result;
    }

    function extractFlags(q) {
      const flags = { free: false, beginner: false, top: false, premium: false, new: false };
      const words = q.split(/\s+/);
      for (let word of words) {
        for (let [flag, list] of Object.entries(FLAG_KEYWORDS)) {
          if (list.includes(word)) {
            flags[flag] = true;
          }
        }
      }
      return flags;
    }

    function extractCategory(q) {
      const words = q.split(/\s+/);
      for (let [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (let kw of keywords) {
          if (words.includes(kw)) {
            return cat;
          }
        }
      }
      return null;
    }

    return {
      normalizeQuery,

      parseIntent(rawQuery, options = {}) {
        if (typeof rawQuery !== 'string') rawQuery = '';
        const q = normalizeQuery(rawQuery);
        const task = stripIntro(q);
        const flags = extractFlags(q);
        const category = extractCategory(q);
        return {
          raw: rawQuery,
          q,
          task,
          flags,
          category
        };
      },

      getEffectiveQuery(rawQuery, options = {}) {
        const intent = this.parseIntent(rawQuery, options);
        const task = intent.task.trim();
        if (task.length >= 2) return task;
        return rawQuery;
      },

      toolLooksBeginnerFriendly(tool, options = {}) {
        try {
          if (!tool) return false;
          const beginnerWords = [
            'anfänger', 'einfach', 'easy', 'beginner', 'schüler', 'student', 'learn',
            'starter', 'simple', 'für einsteiger', 'für anfänger', 'noob', 'newbie',
            'grundlagen', 'basics', 'tutorial', 'hilfe', 'erklärung', 'einfache',
            'leicht', 'simplified', 'step by step'
          ];
          const fields = [];

          if (tool.title) fields.push(tool.title);
          if (tool.description) fields.push(tool.description);
          if (tool.provider) fields.push(tool.provider);
          if (Array.isArray(tool.tags)) fields.push(...tool.tags);
          if (Array.isArray(tool.badges)) fields.push(...tool.badges);
          if (Array.isArray(tool.strengths)) fields.push(...tool.strengths);
          if (Array.isArray(tool.useCases)) fields.push(...tool.useCases);
          if (Array.isArray(tool.promptTips)) fields.push(...tool.promptTips);
          if (tool.en) {
            if (tool.en.title) fields.push(tool.en.title);
            if (tool.en.description) fields.push(tool.en.description);
            if (Array.isArray(tool.en.badges)) fields.push(...tool.en.badges);
            if (Array.isArray(tool.en.strengths)) fields.push(...tool.en.strengths);
            if (Array.isArray(tool.en.useCases)) fields.push(...tool.en.useCases);
            if (Array.isArray(tool.en.promptTips)) fields.push(...tool.en.promptTips);
          }

          const combined = fields.join(' ').toLowerCase();
          return beginnerWords.some(word => combined.includes(word));
        } catch (e) {
          return false;
        }
      },

      applyFilters(tools, filters = {}, options = {}) {
        if (!Array.isArray(tools)) return [];
        return tools.filter(tool => {
          try {
            if (filters.category && tool.category !== filters.category) return false;
            if (filters.freeOnly && !tool.is_free) return false;
            if (filters.beginner && !this.toolLooksBeginnerFriendly(tool)) return false;
            if (filters.premiumOnly && tool.is_free) return false;
            return true;
          } catch (e) {
            return false;
          }
        });
      },

      buildActionSuggestions(rawQuery, ctx) {
        const intent = this.parseIntent(rawQuery);
        const { flags, category } = intent;
        const suggestions = [];
        const getCategoryLabel = ctx?.getCategoryLabel || (cat => cat);

        if (flags.free) {
          suggestions.push({
            type: 'action',
            text: 'Nur kostenlose Tools',
            category: null,
            action: { kind: 'setFilters', filters: { freeOnly: true } }
          });
        }
        if (flags.premium) {
          suggestions.push({
            type: 'action',
            text: 'Nur Premium-Tools',
            category: null,
            action: { kind: 'setFilters', filters: { freeOnly: false, premiumOnly: true } }
          });
        }
        if (flags.beginner) {
          suggestions.push({
            type: 'action',
            text: 'Für Anfänger geeignet',
            category: null,
            action: { kind: 'setFilters', filters: { beginner: true } }
          });
        }
        if (category) {
          suggestions.push({
            type: 'action',
            text: `Kategorie: ${getCategoryLabel(category)}`,
            category: category,
            action: { kind: 'setFilters', filters: { category } }
          });
        }
        if (flags.top) {
          suggestions.push({
            type: 'action',
            text: 'Beste zuerst (Bewertung)',
            category: null,
            action: { kind: 'setSort', sortBy: 'rating', sortDirection: 'desc' }
          });
        }
        if (flags.new) {
          suggestions.push({
            type: 'action',
            text: 'Neueste zuerst',
            category: null,
            action: { kind: 'setSort', sortBy: 'date', sortDirection: 'desc' }
          });
        }

        // Kombinationen
        if (flags.free && category) {
          suggestions.push({
            type: 'action',
            text: `Kostenlose Tools in ${getCategoryLabel(category)}`,
            category: category,
            action: { kind: 'setFilters', filters: { freeOnly: true, category } }
          });
        }
        if (flags.beginner && category) {
          suggestions.push({
            type: 'action',
            text: `Anfängerfreundliche Tools in ${getCategoryLabel(category)}`,
            category: category,
            action: { kind: 'setFilters', filters: { beginner: true, category } }
          });
        }

        return suggestions;
      },

      buildSuggestions(params) {
        const {
          query,
          tools,
          searchIndex,
          maxSuggestions = 8,
          getCategoryLabel = cat => cat,
          dedupe = true
        } = params || {};

        if (!query || typeof query !== 'string') return [];

        const intent = this.parseIntent(query);
        const ctx = { getCategoryLabel };
        const actions = this.buildActionSuggestions(query, ctx);
        const effectiveQuery = this.getEffectiveQuery(query);

        let toolSuggestions = [];
        if (searchIndex && typeof searchIndex.search === 'function') {
          try {
            const ids = searchIndex.search(effectiveQuery);
            toolSuggestions = ids
              .map(id => {
                const tool = searchIndex.getTool(id);
                if (!tool) return null;
                let domain = '';
                try {
                  if (tool.link) {
                    const url = new URL(tool.link);
                    domain = url.hostname;
                  }
                } catch (e) {}
                return {
                  type: 'tool',
                  text: tool.title,
                  toolId: tool.id,
                  domain,
                  category: tool.category
                };
              })
              .filter(Boolean);
          } catch (e) {
            // Fallback
          }
        } else {
          // Einfache Suche über tools
          try {
            const qNorm = normalizeQuery(effectiveQuery);
            const tokens = qNorm.split(/\s+/);
            toolSuggestions = tools
              .map(tool => {
                const title = (tool.title || '').toLowerCase();
                const desc = (tool.description || '').toLowerCase();
                let score = 0;
                tokens.forEach(t => {
                  if (title.includes(t)) score += 2;
                  if (desc.includes(t)) score += 1;
                });
                return { tool, score };
              })
              .filter(item => item.score > 0)
              .sort((a, b) => b.score - a.score)
              .map(item => {
                const tool = item.tool;
                let domain = '';
                try {
                  if (tool.link) {
                    const url = new URL(tool.link);
                    domain = url.hostname;
                  }
                } catch (e) {}
                return {
                  type: 'tool',
                  text: tool.title,
                  toolId: tool.id,
                  domain,
                  category: tool.category
                };
              });
          } catch (e) {}
        }

        if (dedupe) {
          const seen = new Set();
          toolSuggestions = toolSuggestions.filter(s => {
            if (seen.has(s.text)) return false;
            seen.add(s.text);
            return true;
          });
        }

        toolSuggestions = toolSuggestions.slice(0, maxSuggestions - actions.length);
        const combined = [...actions, ...toolSuggestions];
        return combined.slice(0, maxSuggestions);
      }
    };
  })();

  // -------------------------------------------------------------
  // EXPORT – unveränderte öffentliche API
  // -------------------------------------------------------------
  global.Performance = {
    SearchIndex,
    AnimationScheduler,
    DOMBatcher,
    Cache,
    throttle,
    debounce,
    LazyLoader,
    SmartSearch
  };

})(window);