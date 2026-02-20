// =========================================
// PERFORMANCE.JS – Optimierungs-Engine für Quantum AI Hub
// Version: 1.2.0 (Erweiterte SmartSearch – maximale Erkennung)
// Enthält: Suchindex, Animation-Scheduler, DOM-Batcher, Cache, Throttler, LazyLoader, SmartSearch
// =========================================

(function(global) {
  'use strict';

  // -------------------------------------------------------------
  // 1. SUCHINDEX – Schnelle Volltextsuche (invertierter Index)
  // -------------------------------------------------------------
  class SearchIndex {
    constructor() {
      this.index = new Map(); // token -> Set von toolIds
      this.tools = new Map(); // toolId -> tool
      this.tokenizer = (text) => text.toLowerCase().split(/\W+/).filter(t => t.length > 1);
    }

    // Tools hinzufügen (Array oder einzelnes Tool)
    addTools(tools) {
      if (Array.isArray(tools)) {
        tools.forEach(t => this.addTool(t));
      } else {
        this.addTool(tools);
      }
    }

    addTool(tool) {
      if (!tool || !tool.id) return;
      this.tools.set(tool.id, tool);

      // Alle durchsuchbaren Felder sammeln
      const fields = [];
      if (tool.title) fields.push(tool.title);
      if (tool.description) fields.push(tool.description);
      if (tool.tags) fields.push(...tool.tags);
      if (tool.provider) fields.push(tool.provider);
      if (tool.badges) fields.push(...tool.badges);
      if (tool.category) fields.push(tool.category);

      // Englische Felder (falls vorhanden)
      if (tool.en) {
        if (tool.en.title) fields.push(tool.en.title);
        if (tool.en.description) fields.push(tool.en.description);
        if (tool.en.badges) fields.push(...tool.en.badges);
      }

      // Tokenisieren und Index aufbauen
      fields.forEach(text => {
        if (!text) return;
        this.tokenizer(text).forEach(token => {
          if (!this.index.has(token)) this.index.set(token, new Set());
          this.index.get(token).add(tool.id);
        });
      });
    }

    // Suche: gibt Array von Tool-IDs zurück (Relevanz absteigend)
    search(query) {
      if (!query || query.length < 2) return [];
      const tokens = this.tokenizer(query);
      if (tokens.length === 0) return [];

      const tokenSets = tokens.map(t => this.index.get(t)).filter(Boolean);
      if (tokenSets.length === 0) return [];

      const union = new Set();
      tokenSets.forEach(set => set.forEach(id => union.add(id)));

      const scored = Array.from(union).map(id => {
        const tool = this.tools.get(id);
        if (!tool) return { id, score: 0 };
        const title = tool.title?.toLowerCase() || '';
        const titleTokens = this.tokenizer(title);
        let score = 0;
        tokens.forEach(t => {
          if (titleTokens.includes(t)) score += 2;
          else score += 1;
        });
        return { id, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.map(s => s.id);
    }

    getTool(id) {
      return this.tools.get(id);
    }

    clear() {
      this.index.clear();
      this.tools.clear();
    }
  }

  // -------------------------------------------------------------
  // 2. ANIMATION-SCHEDULER – Optimiertes Zeichnen mit requestAnimationFrame
  // -------------------------------------------------------------
  class AnimationScheduler {
    constructor(fps = 30) {
      this.fps = fps;
      this.interval = 1000 / fps;
      this.tasks = new Set();
      this.running = false;
      this.lastFrame = 0;
      this.frameId = null;
    }

    add(task) {
      this.tasks.add(task);
      this.start();
    }

    remove(task) {
      this.tasks.delete(task);
      if (this.tasks.size === 0) this.stop();
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastFrame = performance.now();
      this.loop();
    }

    stop() {
      if (this.frameId) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      this.running = false;
    }

    loop() {
      const now = performance.now();
      const elapsed = now - this.lastFrame;

      if (elapsed >= this.interval) {
        this.tasks.forEach(task => {
          try { task(); } catch (e) { console.error('Animation task error', e); }
        });
        this.lastFrame = now - (elapsed % this.interval);
      }

      this.frameId = requestAnimationFrame(() => this.loop());
    }
  }

  // -------------------------------------------------------------
  // 3. DOM-BATCHER – Stapelt DOM-Updates für reduzierte Reflows
  // -------------------------------------------------------------
  class DOMBatcher {
    constructor() {
      this.queue = new Set();
      this.scheduled = false;
    }

    add(updateFn) {
      this.queue.add(updateFn);
      if (!this.scheduled) {
        this.scheduled = true;
        requestAnimationFrame(() => this.flush());
      }
    }

    flush() {
      this.queue.forEach(fn => {
        try { fn(); } catch (e) { console.error('DOM batch error', e); }
      });
      this.queue.clear();
      this.scheduled = false;
    }
  }

  // -------------------------------------------------------------
  // 4. CACHE – Einfacher In-Memory-Cache mit Verfallszeit
  // -------------------------------------------------------------
  class Cache {
    constructor(ttl = 60000) {
      this.ttl = ttl;
      this.store = new Map();
    }

    set(key, value) {
      this.store.set(key, { value, expires: Date.now() + this.ttl });
    }

    get(key) {
      const item = this.store.get(key);
      if (!item) return null;
      if (Date.now() > item.expires) {
        this.store.delete(key);
        return null;
      }
      return item.value;
    }

    has(key) {
      return this.get(key) !== null;
    }

    delete(key) {
      this.store.delete(key);
    }

    clear() {
      this.store.clear();
    }
  }

  // -------------------------------------------------------------
  // 5. EVENT-THROTTLER – Begrenzt die Ausführung von Event-Handlern
  // -------------------------------------------------------------
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // -------------------------------------------------------------
  // 6. LAZY-LOADER – Lädt Bilder erst bei Sichtbarkeit
  // -------------------------------------------------------------
  class LazyLoader {
    constructor(selector = '.lazy') {
      this.selector = selector;
      this.observer = null;
      this.init();
    }

    init() {
      if (!('IntersectionObserver' in window)) {
        document.querySelectorAll(this.selector).forEach(img => {
          if (img.dataset.src) img.src = img.dataset.src;
        });
        return;
      }

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) img.src = img.dataset.src;
            this.observer.unobserve(img);
          }
        });
      });

      document.querySelectorAll(this.selector).forEach(img => this.observer.observe(img));
    }
  }

  // -------------------------------------------------------------
  // 7. SMART SEARCH – Intent-basierte Suchlogik (ohne DOM) – erweitert für maximale Erkennung
  // -------------------------------------------------------------
  const SmartSearch = (function() {
    // Hilfsfunktion: Normalisiert Query (entfernt Sonderzeichen, Mehrfachspaces, trimmt, lowercase)
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

    // Erweiterte Listen für Einleitungen (deutsch/englisch)
    const INTRO_PHRASES = [
      'ich will', 'ich brauche', 'suche', 'hilf mir', 'bitte', 'kannst du mir',
      'kennt jemand', 'welches tool', 'tool für', 'app für', 'software für',
      'i want', 'i need', 'find', 'help me', 'please', 'looking for', 'need a',
      'any tool', 'tool to', 'app to', 'software to', 'best tool for'
    ];

    // Erweiterte Flags
    const FLAG_KEYWORDS = {
      free: [
        'kostenlos', 'gratis', 'umsonst', 'free', 'frei', 'kostenfrei',
        'ohne kosten', 'no cost', 'zero cost', 'fremium', 'freemium'
      ],
      beginner: [
        'anfänger', 'einsteiger', 'schüler', 'leicht', 'einfach', 'simple',
        'beginner', 'starter', 'easy', 'learn', 'student', 'newbie',
        'für anfänger', 'für einsteiger', 'for beginners', 'easy to use',
        'nicht kompliziert', 'keine vorkenntnisse'
      ],
      top: [
        'beste', 'top', 'empfohlen', 'bewertung', 'rating', 'best',
        'beliebt', 'popular', 'höchste', 'meistgenutzt', 'most popular',
        'highest rated', 'recommended', 'top rated'
      ],
      premium: [
        'premium', 'bezahlt', 'kostenpflichtig', 'paid', 'pro', 'professionell',
        'professional', 'business'
      ],
      new: [
        'neu', 'neueste', 'latest', 'new', 'aktuell', 'upcoming', 'trending'
      ]
    };

    // Erweiterte Kategorie-Keywords (umfangreich)
    const CATEGORY_KEYWORDS = {
      image: [
        'bild', 'foto', 'fotografie', 'zeichnung', 'grafik', 'design', 'kunst', 'illustration',
        'cover', 'poster', 'malen', 'generieren', 'logo', 'icon', 'ai art', 'stable diffusion',
        'midjourney', 'dall·e', 'dall-e', 'dalle', 'bilderstellung', 'image generation',
        'photo editing', 'bearbeiten', 'retusche', 'collage', 'moodboard', 'visual',
        'paint', 'sketch', 'canvas', 'kreativ'
      ],
      text: [
        'text', 'schreiben', 'brief', 'email', 'chat', 'unterhaltung', 'fragen', 'antworten',
        'dokument', 'artikel', 'zusammenfassen', 'übersetzen', 'korrektur', 'bewerbung',
        'aufsatz', 'essay', 'proofread', 'rewrite', 'paraphrase', 'grammatik', 'rechtschreibung',
        'blog', 'content', 'copywriting', 'werbetext', 'marketing', 'kommunikation',
        'konversation', 'dialogue', 'assistent'
      ],
      code: [
        'code', 'programmieren', 'entwickeln', 'software', 'app', 'website', 'javascript',
        'python', 'html', 'css', 'bug', 'debug', 'copilot', 'programming', 'coding',
        'fehler', 'debuggen', 'entwicklung', 'webseite', 'app entwicklung', 'softwareentwicklung',
        'algorithmus', 'funktion', 'script', 'programm', 'api', 'backend', 'frontend',
        'datenbank', 'sql', 'react', 'node', 'typescript'
      ],
      audio: [
        'audio', 'musik', 'sound', 'stimme', 'sprache', 'podcast', 'hörbuch', 'singen',
        'komponieren', 'voice', 'tts', 'text to speech', 'voiceover', 'audiobearbeitung',
        'audiobearbeitung', 'musikproduktion', 'beat', 'song', 'melodie', 'instrument',
        'klang', 'geräusch', 'aufnahme', 'recording', 'mixing', 'mastering'
      ],
      video: [
        'video', 'film', 'clip', 'animation', 'bearbeiten', 'schneiden', 'effekte',
        'reels', 'shorts', 'tiktok', 'youtube', 'videobearbeitung', 'video editing',
        'filmmaking', 'movie', 'trailer', 'teaser', 'motion graphics', 'vfx',
        'green screen', 'untertitel', 'subtitles', 'transkription'
      ],
      data: [
        'daten', 'analyse', 'tabelle', 'csv', 'excel', 'diagramm', 'statistik', 'zahlen',
        'auswerten', 'forecast', 'prediction', 'bi', 'dashboard', 'data science',
        'machine learning', 'ml', 'ki', 'ai', 'datenvisualisierung', 'data visualization',
        'bericht', 'report', 'kpi', 'metriken', 'auswertung'
      ]
    };

    // Hilfsfunktion: Entfernt Einleitungen aus Query
    function stripIntro(q) {
      let result = q;
      for (let phrase of INTRO_PHRASES) {
        const regex = new RegExp('^' + phrase + '\\s+', 'i');
        result = result.replace(regex, '');
      }
      return result;
    }

    // Hilfsfunktion: Extrahiert Flags (alle erkannten Flags)
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

    // Hilfsfunktion: Extrahiert Kategorie (gibt die erste passende Kategorie zurück)
    function extractCategory(q) {
      const words = q.split(/\s+/);
      // Für jede Kategorie prüfen, ob eines der Keywords vorkommt (ganze Wörter)
      for (let [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (let kw of keywords) {
          if (words.includes(kw)) {
            return cat;
          }
        }
      }
      return null;
    }

    // Öffentliche Methoden
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
            'grundlagen', 'basics', 'tutorial', 'hilfe', 'erklärung'
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
            if (filters.premiumOnly && tool.is_free) return false; // Beispiel: nicht kostenlos
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

        // Einzelfilter
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

        // Kombinationen – z.B. wenn free und category zusammen erkannt wurden
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
            // Fallback bei Fehler
          }
        } else {
          // Fallback: einfache Suche über tools
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

        // Deduplizieren (nach text)
        if (dedupe) {
          const seen = new Set();
          toolSuggestions = toolSuggestions.filter(s => {
            if (seen.has(s.text)) return false;
            seen.add(s.text);
            return true;
          });
        }

        // Begrenzen
        toolSuggestions = toolSuggestions.slice(0, maxSuggestions - actions.length);
        const combined = [...actions, ...toolSuggestions];
        return combined.slice(0, maxSuggestions);
      }
    };
  })();

  // -------------------------------------------------------------
  // EXPORT
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