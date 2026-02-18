// =========================================
// QUANTUM AI HUB - APP.JS
// Version: 1.0.0
// Production Ready - All Systems Checked
// =========================================

'use strict';

// ======= DEBUG: globaler Error- und Fetch-Logger (temporär) =======
window.addEventListener('error', (e) => {
  try {
    console.error('Global error event:', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error
    });
  } catch (err) { console.error('error listener failed', err); }
});

// Wrap fetch to log failing requests
(function() {
  if (!window.fetch) return;
  const _origFetch = window.fetch;
  window.fetch = async function(resource, init) {
    try {
      const res = await _origFetch(resource, init);
      if (!res.ok) {
        console.warn('Fetch non-ok:', { url: String(resource), status: res.status, statusText: res.statusText });
      }
      return res;
    } catch (err) {
      try {
        console.error('Fetch failed:', { url: String(resource), error: err });
      } catch (e) {}
      throw err;
    }
  };
})();

// GLOBAL DEBUG: make unhandled promise rejections visible
window.addEventListener('unhandledrejection', (ev) => {
  try {
    console.group('%cUnhandled Promise Rejection (global)', 'color:#fff;background:#d9534f;padding:3px;border-radius:4px;');
    console.error('reason:', ev.reason);
    if (ev.reason && ev.reason.stack) console.error(ev.reason.stack);
    console.trace();
    console.groupEnd();
  } catch (e) {
    console.error('unhandledrejection logging failed', e);
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
  }
};

// =========================================
// DEFAULT TOOLS (Always Available)
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
// STACK VIEW CONTROLLER (KATEGORIE-STACKS)
// =========================================
class StackViewController {
  constructor(container, state, ui) {
    this.container = container;
    this.state = state;
    this.ui = ui;
    this.stacks = [];
    this.activeSort = 'name';
    this.sortDirection = 'asc';
  }

  render() {
    if (!this.state.tools || this.state.tools.length === 0) return;

    const grouped = this.groupByCategory(this.state.tools);
    
    this.container.innerHTML = '';
    this.container.classList.add('tool-stacks');
    
    for (const [category, tools] of Object.entries(grouped)) {
      const stackElement = this.createStack(category, tools);
      this.container.appendChild(stackElement);
    }

    this.attachStackListeners();
  }

  groupByCategory(tools) {
    const groups = {};
    tools.forEach(tool => {
      const cat = tool.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tool);
    });
    return groups;
  }

  createStack(category, tools) {
    const stackDiv = document.createElement('div');
    stackDiv.className = 'category-stack';
    stackDiv.dataset.category = category;

    const header = this.createCategoryHeader(category, tools);
    stackDiv.appendChild(header);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'stack-cards';
    
    const sortedTools = this.sortTools(tools);
    
    sortedTools.forEach(tool => {
      const card = this.createStackCard(tool);
      cardsContainer.appendChild(card);
    });

    stackDiv.appendChild(cardsContainer);
    return stackDiv;
  }

  createCategoryHeader(category, tools) {
    const header = document.createElement('div');
    header.className = 'category-header-card';

    const title = document.createElement('h3');
    title.className = 'category-header-title';
    title.textContent = category.charAt(0).toUpperCase() + category.slice(1);

    const desc = document.createElement('p');
    desc.className = 'category-header-description';
    desc.textContent = `${tools.length} Tool${tools.length !== 1 ? 's' : ''} in dieser Kategorie`;

    header.appendChild(title);
    header.appendChild(desc);
    return header;
  }

  createStackCard(tool) {
    const card = document.createElement('div');
    card.className = 'stack-card';
    card.dataset.toolId = tool.id;
    card.dataset.category = tool.category || 'other';
    card.dataset.toolName = tool.title;
    card.dataset.href = tool.link;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', tool.title);

    const title = document.createElement('div');
    title.className = 'stack-card-title';
    title.textContent = tool.title;
    card.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'stack-card-category';
    badge.textContent = (tool.category || 'other').charAt(0).toUpperCase();
    card.appendChild(badge);

    return card;
  }

  sortTools(tools) {
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    switch (this.activeSort) {
      case 'name':
        return [...tools].sort((a, b) => dir * a.title.localeCompare(b.title));
      case 'rating':
        return [...tools].sort((a, b) => dir * ((a.rating || 0) - (b.rating || 0)));
      case 'date':
        return [...tools].sort((a, b) => dir * (new Date(b.added) - new Date(a.added)));
      default:
        return tools;
    }
  }


attachStackListeners() {
  const stacks = this.container.querySelectorAll('.category-stack');
  stacks.forEach(stack => {
    // Klick auf den Header toggelt den Stapel
    const header = stack.querySelector('.category-header-card');
    if (header) {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardsContainer = stack.querySelector('.stack-cards');
        if (cardsContainer) {
          cardsContainer.classList.toggle('fanned');
        }
      });
    }

    // Klick auf den Karten-Container (nicht auf einzelne Karten) toggelt ebenfalls
    const cardsContainer = stack.querySelector('.stack-cards');
    if (cardsContainer) {
      cardsContainer.addEventListener('click', (e) => {
        // Nur toggeln, wenn nicht direkt auf eine Karte geklickt wurde
        if (e.target.closest('.stack-card')) return;
        cardsContainer.classList.toggle('fanned');
      });
    }
  });

  // Klick auf einzelne Karten – gleiches Verhalten wie im Grid
  const stackCards = this.container.querySelectorAll('.stack-card');
  stackCards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const toolId = card.dataset.toolId;
      const tool = this.state.tools.find(t => String(t.id) === String(toolId));
      if (!tool) return;

      if (window.innerWidth < 768) {
        window.location.href = 'detail.html?id=' + encodeURIComponent(toolId);
      } else {
        if (typeof openToolModal === 'function') {
          openToolModal(tool);
        } else {
          window.open(tool.link, '_blank', 'noopener,noreferrer');
        }
      }
    });
  });
}

