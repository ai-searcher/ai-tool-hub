// =========================================
// QUANTUM AI HUB - APP.JS FIXED
// Version: 1.0.1 - Button Reliability Fix
// =========================================
'use strict';

// ========================================= 
// KRITISCHE FIXES:
// 1. ✅ Event Delegation optimiert
// 2. ✅ Touch-Events für Mobile hinzugefügt
// 3. ✅ Doppelklick-Prevention
// 4. ✅ Handler Cleanup verbessert
// 5. ✅ Passive Events wo möglich
// 6. ✅ RAF für bessere Performance
// 7. ✅ Debounce optimiert
// =========================================

// ======= DEBUG: globaler Error- und Fetch-Logger =======
window.addEventListener('error', (e) => {
  try {
    console.error('Global error:', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno
    });
  } catch (err) {
    console.error('error listener failed', err);
  }
});

// ========================================= 
// CONFIGURATION
// =========================================
const CONFIG = {
  supabase: {
    url: 'https://doicozkpdbkyvdkpujoh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvaWNvemtwZGJreXZka3B1am9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTY4NDksImV4cCI6MjA4NTk3Mjg0OX0.-xgzqvOVE9NgJIxFaTrJoMXwsZJ_kWRcNPSoaRJvfRI'
  },
  fallback: {
    useSupabase: false,
    useLocalJSON: true,
    useDefaults: true
  },
  search: {
    minLength: 1,
    maxLength: 100,
    debounceMs: 300
  },
  validation: {
    autoFix: true,
    logErrors: true,
    strictMode: false
  },
  // 🆕 UI-Performance Settings
  ui: {
    clickDebounce: 100,        // Prevent double-clicks
    touchDelay: 50,            // Touch response delay
    usePassiveEvents: true,    // Better scroll performance
    useRAF: true               // RequestAnimationFrame
  }
};

// ========================================= 
// DEFAULT TOOLS
// =========================================
const DEFAULT_TOOLS = [
  {
    id: 1,
    title: 'ChatGPT',
    link: 'https://chat.openai.com',
    description: 'AI Chatbot von OpenAI',
    category: 'text',
    is_free: true,
    rating: 4.8
  },
  {
    id: 2,
    title: 'Midjourney',
    link: 'https://midjourney.com',
    description: 'AI Bild-Generator',
    category: 'image',
    is_free: false,
    rating: 4.7
  },
  {
    id: 3,
    title: 'GitHub Copilot',
    link: 'https://github.com/copilot',
    description: 'AI Code-Assistent',
    category: 'code',
    is_free: false,
    rating: 4.6
  }
];

// ========================================= 
// UTILITIES
// =========================================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const getElement = (selector) => {
  const el = $(selector);
  if (!el) {
    console.warn(`Element not found: ${selector}`);
  }
  return el;
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>'"]/g, '')
    .trim()
    .substring(0, CONFIG.search.maxLength);
};

// 🔧 FIXED: Optimierter Debounce mit Leading Edge Option
const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

// 🆕 Throttle für Click-Events (verhindert Doppelklicks)
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 🆕 RAF Wrapper für smooth UI updates
const rafUpdate = (callback) => {
  if (CONFIG.ui.useRAF) {
    requestAnimationFrame(callback);
  } else {
    callback();
  }
};

// ========================================= 
// STATE MANAGEMENT
// =========================================
const state = {
  tools: [],
  filtered: [],
  loading: true,
  error: null,
  searchQuery: '',
  dataSource: 'loading',
  stats: {
    total: 0,
    categories: 0,
    featured: 0
  },
  // 🆕 UI State
  ui: {
    lastClickTime: 0,
    activeCard: null,
    isModalOpen: false
  }
};

