// =========================================
// PERFORMANCE.JS – Optimierungs-Engine für Quantum AI Hub
// Version: 2.0.0 (Erweiterte Performance-Boosts)
// Enthält: Suchindex, Animation-Scheduler, DOM-Batcher, Cache,
//          Idle-Tasks, IntersectionObserver-Pool, Memory-Manager,
//          Optimierte throttle/debounce, Performance-Monitoring
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
  // 2. ANIMATION-SCHEDULER – Optimiertes Zeichnen mit dynamischer FPS
  // -------------------------------------------------------------
  class AnimationScheduler {
    constructor(targetFPS = 30, options = {}) {
      this.targetFPS = targetFPS;
      this.interval = 1000 / targetFPS;
      this.tasks = new Set();
      this.running = false;
      this.lastFrame = 0;
      this.frameId = null;
      this.adaptive = options.adaptive || false; // bei true: reduziert FPS bei Inaktivität
      this.idleThreshold = options.idleThreshold || 3000; // ms nach letztem Task
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

      // Adaptives FPS: wenn lange keine Tasks, reduziere Framerate
      let currentInterval = this.interval;
      if (this.adaptive) {
        const timeSinceLastTask = now - this.lastTaskTime;
        if (timeSinceLastTask > this.idleThreshold) {
          // idle: reduziere auf 10 fps
          currentInterval = 100;
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
  // 3. DOM-BATCHER – Stapelt DOM-Updates + Trennung von Read/Write
  // -------------------------------------------------------------
  class DOMBatcher {
    constructor() {
      this.readQueue = new Set();
      this.writeQueue = new Set();
      this.scheduled = false;
    }

    // Lese-Operation (getBoundingClientRect, etc.)
    read(fn) {
      this.readQueue.add(fn);
      this.schedule();
    }

    // Schreib-Operation (style, class, innerHTML, etc.)
    write(fn) {
      this.writeQueue.add(fn);
      this.schedule();
    }

    // Alias für add (Abwärtskompatibilität)
    add(fn) {
      this.write(fn);
    }

    schedule() {
      if (this.scheduled) return;
      this.scheduled = true;
      requestAnimationFrame(() => this.flush());
    }

    flush() {
      // Zuerst alle Leseoperationen (können parallel laufen)
      this.readQueue.forEach(fn => {
        try { fn(); } catch (e) { console.error('DOM batch read error', e); }
      });
      this.readQueue.clear();

      // Dann alle Schreiboperationen (minimiert Layout-Thrashing)
      this.writeQueue.forEach(fn => {
        try { fn(); } catch (e) { console.error('DOM batch write error', e); }
      });
      this.writeQueue.clear();

      this.scheduled = false;
    }
  }

  // -------------------------------------------------------------
  // 4. CACHE – In-Memory-Cache mit automatischer Speicherbereinigung
  // -------------------------------------------------------------
  class Cache {
    constructor(ttl = 60000, maxSize = 100) {
      this.ttl = ttl;
      this.maxSize = maxSize;
      this.store = new Map();
      this.accessTimes = new Map(); // für LRU
    }

    set(key, value) {
      if (this.store.size >= this.maxSize) {
        // LRU: entferne am längsten nicht genutzten Eintrag
        let oldest = null;
        let oldestTime = Infinity;
        for (let [k, time] of this.accessTimes) {
          if (time < oldestTime) {
            oldestTime = time;
            oldest = k;
          }
        }
        if (oldest) {
          this.store.delete(oldest);
          this.accessTimes.delete(oldest);
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
  // 5. OPTIMIERTE throttle/debounce (mit leading/trailing)
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
  // 6. INTERSECTION-OBSERVER-POOL – Zentrales Management
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
  // 7. IDLE-TASK-SCHEDULER – Führt Aufgaben im Leerlauf aus
  // -------------------------------------------------------------
  class IdleTaskScheduler {
    constructor() {
      this.tasks = [];
      this.scheduled = false;
      this.useRequestIdle = 'requestIdleCallback' in window;
    }

    add(task, options = { timeout: 2000 }) {
      this.tasks.push({ task, options });
      this.schedule();
    }

    schedule() {
      if (this.scheduled) return;
      this.scheduled = true;

      const run = (deadline) => {
        while (this.tasks.length > 0) {
          const { task, options } = this.tasks[0];
          // Wenn keine Zeit mehr oder Timeout überschritten, unterbrechen
          if (deadline.timeRemaining() < 1 && options.timeout > 0) {
            break;
          }
          this.tasks.shift();
          try {
            task();
          } catch (e) {
            console.error('Idle task error', e);
          }
        }

        if (this.tasks.length > 0) {
          // Weitere Tasks später ausführen
          if (this.useRequestIdle) {
            requestIdleCallback(run, { timeout: 2000 });
          } else {
            setTimeout(() => {
              const fakeDeadline = { timeRemaining: () => 1 };
              run(fakeDeadline);
            }, 100);
          }
        } else {
          this.scheduled = false;
        }
      };

      if (this.useRequestIdle) {
        requestIdleCallback(run, { timeout: 2000 });
      } else {
        setTimeout(() => {
          const fakeDeadline = { timeRemaining: () => 1 };
          run(fakeDeadline);
        }, 100);
      }
    }
  }

  // -------------------------------------------------------------
  // 8. MEMORY-MANAGER – Überwacht und räumt Caches auf
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
      // grobe Schätzung: Anzahl Einträge * 1KB (angenommen)
      let total = 0;
      this.caches.forEach(cache => {
        if (cache.store && cache.store.size) {
          total += cache.store.size * 1024;
        }
      });
      return total;
    }

    checkAndClean() {
      const used = this.estimateMemoryUsage();
      if (used > this.threshold) {
        // zu viel Speicher: räume älteste Caches auf
        this.caches.forEach(cache => {
          if (cache.store && cache.store.size > 10) {
            // Lösche 20% der ältesten Einträge (vereinfacht)
            const keys = Array.from(cache.store.keys());
            const toDelete = Math.floor(keys.length * 0.2);
            for (let i = 0; i < toDelete; i++) {
              cache.delete(keys[i]);
            }
          }
        });
      }
    }

    startMonitoring() {
      this.interval = setInterval(() => this.checkAndClean(), 60000); // alle 60s
    }

    stopMonitoring() {
      if (this.interval) clearInterval(this.interval);
    }
  }

  // -------------------------------------------------------------
  // 9. LAZY-LOADER (erweitert mit Hintergrundbildern)
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
  // 10. PERFORMANCE-MONITORING (einfaches Profiling)
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
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
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
  // Singleton-Instanzen (für globalen Zugriff)
  // -------------------------------------------------------------
  const domBatcher = new DOMBatcher();
  const intersectionPool = new IntersectionPool();
  const idleScheduler = new IdleTaskScheduler();
  const memoryManager = new MemoryManager();
  const perfMonitor = new PerfMonitor(false); // standardmäßig aus

  // -------------------------------------------------------------
  // EXPORT (erweitert)
  // -------------------------------------------------------------
  global.Performance = {
    // Klassen
    SearchIndex,
    AnimationScheduler,
    DOMBatcher,
    Cache,
    IntersectionPool,
    IdleTaskScheduler,
    MemoryManager,
    LazyLoader,
    PerfMonitor,

    // Funktionen
    throttle,
    debounce,

    // Singletons (direkte Nutzung)
    domBatcher,
    intersectionPool,
    idleScheduler,
    memoryManager,
    perfMonitor,

    // Hilfsfunktion zum Aktivieren des Monitoring
    enablePerfMonitoring() {
      perfMonitor.enabled = true;
    },
    disablePerfMonitoring() {
      perfMonitor.enabled = false;
      perfMonitor.clear();
    }
  };

})(window);