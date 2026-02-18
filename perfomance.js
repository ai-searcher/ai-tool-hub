// =========================================
// PERFORMANCE.JS – Optimierungs-Engine für Quantum AI Hub
// Version: 1.0.0
// Enthält: Suchindex, Animation-Scheduler, DOM-Batcher, Cache, Throttler
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
      if (tool.category) fields.push(getCategoryName(tool.category)); // Kategoriename übersetzt

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

      // Für jedes Token die zugehörigen Tool-IDs holen
      const tokenSets = tokens.map(t => this.index.get(t)).filter(Boolean);
      if (tokenSets.length === 0) return [];

      // Schnittmenge oder Vereinigungsmenge? Wir nehmen Vereinigungsmenge + Gewichtung
      const union = new Set();
      tokenSets.forEach(set => set.forEach(id => union.add(id)));

      // Relevanz berechnen: Je mehr Token im Titel, desto besser
      const scored = Array.from(union).map(id => {
        const tool = this.tools.get(id);
        if (!tool) return { id, score: 0 };
        const title = tool.title?.toLowerCase() || '';
        const titleTokens = this.tokenizer(title);
        let score = 0;
        tokens.forEach(t => {
          if (titleTokens.includes(t)) score += 2; // Titel-Token zählen doppelt
          else score += 1;
        });
        return { id, score };
      });

      // Sortieren nach Score absteigend
      scored.sort((a, b) => b.score - a.score);
      return scored.map(s => s.id);
    }

    // Tool anhand ID holen
    getTool(id) {
      return this.tools.get(id);
    }

    // Index leeren
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

    // Aufgabe hinzufügen (Funktion ohne Parameter)
    add(task) {
      this.tasks.add(task);
      this.start();
    }

    // Aufgabe entfernen
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
        // Alle registrierten Aufgaben ausführen
        this.tasks.forEach(task => {
          try { task(); } catch (e) { console.error('Animation task error', e); }
        });
        this.lastFrame = now - (elapsed % this.interval); // Gleitkompensation
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

    // Änderungsfunktion zum Stapel hinzufügen
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
    constructor(ttl = 60000) { // default 60 Sekunden
      this.ttl = ttl;
      this.store = new Map();
    }

    set(key, value) {
      this.store.set(key, {
        value,
        expires: Date.now() + this.ttl
      });
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
        // Fallback: alle sofort laden
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
  // EXPORT
  // -------------------------------------------------------------
  global.Performance = {
    SearchIndex,
    AnimationScheduler,
    DOMBatcher,
    Cache,
    throttle,
    debounce,
    LazyLoader
  };

})(window);