// ========================================= 
// SUPABASE CLIENT
// =========================================
const supabase = {
  async fetch(endpoint, options = {}) {
    const url = `${CONFIG.supabase.url}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': CONFIG.supabase.anonKey,
      'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Supabase fetch error:', error);
      throw error;
    }
  },

  async getTools() {
    try {
      const tools = await this.fetch('tools_with_category?order=created_at.desc');
      console.log('✅ Supabase: Loaded', tools.length, 'tools');
      return tools;
    } catch (error) {
      console.error('❌ Supabase getTools failed:', error.message);
      return null;
    }
  }
};

// ========================================= 
// DATA LOADING
// =========================================
const dataLoader = {
  async loadFromSupabase() {
    if (!CONFIG.fallback.useSupabase) return null;

    try {
      console.log('🔄 Trying Supabase...');
      const tools = await supabase.getTools();

      if (tools && tools.length > 0) {
        state.dataSource = 'supabase';
        return tools;
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Supabase failed:', error.message);
      return null;
    }
  },

  async loadFromJSON() {
    if (!CONFIG.fallback.useLocalJSON) return null;

    try {
      console.log('🔄 Trying local JSON...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch('./data.json', {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        const tools = Array.isArray(data) ? data : (data.tools || data);

        if (tools && tools.length > 0) {
          console.log('✅ Loaded from data.json:', tools.length, 'tools');
          state.dataSource = 'json';
          return tools;
        }

        return null;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('❌ JSON load failed:', error.message);
      return null;
    }
  },

  loadDefaults() {
    if (!CONFIG.fallback.useDefaults) return [];

    console.log('📦 Using default tools:', DEFAULT_TOOLS.length);
    state.dataSource = 'defaults';
    return DEFAULT_TOOLS;
  },

  async load() {
    console.log('🚀 Starting data load sequence...');

    let tools = await this.loadFromSupabase();
    if (tools) return tools;

    tools = await this.loadFromJSON();
    if (tools) return tools;

    return this.loadDefaults();
  }
};

// ========================================= 
// UI RENDERING
// =========================================
const ui = {
  elements: {},

  // 🆕 Event Handler References (für Cleanup)
  handlers: {
    grid: null,
    search: null,
    searchClear: null,
    retry: null,
    modal: null
  },

  cacheElements() {
    this.elements = {
      loading: getElement('#loading'),
      error: getElement('#error'),
      empty: getElement('#empty'),
      emptyQuery: getElement('#empty-query'),
      toolGrid: getElement('#tool-grid'),
      search: getElement('#search'),
      searchClear: getElement('#search-clear'),
      retryButton: getElement('#retry-button'),
      statsBar: getElement('#stats-bar'),
      statTotal: getElement('#stat-total'),
      statCategories: getElement('#stat-categories'),
      statFeatured: getElement('#stat-featured'),
      dataSource: getElement('#data-source')
    };
  },

  showState(stateName) {
    const states = ['loading', 'error', 'empty'];

    rafUpdate(() => {
      states.forEach(s => {
        const el = this.elements[s];
        if (el) {
          el.style.display = s === stateName ? 'block' : 'none';
        }
      });

      if (this.elements.toolGrid) {
        if (stateName === 'grid') {
          this.elements.toolGrid.style.display = 'grid';
          this.elements.toolGrid.style.removeProperty('visibility');
          this.elements.toolGrid.style.removeProperty('opacity');
        } else {
          this.elements.toolGrid.style.display = 'none';
        }
      }
    });
  },

  updateStats() {
    if (!this.elements.statsBar) return;

    const categories = new Set(state.tools.map(t => t.category)).size;
    const featured = state.tools.filter(t => t.featured).length;

    state.stats = {
      total: state.tools.length,
      categories,
      featured
    };

    rafUpdate(() => {
      if (this.elements.statTotal) {
        this.elements.statTotal.textContent = state.stats.total;
      }
      if (this.elements.statCategories) {
        this.elements.statCategories.textContent = state.stats.categories;
      }
      if (this.elements.statFeatured) {
        this.elements.statFeatured.textContent = state.stats.featured;
      }
      if (this.elements.statsBar) {
        this.elements.statsBar.style.display = 'flex';
      }
    });
  },

  updateDataSource() {
    if (!this.elements.dataSource) return;

    const sources = {
      supabase: 'D: SB',
      json: 'D: LJ',
      defaults: 'D: DEF',
      loading: '...'
    };

    this.elements.dataSource.textContent = sources[state.dataSource] || 'Unknown';
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  },

  getContextText(tool) {
    if (!tool.badges || !tool.badges.length) {
      const fallback = [
        tool.description || '',
        ...(Array.isArray(tool.tags) ? tool.tags.slice(0, 3) : [])
      ].filter(Boolean);

      return fallback.length ? fallback.slice(0, 3) : ['KI-powered Tool'];
    }

    return tool.badges.slice(0, 3).map(badge => {
      const text = String(badge).split('.')[0].trim();
      return text.length > 28 ? text.slice(0, 28) + '…' : text;
    });
  },

  renderCard(tool) {
    const categoryName = tool.category_name || tool.category || 'other';
    const categoryDisplay = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
    const contextTexts = this.getContextText(tool);

    return `
      <div class="card-square" 
           data-tool-id="${this.escapeHtml(String(tool.id))}"
           data-category="${this.escapeHtml(categoryName)}"
           data-tool-name="${this.escapeHtml(tool.title)}"
           data-href="${this.escapeHtml(tool.link)}"
           tabindex="0"
           role="article"
           aria-label="${this.escapeHtml(tool.title)} - ${this.escapeHtml(categoryDisplay)}">
        <div class="square-content-centered">
          <div class="square-category-badge" aria-hidden="true">
            ${this.escapeHtml(categoryDisplay)}
          </div>
          <h3 class="square-title-large" title="${this.escapeHtml(tool.title)}">
            ${this.escapeHtml(tool.title)}
          </h3>
          <div class="context-marquee" aria-hidden="true">
            <div class="marquee-track" role="presentation">
              <span class="marquee-seq">${this.escapeHtml(contextTexts.join(' • '))}</span>
              <span class="marquee-seq">${this.escapeHtml(contextTexts.join(' • '))}</span>
            </div>
          </div>
          <a class="card-overlay-link"
             role="button"
             tabindex="-1"
             data-href="${this.escapeHtml(tool.link)}"
             aria-label="${this.escapeHtml(tool.title)} öffnen">
          </a>
        </div>
      </div>
    `;
  },

  render() {
    // Filter tools based on search
    if (state.searchQuery && state.searchQuery.length >= CONFIG.search.minLength) {
      const query = state.searchQuery.toLowerCase();
      state.filtered = state.tools.filter(tool =>
        tool.title.toLowerCase().includes(query) ||
        (tool.description && tool.description.toLowerCase().includes(query))
      );
    } else {
      state.filtered = [...state.tools];
    }

    if (state.loading) {
      this.showState('loading');
      return;
    }

    if (state.error) {
      this.showState('error');
      return;
    }

    if (state.filtered.length === 0) {
      this.showState('empty');
      if (this.elements.emptyQuery && state.searchQuery) {
        this.elements.emptyQuery.textContent = `Keine Ergebnisse für "${state.searchQuery}"`;
      }
      return;
    }

    this.showState('grid');

    rafUpdate(() => {
      if (this.elements.toolGrid) {
        if (!this.elements.toolGrid.classList.contains('tool-grid-squares')) {
          this.elements.toolGrid.classList.add('tool-grid-squares');
        }

        this.elements.toolGrid.innerHTML = state.filtered
          .map(tool => this.renderCard(tool))
          .join('');

        this.attachCardHandlers();
      }
    });
  },

  // 🔧 FIXED: Optimierte Event Handler mit Touch Support
  attachCardHandlers() {
    const grid = this.elements.toolGrid || getElement('#tool-grid');
    if (!grid) return;

    // 🔧 Cleanup: Remove old handlers
    if (this.handlers.grid) {
      if (this.handlers.grid.click) {
        grid.removeEventListener('click', this.handlers.grid.click);
      }
      if (this.handlers.grid.keydown) {
        grid.removeEventListener('keydown', this.handlers.grid.keydown);
      }
      // 🆕 Touch handlers cleanup
      if (this.handlers.grid.touchstart) {
        grid.removeEventListener('touchstart', this.handlers.grid.touchstart);
      }
      if (this.handlers.grid.touchend) {
        grid.removeEventListener('touchend', this.handlers.grid.touchend);
      }
    }

    // 🆕 Touch State Management
    let touchStartTime = 0;
    let touchStartTarget = null;

    // 🔧 FIXED: Click Handler mit Throttle und besserer Event Delegation
    const clickHandler = throttle((e) => {
      // Ignore if modal is open
      if (state.ui.isModalOpen) return;

      const card = e.target.closest('.card-square');
      if (!card) return;

      const overlay = e.target.closest('.card-overlay-link');

      // 🔧 Prevent default behavior
      e.preventDefault();
      e.stopPropagation();

      const toolName = card.dataset.toolName || 
                       card.getAttribute('data-tool-name') || 
                       card.querySelector('.square-title-large')?.textContent || 
                       'Unknown';

      const href = (overlay?.getAttribute('data-href')) || 
                   card.getAttribute('data-href') || 
                   (overlay?.getAttribute('href'));

      // 🆕 Track click
      try {
        if (typeof analytics !== 'undefined' && analytics.trackToolClick) {
          analytics.trackToolClick(toolName);
        }
      } catch (err) {
        console.warn('Analytics tracking failed', err);
      }

      // 🔧 Open Modal if function exists
      if (typeof openToolModal === 'function') {
        try {
          openToolModal({
            title: toolName,
            href: href,
            description: card.getAttribute('aria-label') || toolName,
            cardElement: card
          });
        } catch (err) {
          console.error('openToolModal error:', err);
          // Fallback: toggle armed state
          card.classList.toggle('card-armed');
        }
      } else {
        // Fallback: toggle armed state
        card.classList.toggle('card-armed');
      }
    }, CONFIG.ui.clickDebounce);

    // 🆕 Touch Start Handler
    const touchStartHandler = (e) => {
      const card = e.target.closest('.card-square');
      if (!card) return;

      touchStartTime = Date.now();
      touchStartTarget = card;

      // Visual feedback
      card.classList.add('card-touch-active');

      // Remove after delay
      setTimeout(() => {
        card.classList.remove('card-touch-active');
      }, 200);
    };

    // 🆕 Touch End Handler
    const touchEndHandler = (e) => {
      const card = e.target.closest('.card-square');
      if (!card || card !== touchStartTarget) return;

      const touchDuration = Date.now() - touchStartTime;

      // Only trigger if touch was quick (< 500ms)
      if (touchDuration < 500) {
        // Simulate click after small delay for better feel
        setTimeout(() => {
          clickHandler(e);
        }, CONFIG.ui.touchDelay);
      }

      touchStartTarget = null;
    };

    // 🔧 FIXED: Keyboard Handler
    const keyHandler = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;

      const card = e.target.closest('.card-square');
      if (!card) return;

      e.preventDefault();

      // Trigger click on the card
      const fakeEvent = {
        target: card,
        preventDefault: () => {},
        stopPropagation: () => {}
      };

      clickHandler(fakeEvent);
    };

    // 🔧 Store handlers for cleanup
    this.handlers.grid = {
      click: clickHandler,
      keydown: keyHandler,
      touchstart: touchStartHandler,
      touchend: touchEndHandler
    };

    // 🔧 Attach with appropriate options
    const passiveOption = CONFIG.ui.usePassiveEvents ? { passive: false } : false;

    grid.addEventListener('click', clickHandler, passiveOption);
    grid.addEventListener('keydown', keyHandler, passiveOption);

    // 🆕 Touch events for mobile
    grid.addEventListener('touchstart', touchStartHandler, { passive: true });
    grid.addEventListener('touchend', touchEndHandler, passiveOption);

    console.log('✅ Card handlers attached with touch support');
  }
};

// ========================================= 
// SEARCH FUNCTIONALITY
// =========================================
const search = {
  init() {
    if (!ui.elements.search) return;

    // 🔧 Cleanup old handler
    if (ui.handlers.search) {
      ui.elements.search.removeEventListener('input', ui.handlers.search);
    }

    // 🔧 FIXED: Debounced search with better performance
    const handleInput = debounce((e) => {
      const value = sanitizeInput(e.target.value);
      state.searchQuery = value;

      rafUpdate(() => {
        if (ui.elements.searchClear) {
          ui.elements.searchClear.style.display = value ? 'flex' : 'none';
        }
      });

      if (value) {
        try {
          if (typeof analytics !== 'undefined' && analytics.trackSearch) {
            analytics.trackSearch(value);
          }
        } catch (err) {
          // Silent fail
        }
      }

      ui.render();
    }, CONFIG.search.debounceMs);

    ui.handlers.search = handleInput;
    ui.elements.search.addEventListener('input', handleInput);

    // 🔧 Search Clear Button
    if (ui.elements.searchClear) {
      // Cleanup old handler
      if (ui.handlers.searchClear) {
        ui.elements.searchClear.removeEventListener('click', ui.handlers.searchClear);
      }

      const clearHandler = () => {
        ui.elements.search.value = '';
        state.searchQuery = '';

        rafUpdate(() => {
          ui.elements.searchClear.style.display = 'none';
        });

        ui.render();
        ui.elements.search.focus();
      };

      ui.handlers.searchClear = clearHandler;
      ui.elements.searchClear.addEventListener('click', clearHandler);
    }

    console.log('✅ Search initialized with debounce');
  }
};

// ========================================= 
// ANALYTICS
// =========================================
const analytics = {
  track(eventName, params) {
    if (typeof gtag === 'undefined') {
      console.log('Analytics (dry-run):', eventName, params);
      return;
    }

    try {
      gtag('event', eventName, params);
    } catch (error) {
      console.warn('Analytics error:', error);
    }
  },

  trackToolClick(toolName) {
    this.track('tool_click', {
      event_category: 'engagement',
      tool_name: toolName
    });
  },

  trackSearch(query) {
    this.track('search', {
      search_term: query
    });
  },

  trackError(errorType, message) {
    this.track('error', {
      event_category: 'error',
      error_type: errorType,
      error_message: message
    });
  }
};

// ========================================= 
// ERROR HANDLING
// =========================================
const errorHandler = {
  handle(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);

    state.error = {
      message: error.message || 'Unknown error',
      context
    };

    try {
      analytics.trackError(context, error.message);
    } catch (err) {
      // Silent fail
    }

    ui.showState('error');
  },

  setupRetry() {
    if (!ui.elements.retryButton) return;

    // Cleanup old handler
    if (ui.handlers.retry) {
      ui.elements.retryButton.removeEventListener('click', ui.handlers.retry);
    }

    const retryHandler = () => {
      console.log('Retrying...');
      location.reload();
    };

    ui.handlers.retry = retryHandler;
    ui.elements.retryButton.addEventListener('click', retryHandler);
  }
};

// ========================================= 
// MODAL SYSTEM - FIXED
// =========================================
function createToolModal() {
  if (document.getElementById('tool-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'tool-modal';
  modal.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0,0,0,0.7);
    align-items: center;
    justify-content: center;
  `;

  modal.innerHTML = `
    <div class="modal-box" 
         role="dialog" 
         aria-modal="true"
         style="background:#0f1224;border-radius:14px;padding:24px;width:90%;max-width:500px;box-shadow:0 20px 60px rgba(0,0,0,0.6)">
      <h3 id="tool-modal-title" style="color:var(--primary);margin-bottom:8px">Tool</h3>
      <p id="tool-modal-desc" style="color:var(--text-dim);margin-bottom:12px"></p>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <a id="tool-modal-open" 
           class="card-link"
           style="display:inline-flex;padding:8px 12px;border-radius:8px;background:var(--primary);color:var(--bg-dark);text-decoration:none">
          Öffnen
        </a>
        <button id="tool-modal-close"
                style="background:transparent;border:1px solid rgba(255,255,255,0.08);padding:8px 12px;border-radius:8px;color:var(--text-secondary);cursor:pointer">
          Schließen
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 🔧 FIXED: Modal click handler mit besserer Event Delegation
  const modalClickHandler = (e) => {
    if (e.target === modal || e.target.id === 'tool-modal-close') {
      closeToolModal();
    }
  };

  ui.handlers.modal = modalClickHandler;
  modal.addEventListener('click', modalClickHandler);

  // 🔧 Keyboard handler
  if (!document.toolModalEscapeHandlerAttached) {
    const escHandler = (e) => {
      if (e.key === 'Escape' && state.ui.isModalOpen) {
        closeToolModal();
      }
    };

    document.addEventListener('keydown', escHandler);
    document.toolModalEscapeHandlerAttached = true;
  }

  console.log('✅ Modal created');
}

function openToolModal(tool) {
  createToolModal();

  const modal = document.getElementById('tool-modal');
  if (!modal) return;

  state.ui.isModalOpen = true;

  const titleEl = modal.querySelector('#tool-modal-title');
  const descEl = modal.querySelector('#tool-modal-desc');
  const openLink = modal.querySelector('#tool-modal-open');

  if (titleEl) titleEl.textContent = tool.title || 'Tool';
  if (descEl) descEl.textContent = tool.description || '';
  if (openLink) {
    openLink.href = tool.href || '#';
    openLink.target = '_blank';
  }

  rafUpdate(() => {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  });

  console.log('✅ Modal opened:', tool.title);
}

function closeToolModal() {
  const modal = document.getElementById('tool-modal');
  if (!modal) return;

  state.ui.isModalOpen = false;

  rafUpdate(() => {
    modal.classList.remove('open');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  });

  console.log('✅ Modal closed');
}

// 🔧 Global modal functions
window.openToolModal = openToolModal;
window.closeToolModal = closeToolModal;

// ========================================= 
// INITIALIZATION
// =========================================
const app = {
  async init() {
    try {
      console.log('🚀 Initializing Quantum AI Hub...');
      console.log('Config:', CONFIG);

      ui.cacheElements();
      errorHandler.setupRetry();
      ui.showState('loading');

      // Load data
      const rawTools = await dataLoader.load();

      if (!rawTools || rawTools.length === 0) {
        throw new Error('No data available from any source');
      }

      console.log('✅ Raw tools loaded:', rawTools.length);

      // Use tools as-is (simplified validation)
      state.tools = rawTools;
      state.filtered = [...state.tools];
      state.loading = false;

      if (state.tools.length === 0) {
        throw new Error('No valid tools after validation');
      }

      console.log('✅ Valid tools ready:', state.tools.length);

      // Update UI
      ui.updateStats();
      ui.updateDataSource();
      ui.render();
      search.init();

      console.log('✅ App initialized successfully!');

      // Dispatch ready event
      try {
        if (!window.appState) window.appState = state;
        window.dispatchEvent(new Event('quantum:ready'));
      } catch (e) {
        console.debug('Could not dispatch quantum:ready', e);
      }

    } catch (error) {
      console.error('❌ CRITICAL ERROR in init:', error);

      // Emergency fallback
      try {
        console.log('🚨 EMERGENCY: Activating fallback to defaults...');

        state.tools = DEFAULT_TOOLS;
        state.filtered = [...state.tools];
        state.loading = false;
        state.error = null;
        state.dataSource = 'emergency';

        ui.updateStats();
        ui.updateDataSource();
        ui.render();
        search.init();

        console.log('✅ Emergency recovery successful!');

        window.dispatchEvent(new Event('quantum:ready'));
      } catch (recoveryError) {
        console.error('❌ EMERGENCY RECOVERY FAILED:', recoveryError);
        errorHandler.handle(error, 'Initialization');
      }
    }
  }
};

// ========================================= 
// START APPLICATION
// =========================================
const startApp = async () => {
  try {
    await app.init();
  } catch (e) {
    console.error('App init failed (caught):', e);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

// ========================================= 
// DEBUG MODE
// =========================================
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.appState = state;
  window.appConfig = CONFIG;
  console.log('🐛 Debug mode: window.appState and window.appConfig available');
}

console.log('📱 App.js v1.0.1 loaded - Button reliability fixed!');