destroy() {
  this.container.innerHTML = '';
  this.container.classList.remove('tool-stacks');
}
}

// =========================================
// VALIDATION RULES
// =========================================

// =========================================
// VALIDATION RULES
// =========================================
const VALIDATION_RULES = {
  required: ['id', 'title', 'link'],
  optional: ['description', 'category', 'tags', 'is_free', 'rating', 'provider', 'added', 'featured'],
  
  types: {
    id: 'number',
    title: 'string',
    link: 'string',
    description: 'string',
    category: 'string',
    tags: 'array',
    is_free: 'boolean',
    rating: 'number',
    provider: 'string',
    added: 'string',
    featured: 'boolean'
  },
  
  ranges: {
    rating: { min: 0, max: 5 },
    title: { minLength: 2, maxLength: 50 }
  },
  
  patterns: {
    link: /^https?:\/\/.+/i,
    category: /^(text|image|code|audio|video|data|other)$/i
  }
};

// =========================================
// UTILITIES
// =========================================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// Safe Element Getter
const getElement = (selector) => {
  const el = $(selector);
  if (!el) {
    console.warn(`Element not found: ${selector}`);
  }
  return el;
};

// Sanitize Input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>'"]/g, '')
    .trim()
    .substring(0, CONFIG.search.maxLength);
};

// Debounce Function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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
  sortBy: 'name',      // NEU: Sortierkriterium
  sortDirection: 'asc' // NEU: Sortierrichtung
};

// =========================================
// HILFSFUNKTION SORTIERUNG (NEU)
// =========================================
function sortTools(tools) {
  const { sortBy, sortDirection } = state;
  const dir = sortDirection === 'asc' ? 1 : -1;

  return [...tools].sort((a, b) => {
    if (sortBy === 'name') {
      return dir * a.title.localeCompare(b.title);
    } else if (sortBy === 'rating') {
      const aRating = a.rating || 0;
      const bRating = b.rating || 0;
      return dir * (aRating - bRating);
    } else if (sortBy === 'date') {
      const aDate = new Date(a.added || 0);
      const bDate = new Date(b.added || 0);
      return dir * (aDate - bDate);
    }
    return 0;
  });
}

