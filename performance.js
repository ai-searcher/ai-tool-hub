// =========================================
// PERFORMANCE.JS – Optimierungs-Engine für Quantum AI Hub
// Version: 2.1.0 (Maximale Performance – TF‑IDF, LRU, Preconnect, LazyLoader, MemoryManager)
// Enthält: Verbesserter Suchindex, optimierte throttle/debounce, Resource Hints,
//          LRU-Cache mit automatischer Speicherbereinigung, LazyLoader mit IntersectionPool
// =========================================

(function(global) {
  'use strict';

  // -------------------------------------------------------------
  // HILFSFUNKTIONEN (lokal)
  // -------------------------------------------------------------
  const log = (msg, ...args) => console.log(`[Perf] ${msg}`, ...args);
  const warn = (msg, ...args) => console.warn(`[Perf] ${msg}`, ...args);

  // -------------------------------------------------------------
  // 1. VERBESSERTER SUCHINDEX (TF‑IDF + Prefix‑Trie für Autocomplete)
  // -------------------------------------------------------------
  class SearchIndex {
    constructor() {
      // Inverted Index: term -> Map<docId, tf>
      this.index = new Map();
      // Dokumentenspeicher: docId -> tool
      this.tools = new Map();
      // Dokumentenhäufigkeit pro Term (df)
      this.docFreq = new Map();
      // Gesamtzahl Dokumente (für idf)
      this.totalDocs = 0;
      // Tokenizer
      this.tokenizer = (text) => text.toLowerCase().split(/\W+/).filter(t => t.length > 1);
      // Prefix-Trie für schnelle Autocomplete-Vorschläge (optional)
      this.trie = new Map(); // Zeichen -> Unterbaum, Wert kann docId Set sein (für Tool-Namen)
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

      // Alle durchsuchbaren Felder sammeln (wie gehabt)
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

      // Termfrequenzen für dieses Dokument zählen
      const termFreq = new Map();
      fields.forEach(text => {
        if (!text) return;
        this.tokenizer(text).forEach(token => {
          termFreq.set(token, (termFreq.get(token) || 0) + 1);
        });
      });

      // In inverted index eintragen
      for (let [term, tf] of termFreq) {
        if (!this.index.has(term)) this.index.set(term, new Map());
        this.index.get(term).set(docId, tf);
        // Dokumentenhäufigkeit erhöhen (nur einmal pro Dokument)
        const df = this.docFreq.get(term) || 0;
        this.docFreq.set(term, df + 1);
      }

      // Prefix-Trie für Tool-Namen (nur Titel)
      if (tool.title) {
        const titleLower = tool.title.toLowerCase();
        for (let i = 1; i <= titleLower.length; i++) {
          const prefix = titleLower.substring(0, i);
          if (!this.trie.has(prefix)) this.trie.set(prefix, new Set());
          this.trie.get(prefix).add(docId);
        }
      }
    }

    // Berechnet IDF für einen Term
    _idf(term) {
      const df = this.docFreq.get(term) || 0;
      return df ? Math.log(this.totalDocs / df) : 0;
    }

    // Suche mit TF‑IDF
    search(query) {
      if (!query || query.length < 2) return [];
      const tokens = this.tokenizer(query);
      if (tokens.length === 0) return [];

      // Sammle alle relevanten Dokumente mit ihren TF‑IDF-Scores
      const scores = new Map(); // docId -> score

      tokens.forEach(token => {
        const postings = this.index.get(token);
        if (!postings) return;

        const idf = this._idf(token);
        for (let [docId, tf] of postings) {
          const score = (scores.get(docId) || 0) + tf * idf;
          scores.set(docId, score);
        }
      });

      // Falls keine Ergebnisse, leeres Array
      if (scores.size === 0) return [];

      // Zusätzlich: Prefix‑Matching für den gesamten Query (optional)
      // Erhöhe Score für Dokumente, deren Titel mit dem Query beginnen
      const prefixMatches = this.trie.get(query.toLowerCase());
      if (prefixMatches) {
        prefixMatches.forEach(docId => {
          scores.set(docId, (scores.get(docId) || 0) + 10); // Bonus
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
  // 2. ANIMATION-SCHEDULER (adaptiv, bereits vorhanden – bleibt unverändert)
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
      this.idleThreshold = options.idleThreshold || 3000;
      this.lastTaskTime = performance.now();
    }

    add(task) {
      this.tasks.add(task);
      this.lastTaskTime = performance.now();
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
      let currentInterval = this.interval;
      if (this.adaptive) {
        const timeSinceLastTask = now - this.lastTaskTime;
        if (timeSinceLastTask > this.idleThreshold) {
          currentInterval = 100; // idle: 10 fps
        }
      }
      if (elapsed >= currentInterval) {
        this.tasks.forEach(task => {
          try { task(); } catch (e) { console.error('Animation task error', e); }
        });
        this.lastFrame = now - (elapsed % currentInterval);
      }
      this.frameId = requestAnimationFrame(() => this.loop());
    }
  }

  // -------------------------------------------------------------
  // 3. DOM-BATCHER (bereits vorhanden)
  // -------------------------------------------------------------
  class DOMBatcher {
    constructor() {
      this.readQueue = new Set();
      this.writeQueue = new Set();
      this.scheduled = false;
    }

    read(fn) {
      this.readQueue.add(fn);
      this.schedule();
    }

    write(fn) {
      this.writeQueue.add(fn);
      this.schedule();
    }

    add(fn) { this.write(fn); }

    schedule() {
      if (this.scheduled) return;
      this.scheduled = true;
      requestAnimationFrame(() => this.flush());
    }

    flush() {
      this.readQueue.forEach(fn => { try { fn(); } catch (e) { console.error('DOM batch read error', e); } });
      this.readQueue.clear();
      this.writeQueue.forEach(fn => { try { fn(); } catch (e) { console.error('DOM batch write error', e); } });
      this.writeQueue.clear();
      this.scheduled = false;
    }
  }

  // -------------------------------------------------------------
  // 4. LRU-CACHE MIT SPEICHERMANAGER (automatische Bereinigung)
  // -------------------------------------------------------------
  class Cache {
    constructor(ttl = 60000, maxSize = 100) {
      this.ttl = ttl;
      this.maxSize = maxSize;
      this.store = new Map();      // key -> { value, expires }
      this.accessTimes = new Map(); // key -> lastAccess (für LRU)
      if (global.Performance && global.Performance.memoryManager) {
        global.Performance.memoryManager.register(this);
      }
    }

    set(key, value) {
      // LRU: Platz schaffen, falls nötig
      if (this.store.size >= this.maxSize) {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (let [k, time] of this.accessTimes) {
          if (time < oldestTime) {
            oldestTime = time;
            oldestKey = k;
          }
        }
        if (oldestKey) {
          this.store.delete(oldestKey);
          this.accessTimes.delete(oldestKey);
        }
      }
      this.store.set(key, { value, expires: Date.now() + this.ttl });
      this.accessTimes.set(key, Date.now());
    }

    get(key) {
      const item = this.store.get(key);
      if (!item) return null;
      if (Date.now() > item.expires) {
        this.store.delete(key);
        this.accessTimes.delete(key);
        return null;
      }
      this.accessTimes.set(key, Date.now()); // Zugriffszeit aktualisieren
      return item.value;
    }

    has(key) {
      return this.get(key) !== null;
    }

    delete(key) {
      this.store.delete(key);
      this.accessTimes.delete(key);
    }

    clear() {
      this.store.clear();
      this.accessTimes.clear();
    }
  }

  // -------------------------------------------------------------
  // 5. SPEICHERMANAGER (überwacht alle registrierten Caches)
  // -------------------------------------------------------------
  class MemoryManager {
    constructor() {
      this.caches = new Set();
      this.interval = null;
      this.threshold = 50 * 1024 * 1024; // 50 MB (grobe Schätzung)
      this.startMonitoring();
    }

    register(cache) {
      this.caches.add(cache);
    }

    unregister(cache) {
      this.caches.delete(cache);
    }

    estimateMemoryUsage() {
      let total = 0;
      this.caches.forEach(cache => {
        if (cache.store && cache.store.size) {
          total += cache.store.size * 1024; // grob 1KB pro Eintrag
        }
      });
      return total;
    }

    checkAndClean() {
      const used = this.estimateMemoryUsage();
      if (used > this.threshold) {
        // 20% der ältesten Einträge aus jedem Cache entfernen
        this.caches.forEach(cache => {
          if (cache.store && cache.store.size > 10) {
            const keys = Array.from(cache.accessTimes.keys())
              .sort((a, b) => cache.accessTimes.get(a) - cache.accessTimes.get(b));
            const toDelete = Math.floor(keys.length * 0.2);
            for (let i = 0; i < toDelete; i++) {
              cache.delete(keys[i]);
            }
          }
        });
      }
    }

    startMonitoring() {
      this.interval = setInterval(() => this.checkAndClean(), 60000);
    }

    stopMonitoring() {
      if (this.interval) clearInterval(this.interval);
    }
  }

  // -------------------------------------------------------------
  // 6. OPTIMIERTE THROTTLE/DEBOUNCE (mit requestAnimationFrame)
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
  // 7. INTERSECTION-POOL (zentrales Observer-Management)
  // -------------------------------------------------------------
  class IntersectionPool {
    constructor() {
      this.observers = new Map(); // options string -> IntersectionObserver
      this.callbacks = new WeakMap(); // element -> { observer, callback }
    }

    observe(element, callback, options = {}) {
      const key = JSON.stringify(options);
      if (!this.observers.has(key)) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const cb = this.callbacks.get(entry.target);
            if (cb) cb(entry);
          });
        }, options);
        this.observers.set(key, observer);
      }
      const observer = this.observers.get(key);
      observer.observe(element);
      this.callbacks.set(element, { observer, callback });
    }

    unobserve(element) {
      const data = this.callbacks.get(element);
      if (data) {
        data.observer.unobserve(element);
        this.callbacks.delete(element);
      }
    }

    disconnectAll() {
      this.observers.forEach(observer => observer.disconnect());
      this.observers.clear();
      this.callbacks = new WeakMap();
    }
  }

  // -------------------------------------------------------------
  // 8. LAZYLOADER (erweitert mit Hintergrundbildern)
  // -------------------------------------------------------------
  class LazyLoader {
    constructor(selector = '.lazy', options = {}) {
      this.selector = selector;
      this.options = options;
      this.pool = new IntersectionPool();
      this.init();
    }

    init() {
      if (!('IntersectionObserver' in window)) {
        // Fallback
        document.querySelectorAll(this.selector).forEach(el => {
          if (el.dataset.src) el.src = el.dataset.src;
          if (el.dataset.bg) el.style.backgroundImage = `url(${el.dataset.bg})`;
        });
        return;
      }

      document.querySelectorAll(this.selector).forEach(el => {
        this.pool.observe(el, (entry) => {
          if (entry.isIntersecting) {
            if (el.dataset.src) el.src = el.dataset.src;
            if (el.dataset.bg) el.style.backgroundImage = `url(${el.dataset.bg})`;
            this.pool.unobserve(el);
          }
        }, this.options);
      });
    }
  }

  // -------------------------------------------------------------
  // 9. RESOURCE HINTS (preconnect automatisch einfügen)
  // -------------------------------------------------------------
  function addResourceHints() {
    if (typeof document === 'undefined') return;

    const domains = [
      'https://doicozkpdbkyvdkpujoh.supabase.co',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com'
    ];

    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous'; // wichtig für Drittanbieter
      document.head.appendChild(link);
    });

    // Zusätzlich dns-prefetch als Fallback
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });

    log('Resource hints added');
  }

  // -------------------------------------------------------------
  // 10. PERFORMANCE-MONITORING (einfaches Profiling – optional)
  // -------------------------------------------------------------
  class PerfMonitor {
    constructor(enabled = false) {
      this.enabled = enabled;
      this.marks = new Map();
      this.measures = [];
    }

    mark(name) {
      if (!this.enabled) return;
      this.marks.set(name, performance.now());
    }

    measure(name, startMark, endMark) {
      if (!this.enabled) return;
      const start = this.marks.get(startMark);
      const end = this.marks.get(endMark) || performance.now();
      if (start) {
        const duration = end - start;
        this.measures.push({ name, duration });
        log(`Measure ${name}: ${duration.toFixed(2)}ms`);
      }
    }

    dump() {
      if (!this.enabled) return;
      console.group('📊 Performance Measures');
      this.measures.forEach(m => console.log(`${m.name}: ${m.duration.toFixed(2)}ms`));
      console.groupEnd();
    }

    clear() {
      this.marks.clear();
      this.measures = [];
    }
  }

  // -------------------------------------------------------------
  // GLOBALE SINGLETONS (direkt nutzbar)
  // -------------------------------------------------------------
  const domBatcher = new DOMBatcher();
  const intersectionPool = new IntersectionPool();
  const memoryManager = new MemoryManager();
  const perfMonitor = new PerfMonitor(false); // standardmäßig aus

  // Resource Hints beim Laden hinzufügen (sofort)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addResourceHints);
  } else {
    addResourceHints();
  }

  // -------------------------------------------------------------
  // EXPORT (unveränderte API + neue Features)
  // -------------------------------------------------------------
  global.Performance = {
    // Klassen
    SearchIndex,
    AnimationScheduler,
    DOMBatcher,
    Cache,
    IntersectionPool,
    MemoryManager,
    LazyLoader,
    PerfMonitor,

    // Funktionen
    throttle,
    debounce,

    // Singletons (können von anderen Skripten genutzt werden)
    domBatcher,
    intersectionPool,
    memoryManager,
    perfMonitor,

    // Hilfsfunktionen
    enablePerfMonitoring() { perfMonitor.enabled = true; },
    disablePerfMonitoring() { perfMonitor.enabled = false; perfMonitor.clear(); }
  };

  log('Performance engine v2.1 loaded');
})(window);