// =========================================
// SUPABASE CLIENT (No Library)
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
// DATA VALIDATION
// =========================================
const validator = {
  validateTool(tool, index) {
    const errors = [];
    const warnings = [];
    
    VALIDATION_RULES.required.forEach(field => {
      if (tool[field] === undefined || tool[field] === null || tool[field] === '') {
        errors.push({
          type: 'MISSING_FIELD',
          field,
          message: `Tool #${index + 1}: Required field "${field}" is missing`,
          tool: tool.title || 'Unknown'
        });
      }
    });
    
    Object.keys(tool).forEach(field => {
      const expectedType = VALIDATION_RULES.types[field];
      if (!expectedType) return;
      
      const actualType = Array.isArray(tool[field]) ? 'array' : typeof tool[field];
      
      if (actualType !== expectedType && tool[field] !== null) {
        errors.push({
          type: 'WRONG_TYPE',
          field,
          message: `Tool "${tool.title}": Field "${field}" should be ${expectedType}, got ${actualType}`,
          expected: expectedType,
          actual: actualType
        });
      }
    });
    
    if (tool.rating !== undefined && tool.rating !== null) {
      const { min, max } = VALIDATION_RULES.ranges.rating;
      if (tool.rating < min || tool.rating > max) {
        warnings.push({
          type: 'OUT_OF_RANGE',
          field: 'rating',
          message: `Tool "${tool.title}": Rating ${tool.rating} is outside range ${min}-${max}`
        });
      }
    }
    
    if (tool.title) {
      const { minLength, maxLength } = VALIDATION_RULES.ranges.title;
      if (tool.title.length < minLength || tool.title.length > maxLength) {
        warnings.push({
          type: 'INVALID_LENGTH',
          field: 'title',
          message: `Tool "${tool.title}": Title length ${tool.title.length} outside ${minLength}-${maxLength}`
        });
      }
    }
    
    if (tool.link && !VALIDATION_RULES.patterns.link.test(tool.link)) {
      errors.push({
        type: 'INVALID_PATTERN',
        field: 'link',
        message: `Tool "${tool.title}": Invalid URL "${tool.link}"`,
        hint: 'URL must start with http:// or https://'
      });
    }
    
    if (tool.category && !VALIDATION_RULES.patterns.category.test(tool.category)) {
      warnings.push({
        type: 'INVALID_CATEGORY',
        field: 'category',
        message: `Tool "${tool.title}": Unknown category "${tool.category}"`,
        hint: 'Valid: text, image, code, audio, video, data, other'
      });
    }
    
    return { errors, warnings };
  },
  
  autoFix(tool) {
    const fixed = { ...tool };
    
    if (!fixed.id || typeof fixed.id !== 'number') {
      fixed.id = Date.now() + Math.floor(Math.random() * 1000);
      console.log(`🔧 Auto-fix: Generated ID for "${fixed.title}"`);
    }
    
    if (fixed.link && !fixed.link.match(/^https?:\/\//i)) {
      fixed.link = 'https://' + fixed.link;
      console.log(`🔧 Auto-fix: Added https:// to "${fixed.title}"`);
    }
    
    if (!fixed.description || fixed.description === '') {
      fixed.description = `${fixed.title} - AI Tool`;
      console.log(`🔧 Auto-fix: Generated description for "${fixed.title}"`);
    }
    
    if (!fixed.category) {
      fixed.category = this.detectCategory(fixed);
      console.log(`🔧 Auto-fix: Detected category "${fixed.category}" for "${fixed.title}"`);
    }
    
    if (fixed.rating !== undefined && fixed.rating !== null) {
      if (fixed.rating < 0) fixed.rating = 0;
      if (fixed.rating > 5) fixed.rating = 5;
    }
    
    return fixed;
  },
  
  detectCategory(tool) {
    const text = `${tool.title} ${tool.description || ''}`.toLowerCase();
    
    const patterns = {
      text: ['chat', 'text', 'write', 'language', 'gpt', 'claude', 'conversation'],
      image: ['image', 'photo', 'art', 'visual', 'picture', 'midjourney', 'dall'],
      code: ['code', 'dev', 'github', 'programming', 'copilot', 'cursor'],
      audio: ['audio', 'music', 'voice', 'sound', 'speech', 'eleven'],
      video: ['video', 'film', 'animation', 'runway']
    };
    
    for (const [category, keywords] of Object.entries(patterns)) {
      if (keywords.some(kw => text.includes(kw))) {
        return category;
      }
    }
    
    return 'other';
  },
  
  validateAll(tools) {
    const allErrors = [];
    const allWarnings = [];
    const validTools = [];
    const invalidTools = [];
    
    const seenIds = new Set();
    const seenTitles = new Set();
    
    tools.forEach((tool, index) => {
      const processedTool = CONFIG.validation.autoFix ? this.autoFix(tool) : tool;
      
      const { errors, warnings } = this.validateTool(processedTool, index);
      
      if (processedTool.id && seenIds.has(processedTool.id)) {
        errors.push({
          type: 'DUPLICATE_ID',
          field: 'id',
          message: `Tool "${processedTool.title}": Duplicate ID ${processedTool.id}`
        });
      }
      seenIds.add(processedTool.id);
      
      const titleLower = processedTool.title?.toLowerCase();
      if (titleLower && seenTitles.has(titleLower)) {
        warnings.push({
          type: 'DUPLICATE_TITLE',
          field: 'title',
          message: `Tool "${processedTool.title}": Duplicate title detected`
        });
      }
      seenTitles.add(titleLower);
      
      allErrors.push(...errors);
      allWarnings.push(...warnings);
      
      if (errors.length === 0) {
        validTools.push(processedTool);
      } else {
        invalidTools.push({ tool: processedTool, errors });
      }
    });
    
    return {
      valid: allErrors.length === 0,
      validTools,
      invalidTools,
      errors: allErrors,
      warnings: allWarnings,
      stats: {
        total: tools.length,
        valid: validTools.length,
        invalid: invalidTools.length,
        errorCount: allErrors.length,
        warningCount: allWarnings.length
      }
    };
  },
  
  displayReport(validation) {
    if (!CONFIG.validation.logErrors) return;
    
    console.group('📊 VALIDATION REPORT');
    console.log(`✅ Valid: ${validation.stats.valid}`);
    console.log(`❌ Invalid: ${validation.stats.invalid}`);
    console.log(`⚠️ Warnings: ${validation.stats.warningCount}`);
    console.log(`📦 Total: ${validation.stats.total}`);
    
    if (validation.errors.length > 0) {
      console.group('❌ ERRORS:');
      validation.errors.forEach((error, i) => {
        console.error(`${i + 1}. ${error.message}`);
      });
      console.groupEnd();
    }
    
    if (validation.warnings.length > 0) {
      console.group('⚠️ WARNINGS:');
      validation.warnings.forEach((warning, i) => {
        console.warn(`${i + 1}. ${warning.message}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
};

// =========================================
// DATA LOADING (Triple Fallback)
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
      console.log('📍 Current URL:', window.location.href);
      console.log('📍 Fetch URL:', new URL('./data.json', window.location.href).href);

      let data = null;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch('./data.json', {
          signal: controller.signal
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response OK:', response.ok);
        console.log('📥 Response headers:', [...response.headers.entries()]);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        data = await response.json();
      } finally {
        clearTimeout(timeoutId);
      }

      console.log('📦 JSON parsed successfully');

      if (!data) {
        console.warn('⚠️ JSON parsed but empty');
        return null;
      }

      const tools = Array.isArray(data) ? data : (data.tools || data);

      if (tools && tools.length > 0) {
        console.log('✅ Loaded from data.json:', tools.length, 'tools');
        state.dataSource = 'json';
        return tools;
      }

      console.warn('⚠️ JSON loaded but no tools found');
      return null;
      
    } catch (error) {
      console.error('❌ JSON load failed:');
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error:', error);
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
  stackView: null,
  sortMenuActive: false, // NEU: Zustand des Dropdowns

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
      statsMarquee: getElement('#stats-marquee'),
      statTotal: getElement('#stat-total'),
      statCategories: getElement('#stat-categories'),
      statFeatured: getElement('#stat-featured'),
      dataSource: getElement('#data-source'),
      viewToggle: document.querySelector('.view-toggle')
    };
  },

  showState(stateName) {
    const states = ['loading', 'error', 'empty'];

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
  },

  updateStats() {
    if (!this.elements.statsMarquee) {
      this.elements.statsMarquee = getElement('#stats-marquee');
    }
    if (!this.elements.statsMarquee) return;

    const categories = new Set(state.tools.map(t => t.category)).size;
    const featured = state.tools.filter(t => t.featured).length;

    state.stats = {
      total: state.tools.length,
      categories,
      featured
    };

    const marqueeItems = [
      `<strong>${state.stats.total}</strong> TOOLS`,
      `<strong>${state.stats.categories}</strong> KATEGORIEN`,
      `<strong>${state.stats.featured}</strong> FEATURED`,
    ];

    if (state.tools.length > 0) {
      const topRated = state.tools.reduce((best, t) => (t.rating > best.rating ? t : best), state.tools[0]);
      marqueeItems.push(`BEST: ${topRated.title} (${topRated.rating.toFixed(1)})`);

      const sortedByDate = [...state.tools].sort((a, b) => new Date(b.added) - new Date(a.added));
      const newest = sortedByDate[0];
      marqueeItems.push(`NEU: ${newest.title}`);
    }

    const track = this.elements.statsMarquee.querySelector('.marquee-track');
    if (track) {
      track.innerHTML = '';
      for (let i = 0; i < 2; i++) {
        marqueeItems.forEach(text => {
          const span = document.createElement('span');
          span.innerHTML = text;
          track.appendChild(span);
        });
      }
    }

    this.elements.statsMarquee.style.display = 'flex';
    if (this.elements.statsBar) {
      this.elements.statsBar.style.display = 'none';
    }
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
           data-tool-id="${this.escapeHtml(String(tool.id || ''))}"
           data-category="${this.escapeHtml(categoryName)}"
           data-tool-name="${this.escapeHtml(tool.title)}"
           data-href="${this.escapeHtml(tool.link)}"
           data-depth="10"
           tabindex="0"
           role="article"
           aria-label="${this.escapeHtml(tool.title)} — ${this.escapeHtml(categoryDisplay)}">

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
             aria-label="${this.escapeHtml(tool.title)} öffnen"></a>
        </div>
      </div>
    `;
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  },

  render() {
    // Filterung
    if (state.searchQuery && state.searchQuery.length >= CONFIG.search.minLength) {
      const query = state.searchQuery.toLowerCase();
      state.filtered = state.tools.filter(tool =>
        (tool.title || '').toLowerCase().includes(query) ||
        (tool.description && tool.description.toLowerCase().includes(query))
      );
    } else {
      state.filtered = [...state.tools];
    }

    // Sortierung (NEU)
    state.filtered = sortTools(state.filtered);

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

    const activeView = this.getActiveView();
    if (activeView === 'grid') {
      this.showState('grid');
      if (this.elements.toolGrid) {
        if (!this.elements.toolGrid.classList.contains('tool-grid-squares')) {
          this.elements.toolGrid.classList.add('tool-grid-squares');
        }
        this.elements.toolGrid.innerHTML = state.filtered.map(tool => this.renderCard(tool)).join('');
        this.attachCardHandlers();
      }
    } else {
      // Stack-Ansicht
      this.showState('grid');
      if (!this.stackView) {
        this.stackView = new StackViewController(this.elements.toolGrid, state, this);
      } else {
        this.stackView.state = state;
        // Sortierkriterien an StackViewController übergeben
        this.stackView.activeSort = state.sortBy;
        this.stackView.sortDirection = state.sortDirection;
      }
      this.stackView.render();
    }
  },

  getActiveView() {
    const viewToggle = document.querySelector('.view-toggle');
    const activeTab = viewToggle?.querySelector('.toggle-btn.active');
    return activeTab ? activeTab.dataset.view : 'grid';
  },

  attachCardHandlers() {
    const grid = this.elements.toolGrid || getElement('#tool-grid');
    if (!grid) return;

    if (grid._clickHandler) {
      grid.removeEventListener('click', grid._clickHandler);
      grid.removeEventListener('keydown', grid._keyHandler);
    }

    const isMobile = window.innerWidth < 768;

    grid._clickHandler = (e) => {
      const overlay = e.target.closest('.card-overlay-link');
      const card = e.target.closest('.card-square');

      if (overlay && card) {
        e.preventDefault();
        e.stopPropagation();

        const toolId = card.dataset.toolId || card.getAttribute('data-tool-id');
        const toolName = card.dataset.toolName || card.getAttribute('data-tool-name') || card.querySelector('.square-title-large')?.textContent || 'Unknown';
        const href = overlay.getAttribute('data-href') || card.getAttribute('data-href') || overlay.getAttribute('href');

        analytics.trackToolClick(toolName);

        if (isMobile) {
          if (toolId) {
            card.style.transform = 'scale(0.95)';
            card.style.opacity = '0.7';
            setTimeout(() => {
              window.location.href = 'detail.html?id=' + encodeURIComponent(toolId);
            }, 150);
          } else if (href && href !== '#') {
            window.open(href, '_blank', 'noopener,noreferrer');
          } else {
            alert('Link nicht verfügbar');
          }
        } else {
          if (typeof openToolModal === 'function') {
            try {
              let tool = null;
              if (toolId && state.tools) {
                tool = state.tools.find(t => String(t.id) === String(toolId));
              }
              if (tool) {
                openToolModal(tool);
              } else {
                openToolModal({
                  title: toolName,
                  link: href,
                  description: `${toolName} - AI Tool`
                });
              }
            } catch (err) {
              console.error('openToolModal error', err);
              if (href) {
                window.open(href, '_blank', 'noopener,noreferrer');
              } else {
                card.classList.toggle('card-armed');
              }
            }
          } else {
            if (href) {
              window.open(href, '_blank', 'noopener,noreferrer');
            }
          }
        }
        return;
      }
    };

    grid._keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.card-square');
        if (!card) return;
        const overlay = card.querySelector('.card-overlay-link');
        if (overlay) {
          overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          e.preventDefault();
        }
      }
    };

    grid.addEventListener('click', grid._clickHandler);
    grid.addEventListener('keydown', grid._keyHandler, { passive: false });
  },

  switchView(view) {
    const buttons = this.elements.viewToggle?.querySelectorAll('.toggle-btn');
    buttons?.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    if (view === 'grid') {
      if (this.stackView) {
        this.stackView.destroy();
        this.stackView = null;
      }
      this.render();
    } else if (view === 'stacks') {
      this.render();
    }
  },

  // NEUE METHODEN FÜR SORTIER-DROPDOWN
  toggleSortMenu(show) {
    const dropdown = document.querySelector('.sort-dropdown');
    if (!dropdown) return;
    
    if (show === undefined) {
      this.sortMenuActive = !this.sortMenuActive;
    } else {
      this.sortMenuActive = show;
    }
    
    dropdown.classList.toggle('active', this.sortMenuActive);
    
    if (this.sortMenuActive) {
      setTimeout(() => {
        const closeHandler = (e) => {
          if (!e.target.closest('.sort-dropdown')) {
            this.toggleSortMenu(false);
            document.removeEventListener('click', closeHandler);
          }
        };
        document.addEventListener('click', closeHandler);
      }, 0);
    }
  },

  setSort(sortBy, sortDir) {
    state.sortBy = sortBy;
    state.sortDirection = sortDir;
    
    // Aktiven Button im Menü markieren
    document.querySelectorAll('.sort-menu button').forEach(btn => {
      const btnSort = btn.dataset.sort;
      const btnDir = btn.dataset.dir;
      btn.classList.toggle('active', btnSort === sortBy && btnDir === sortDir);
    });
    
    this.render();
    this.toggleSortMenu(false);
  }
};

// =========================================
// SEARCH FUNCTIONALITY
// =========================================
const search = {
  init() {
    if (!ui.elements.search) return;

    // Cleanup: alte Handler entfernen, falls init mehrfach läuft
    if (ui.handlers && ui.handlers.search) {
      ui.elements.search.removeEventListener('input', ui.handlers.search);
    }
    if (ui.elements.searchClear && ui.handlers && ui.handlers.searchClear) {
      ui.elements.searchClear.removeEventListener('click', ui.handlers.searchClear);
    }

    const handleInput = debounce((e) => {
      const raw = e && e.target ? e.target.value : '';
      const value = sanitizeInput(raw);
      state.searchQuery = value;

      if (ui.elements.searchClear) {
        ui.elements.searchClear.style.display = value ? 'flex' : 'none';
      }

      if (value) {
        try {
          if (typeof analytics !== 'undefined' && analytics.trackSearch) {
            analytics.trackSearch(value);
          }
        } catch (err) {
          // optional: console.warn('Analytics search tracking failed', err);
        }
      }

      ui.render();
    }, CONFIG.search.debounceMs);

    // merken, damit wir später sauber entfernen können
    if (!ui.handlers) ui.handlers = {};
    ui.handlers.search = handleInput;

    ui.elements.search.addEventListener('input', handleInput);

    if (ui.elements.searchClear) {
      const clearHandler = () => {
        ui.elements.search.value = '';
        state.searchQuery = '';
        ui.elements.searchClear.style.display = 'none';
        ui.render();
        ui.elements.search.focus();
      };

      ui.handlers.searchClear = clearHandler;
      ui.elements.searchClear.addEventListener('click', clearHandler);
    }
  }
};

// =========================================
// ANALYTICS (Google Analytics Events)
// =========================================
const analytics = {
  track(eventName, params = {}) {
    if (typeof gtag === 'undefined') {
      console.log('📊 Analytics (dry-run):', eventName, params);
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
    console.error(`❌ Error in ${context}:`, error);
    
    state.error = {
      message: error.message || 'Unknown error',
      context
    };
    
    analytics.trackError(context, error.message);
    
    ui.showState('error');
  },
  
  setupRetry() {
    if (!ui.elements.retryButton) return;
    
    ui.elements.retryButton.addEventListener('click', () => {
      console.log('🔄 Retrying...');
      location.reload();
    });
  }
};

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
      
      const rawTools = await dataLoader.load();
      
      if (!rawTools || rawTools.length === 0) {
        throw new Error('No data available from any source');
      }
      
      console.log('📥 Raw tools loaded:', rawTools.length);
      
      const validation = validator.validateAll(rawTools);
      validator.displayReport(validation);
      
      state.tools = validation.validTools;
      state.filtered = [...state.tools];
      state.loading = false;
      
      if (state.tools.length === 0) {
        throw new Error('No valid tools after validation');
      }
      
      console.log('✅ Valid tools ready:', state.tools.length);
      
      ui.updateStats();
      ui.updateDataSource();
      ui.render();
      search.init();

      // Tabs initialisieren (robust)
      const viewToggle = document.querySelector('.view-toggle');
      if (viewToggle) {
        const newToggle = viewToggle.cloneNode(true);
        viewToggle.parentNode.replaceChild(newToggle, viewToggle);
        ui.elements.viewToggle = newToggle;
        
        newToggle.addEventListener('click', (e) => {
          const btn = e.target.closest('.toggle-btn');
          if (!btn) return;
          const view = btn.dataset.view;
          if (!view) return;
          
          newToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          ui.switchView(view);
        });
      }
      
      // Globale Scroll-Buttons
const globalScrollTop = document.getElementById('globalScrollTopBtn');
const globalScrollBottom = document.getElementById('globalScrollBottomBtn');
if (globalScrollTop) {
  globalScrollTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
if (globalScrollBottom) {
  globalScrollBottom.addEventListener('click', () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
}
      
      // Sticky-Bar-Hintergrund aktivieren
const viewToggle = document.querySelector('.view-toggle');
if (viewToggle) {
  const toggleStickyClass = () => {
    const rect = viewToggle.getBoundingClientRect();
    // Wenn das Element den oberen Rand erreicht (oder leicht überschreitet)
    if (rect.top <= 0) {
      viewToggle.classList.add('sticky-active');
    } else {
      viewToggle.classList.remove('sticky-active');
    }
  };
  
  // Beim Scrollen und einmal initial prüfen
  window.addEventListener('scroll', toggleStickyClass, { passive: true });
  toggleStickyClass(); // Initialer Check
}
      
      // Sortier-Dropdown initialisieren (NEU)
      const sortTrigger = document.querySelector('.sort-trigger');
      if (sortTrigger) {
        sortTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          ui.toggleSortMenu();
        });
      }

      // Sortier-Optionen initialisieren (NEU)
      document.querySelectorAll('.sort-menu button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const sortBy = btn.dataset.sort;
          const sortDir = btn.dataset.dir;
          if (sortBy && sortDir) {
            ui.setSort(sortBy, sortDir);
          }
        });
      });

      // Aktiven Sortiermodus initial markieren (NEU)
      const activeSortBtn = document.querySelector(`.sort-menu button[data-sort="${state.sortBy}"][data-dir="${state.sortDirection}"]`);
      if (activeSortBtn) activeSortBtn.classList.add('active');

      console.log('✅ App initialized successfully!');

      try {
        if (!window.appState) window.appState = state;
        window.dispatchEvent(new Event('quantum:ready'));
      } catch (e) {
        console.debug('app: could not expose global state or dispatch event', e);
      }

      try {
        if (typeof initializeModalSystem === 'function') {
          initializeModalSystem();
        }
      } catch (modalError) {
        console.warn('Modal system init failed:', modalError);
      }
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in init:', error);
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      console.log('🚨 EMERGENCY: Activating fallback to defaults...');
      
      try {
        state.tools = DEFAULT_TOOLS;
        state.filtered = [...state.tools];
        state.loading = false;
        state.error = null;
        state.dataSource = 'emergency';
        
        console.log('🔧 Emergency: Updating UI...');
        ui.updateStats();
        ui.updateDataSource();
        ui.render();
        
        console.log('🔧 Emergency: Initializing search...');
        search.init();
        
        console.log('✅ Emergency recovery successful! App running with defaults.');
        console.log('💡 Check console errors above to debug the original issue.');
        
      } catch (recoveryError) {
        console.error('💥 EMERGENCY RECOVERY FAILED:', recoveryError);
        console.error('💥 This should never happen. Something is very wrong.');
        
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
  document.addEventListener('DOMContentLoaded', () => startApp());
} else {
  startApp();
}

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.appState = state;
  window.appConfig = CONFIG;
  console.log('💡 Debug mode: window.appState and window.appConfig available');
}

// =========================================
// MODAL SYSTEM - FIXED VERSION
// =========================================

function createToolModal() {
  if (document.getElementById('tool-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'tool-modal';
  modal.className = 'tool-modal-overlay';
  
  Object.assign(modal.style, {
    display: 'none',
    position: 'fixed',
    inset: '0',
    zIndex: '9999',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: '0',
    transition: 'opacity 0.2s ease'
  });
  
  modal.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" 
         style="background:#0f1224;
                border-radius:14px;
                padding:24px;
                width:90%;
                max-width:500px;
                box-shadow:0 20px 60px rgba(0,0,0,0.8);
                transform:scale(0.9);
                transition:transform 0.2s ease;">
      <h3 id="tool-modal-title" 
          style="color:var(--primary);
                 margin-bottom:8px;
                 font-size:1.5rem;">Tool</h3>
      <p id="tool-modal-desc" 
         style="color:var(--text-dim);
                margin-bottom:12px;
                line-height:1.5;">Beschreibung lädt...</p>
      <div style="display:flex;
                  gap:8px;
                  justify-content:flex-end;
                  margin-top:16px;">
        <a id="tool-modal-open" 
           class="card-link" 
           style="display:inline-flex;
                  padding:10px 20px;
                  border-radius:8px;
                  background:var(--primary);
                  color:var(--bg-dark);
                  text-decoration:none;
                  font-weight:600;
                  transition:transform 0.2s ease;">
          Tool öffnen ➜
        </a>
        <button id="tool-modal-close" 
                style="background:transparent;
                       border:1px solid rgba(255,255,255,0.1);
                       padding:10px 20px;
                       border-radius:8px;
                       color:var(--text-secondary);
                       cursor:pointer;
                       transition:all 0.2s ease;">
          Schließen
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeToolModal();
    }
  });
  
  if (!document._toolModalEscapeHandlerAttached) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeToolModal();
      }
    });
    document._toolModalEscapeHandlerAttached = true;
  }
  
  const closeBtn = modal.querySelector('#tool-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeToolModal);
  }
  
  console.log('✅ Modal created and initialized');
}

function openToolModal(toolData) {
  try {
    console.log('🎯 Opening modal with:', toolData);
    
    createToolModal();
    
    const modal = document.getElementById('tool-modal');
    if (!modal) {
      console.error('❌ Modal not found after creation!');
      return;
    }
    
    const titleEl = modal.querySelector('#tool-modal-title');
    const descEl = modal.querySelector('#tool-modal-desc');
    const openLink = modal.querySelector('#tool-modal-open');
    
    if (!titleEl || !descEl || !openLink) {
      console.error('❌ Modal elements missing!');
      return;
    }
    
    const toolLink = toolData.link || toolData.href || '#';
    const toolTitle = toolData.title || 'AI Tool';
    const toolDesc = toolData.description || 'Klicke auf "Tool öffnen" um fortzufahren.';
    
    titleEl.textContent = toolTitle;
    descEl.textContent = toolDesc;
    openLink.href = toolLink;
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';
    
    modal.style.display = 'flex';
    modal.offsetHeight;
    modal.style.opacity = '1';
    
    const modalBox = modal.querySelector('.modal-box');
    if (modalBox) {
      modalBox.style.transform = 'scale(1)';
    }
    
    document.body.style.overflow = 'hidden';
    
    console.log('✅ Modal opened:', toolTitle);
    
  } catch (error) {
    console.error('❌ Error opening modal:', error);
    console.error('Stack:', error.stack);
    
    const link = toolData.link || toolData.href;
    if (link) {
      console.log('🔗 Fallback: Opening link directly');
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }
}

function closeToolModal() {
  const modal = document.getElementById('tool-modal');
  if (!modal) return;
  
  modal.style.opacity = '0';
  const modalBox = modal.querySelector('.modal-box');
  if (modalBox) {
    modalBox.style.transform = 'scale(0.9)';
  }
  
  setTimeout(() => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }, 200);
  
  console.log('✅ Modal closed');
}

function initializeModalSystem() {
  console.log('🚀 Initializing modal system...');
  createToolModal();
  window.openToolModal = openToolModal;
  window.closeToolModal = closeToolModal;
  console.log('✅ Modal system ready');
}