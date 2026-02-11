// =========================================
// QUANTUM AI HUB - APP.JS
// Version: 2.0.0 - Feature Complete
// Production Ready - All Features Integrated
// =========================================

'use strict';

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
  favorites: {
    storageKey: 'quantum-ai-hub-favorites'
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
    rating: 4.8,
    provider: 'OpenAI',
    tags: ['chat', 'nlp'],
    added: '2024-01-15'
  },
  {
    id: 2,
    title: 'Midjourney',
    link: 'https://midjourney.com',
    description: 'AI Bild-Generator',
    category: 'image',
    is_free: false,
    rating: 4.7,
    provider: 'Midjourney',
    tags: ['image', 'art'],
    added: '2024-01-10'
  },
  {
    id: 3,
    title: 'GitHub Copilot',
    link: 'https://github.com/copilot',
    description: 'AI Code-Assistent',
    category: 'code',
    is_free: false,
    rating: 4.6,
    provider: 'GitHub',
    tags: ['coding', 'autocomplete'],
    added: '2024-01-12'
  }
];

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
  currentFilter: 'all',
  currentSort: 'rating-desc',
  favorites: [],
  dataSource: 'loading',
  stats: {
    total: 0,
    categories: 0,
    featured: 0
  }
};

// =========================================
// FAVORITES MANAGER
// =========================================
const favoritesManager = {
  load() {
    try {
      const stored = localStorage.getItem(CONFIG.favorites.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load favorites:', error);
      return [];
    }
  },
  
  save(favorites) {
    try {
      localStorage.setItem(CONFIG.favorites.storageKey, JSON.stringify(favorites));
    } catch (error) {
      console.warn('Failed to save favorites:', error);
    }
  },
  
  toggle(toolId) {
    const index = state.favorites.indexOf(toolId);
    if (index > -1) {
      state.favorites.splice(index, 1);
    } else {
      state.favorites.push(toolId);
    }
    this.save(state.favorites);
    ui.render();
    console.log('⭐ Favorites updated:', state.favorites);
  },
  
  isFavorite(toolId) {
    return state.favorites.includes(toolId);
  }
};

// =========================================
// FILTER MANAGER
// =========================================
const filterManager = {
  categories: ['all', 'text', 'image', 'code', 'audio', 'video', 'data', 'favorites'],
  
  setFilter(category) {
    state.currentFilter = category;
    ui.render();
    this.updateUI();
    console.log('🔍 Filter set to:', category);
  },
  
  updateUI() {
    $$('.filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.category === state.currentFilter);
    });
  },
  
  renderChips() {
    const chipLabels = {
      all: { label: 'Alle', emoji: '🌐' },
      text: { label: 'Text', emoji: '📝' },
      image: { label: 'Bilder', emoji: '🎨' },
      code: { label: 'Code', emoji: '💻' },
      audio: { label: 'Audio', emoji: '🎵' },
      video: { label: 'Video', emoji: '🎬' },
      data:  { label: 'Daten', emoji: '📊' },
      favorites: { label: 'Favoriten', emoji: '⭐' }
    };
    
    return this.categories.map(cat => {
      const config = chipLabels[cat];
      const count = cat === 'all' 
        ? state.tools.length 
        : cat === 'favorites'
        ? state.favorites.length
        : state.tools.filter(t => t.category === cat).length;
      
      return `
        <button 
          class="filter-chip ${cat === state.currentFilter ? 'active' : ''}" 
          data-category="${cat}"
          type="button"
        >
          <span class="chip-emoji" aria-hidden="true">${config.emoji}</span>
          <span class="chip-label">${config.label}</span>
          <span class="chip-count">${count}</span>
        </button>
      `;
    }).join('');
  }
};

// =========================================
// SORT MANAGER
// =========================================
const sortManager = {
  options: {
    'rating-desc': { label: '⭐ Rating (hoch → niedrig)', fn: (a, b) => (b.rating || 0) - (a.rating || 0) },
    'rating-asc': { label: '⭐ Rating (niedrig → hoch)', fn: (a, b) => (a.rating || 0) - (b.rating || 0) },
    'name-asc': { label: '🔤 Name (A → Z)', fn: (a, b) => a.title.localeCompare(b.title) },
    'name-desc': { label: '🔤 Name (Z → A)', fn: (a, b) => b.title.localeCompare(a.title) },
    'date-desc': { label: '📅 Neueste zuerst', fn: (a, b) => new Date(b.added || 0) - new Date(a.added || 0) },
    'date-asc': { label: '📅 Älteste zuerst', fn: (a, b) => new Date(a.added || 0) - new Date(b.added || 0) }
  },
  
  setSort(sortKey) {
    state.currentSort = sortKey;
    ui.render();
    this.updateUI();
    console.log('📊 Sort set to:', sortKey);
  },
  
  updateUI() {
    const select = $('#sort-select');
    if (select) select.value = state.currentSort;
  },
  
  renderDropdown() {
    return `
      <div class="sort-container">
        <label for="sort-select" class="sort-label">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Sortieren:</span>
        </label>
        <select id="sort-select" class="sort-select">
          ${Object.entries(this.options).map(([key, opt]) => 
            `<option value="${key}" ${key === state.currentSort ? 'selected' : ''}>${opt.label}</option>`
          ).join('')}
        </select>
      </div>
    `;
  },
  
  applySorting(tools) {
    const sortFn = this.options[state.currentSort]?.fn;
    return sortFn ? [...tools].sort(sortFn) : tools;
  }
};

// =========================================
// ANIMATED BACKGROUND
// =========================================
const animatedBackground = {
  canvas: null,
  ctx: null,
  particles: [],
  animationFrame: null,
  
  init() {
    this.canvas = $('#background-canvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'background-canvas';
      this.canvas.className = 'background-canvas';
      document.body.insertBefore(this.canvas, document.body.firstChild);
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.createParticles();
    this.animate();
    
    window.addEventListener('resize', () => this.resizeCanvas());
    console.log('🌌 Animated background initialized');
  },
  
  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },
  
  createParticles() {
    const count = Math.min(50, Math.floor(window.innerWidth / 30));
    this.particles = [];
    
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  },
  
  animate() {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(0, 243, 255, ${p.opacity})`;
      this.ctx.fill();
    });
    
    // Draw connections
    this.particles.forEach((p1, i) => {
      this.particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          const opacity = (1 - distance / 150) * 0.2;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(0, 243, 255, ${opacity})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      });
    });
    
    this.animationFrame = requestAnimationFrame(() => this.animate());
  },
  
  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
};

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
  
  cacheElements() {
    this.elements = {
      loading: getElement('#loading'),
      error: getElement('#error'),
      empty: getElement('#empty'),
      emptyQuery: getElement('#empty-query'),
      toolGrid: getElement('#tool-grid'),
      toolStacks: getElement('#tool-stacks'),
      viewToggle: getElement('#view-toggle'),
      viewGrid: getElement('#view-grid'),
      viewStack: getElement('#view-stack'),
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
    
    states.forEach(s => {
      const el = this.elements[s];
      if (el) {
        el.style.display = s === stateName ? 'block' : 'none';
      }
    });
    
    if (this.elements.toolGrid) {
      this.elements.toolGrid.style.display = stateName === 'grid' ? 'grid' : 'none';
    }
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
    
    if (this.elements.statTotal) {
      this.elements.statTotal.textContent = state.stats.total;
    }
    if (this.elements.statCategories) {
      this.elements.statCategories.textContent = state.stats.categories;
    }
    if (this.elements.statFeatured) {
      this.elements.statFeatured.textContent = state.stats.featured;
    }
    
    this.elements.statsBar.style.display = 'flex';
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
  
  renderCard(tool) {
  const categoryName = tool.category_name || tool.category || 'other';
  const categoryDisplay = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
  const isFavorite = favoritesManager.isFavorite(tool.id);
  const rating = tool.rating || 0;
  const stars = '⭐'.repeat(Math.round(rating));
  const provider = tool.provider ? `by ${tool.provider}` : '';
  const isFree = tool.is_free ? '<span class="badge-free">GRATIS</span>' : '';

  return `
    <div class="card-square" data-category="${this.escapeHtml(categoryName)}" data-tool-id="${tool.id}" data-depth="10">
      
      <!-- CARD TOP: badge (links) + favorite inline (rechts) -->
      <div class="card-top" aria-hidden="true">
        <div class="square-category-badge">${categoryDisplay}</div>
        <button 
          class="favorite-inline ${isFavorite ? 'active' : ''}" 
          data-tool-id="${tool.id}"
          type="button"
          aria-label="${isFavorite ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen'}"
          title="${isFavorite ? 'Favorit' : 'Zu Favoriten hinzufügen'}"
        >${isFavorite ? '❤️' : '🤍'}</button>
      </div>

      <!-- CENTRED CONTENT (ohne duplicate badge) -->
      <div class="square-content-centered">
        <h3 class="square-title-large">${this.escapeHtml(tool.title)}</h3>

        <div class="tool-meta">
          ${rating > 0 ? `<span class="tool-rating" title="Rating: ${rating}/5">${stars}</span>` : ''}
          ${provider ? `<span class="tool-provider">${this.escapeHtml(provider)}</span>` : ''}
          ${isFree}
        </div>

        ${tool.tags && tool.tags.length > 0 ? `
          <div class="tool-tags">
            ${tool.tags.slice(0, 3).map(tag => `<span class="tool-tag">#${this.escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <a 
        href="${this.escapeHtml(tool.link)}" 
        class="card-overlay-link"
        target="_blank" 
        rel="noopener noreferrer"
        aria-label="${this.escapeHtml(tool.title)} öffnen"
      ></a>
    </div>
  `;
}
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  render() {
    let tools = [...state.tools];
    
    // Apply category filter
    if (state.currentFilter === 'favorites') {
      tools = tools.filter(t => favoritesManager.isFavorite(t.id));
    } else if (state.currentFilter !== 'all') {
      tools = tools.filter(t => t.category === state.currentFilter);
    }
    
    // Apply search filter
    if (state.searchQuery && state.searchQuery.length >= CONFIG.search.minLength) {
      const query = state.searchQuery.toLowerCase();
      tools = tools.filter(tool => 
        tool.title.toLowerCase().includes(query) ||
        (tool.description && tool.description.toLowerCase().includes(query)) ||
        (tool.tags && tool.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    // Apply sorting
    tools = sortManager.applySorting(tools);
    
    state.filtered = tools;
    
    // Show appropriate state
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
      } else if (state.currentFilter === 'favorites' && state.favorites.length === 0) {
        this.elements.emptyQuery.textContent = 'Noch keine Favoriten gespeichert';
      } else {
        this.elements.emptyQuery.textContent = 'Versuche einen anderen Filter';
      }
      return;
    }
    
    // Render filters and sort
    this.renderFilterSort();
    
    // Render based on current view
    if (viewManager.currentView === 'grid') {
      this.showState('grid');
      if (this.elements.toolGrid) {
        this.elements.toolGrid.classList.add('tool-grid-squares');
        this.elements.toolGrid.innerHTML = state.filtered.map(tool => this.renderCard(tool)).join('');
        this.attachCardHandlers();
      }
    } else {
      if (this.elements.toolGrid) this.elements.toolGrid.style.display = 'none';
      if (this.elements.toolStacks) {
        this.elements.toolStacks.style.display = 'grid';
        stackRenderer.render();
      }
    }
  },
  
  renderFilterSort() {
    let container = $('#filter-sort-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'filter-sort-container';
      container.className = 'filter-sort-container';
      
      const mainContainer = $('.container');
      const toolGrid = $('#tool-grid');
      if (mainContainer && toolGrid) {
        mainContainer.insertBefore(container, toolGrid);
      }
    }
    
    container.innerHTML = `
      <div class="filter-chips">
        ${filterManager.renderChips()}
      </div>
      ${sortManager.renderDropdown()}
    `;
    
    // Attach handlers
    $$('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        filterManager.setFilter(chip.dataset.category);
      });
    });
    
    const sortSelect = $('#sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        sortManager.setSort(e.target.value);
      });
    }
  },
  
  attachCardHandlers() {
    // Favorite buttons
    $$('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const toolId = parseInt(btn.dataset.toolId);
        favoritesManager.toggle(toolId);
      });
    });
    
    // Card armed state (click highlight)
    $$('.card-square').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.favorite-btn') || e.target.closest('.card-overlay-link')) {
          return;
        }
        
        // Remove armed from all cards
        $$('.card-armed').forEach(c => c.classList.remove('card-armed'));
        
        // Add armed to clicked card
        card.classList.add('card-armed');
        
        // Auto-remove after 3s
        setTimeout(() => {
          card.classList.remove('card-armed');
        }, 3000);
      });
    });
    
    // Analytics
    const links = $$('.card-overlay-link');
    links.forEach(link => {
      link.addEventListener('click', () => {
        const card = link.closest('.card-square');
        const toolId = card?.dataset.toolId;
        if (toolId) {
          const tool = state.tools.find(t => t.id === parseInt(toolId));
          if (tool) {
            analytics.trackToolClick(tool.title);
          }
        }
      });
    });
  }
};

// =========================================
// VIEW MANAGEMENT (Grid/Stack Toggle)
// =========================================
const viewManager = {
  currentView: 'grid',
  
  init() {
    if (!ui.elements || Object.keys(ui.elements).length === 0) ui.cacheElements();
    
    ui.elements.viewToggle = ui.elements.viewToggle || getElement('#view-toggle');
    ui.elements.viewGrid = ui.elements.viewGrid || getElement('#view-grid');
    ui.elements.viewStack = ui.elements.viewStack || getElement('#view-stack');
    ui.elements.toolStacks = ui.elements.toolStacks || getElement('#tool-stacks');
    ui.elements.toolGrid = ui.elements.toolGrid || getElement('#tool-grid');
    
    if (ui.elements.viewToggle && state.tools && state.tools.length > 0) {
      ui.elements.viewToggle.style.display = 'flex';
    }
    
    if (ui.elements.viewGrid) {
      ui.elements.viewGrid.addEventListener('click', () => this.switchView('grid'));
    }
    
    if (ui.elements.viewStack) {
      ui.elements.viewStack.addEventListener('click', () => this.switchView('stack'));
    }
    
    this.switchView(this.currentView);
  },
  
  switchView(view) {
    this.currentView = view;
    
    if (ui.elements.viewGrid && ui.elements.viewStack) {
      ui.elements.viewGrid.classList.toggle('active', view === 'grid');
      ui.elements.viewStack.classList.toggle('active', view === 'stack');
      ui.elements.viewGrid.setAttribute('aria-selected', view === 'grid');
      ui.elements.viewStack.setAttribute('aria-selected', view === 'stack');
    }
    
    ui.elements.toolGrid = ui.elements.toolGrid || getElement('#tool-grid');
    ui.elements.toolStacks = ui.elements.toolStacks || getElement('#tool-stacks');
    
    if (view === 'grid') {
      const stacks = ui.elements.toolStacks;
      if (stacks && stacks.classList.contains('panel')) {
        document.body.style.overflow = '';
        stacks.classList.remove('enter');
        stacks.classList.add('exit');
        const onEnd = () => {
          stacks.style.display = 'none';
          stacks.classList.remove('panel', 'exit');
          stacks.removeEventListener('transitionend', onEnd);
        };
        stacks.addEventListener('transitionend', onEnd, { passive: true, once: true });
      } else {
        if (ui.elements.toolStacks) ui.elements.toolStacks.style.display = 'none';
      }
      
      if (ui.elements.toolGrid) ui.elements.toolGrid.style.display = 'grid';
      $$('.stack-cards.fanned').forEach(sc => sc.classList.remove('fanned'));
      console.log('📐 Switched to grid view');
      return;
    }
    
    if (view === 'stack') {
      try {
        stackRenderer.render();
      } catch (err) {
        console.error('Stack render failed:', err);
      }
      
      const stacks = ui.elements.toolStacks;
      if (!stacks) {
        console.warn('tool-stacks element not found');
        return;
      }
      
      if (ui.elements.toolGrid) ui.elements.toolGrid.style.display = 'none';
      
      if (!stacks.classList.contains('panel')) {
        stacks.classList.add('panel');
        let closeBtn = stacks.querySelector('.panel-close');
        if (!closeBtn) {
          closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.className = 'panel-close';
          closeBtn.setAttribute('aria-label', 'Zurück zur Grid Ansicht');
          closeBtn.innerHTML = '← Zurück';
          closeBtn.addEventListener('click', () => this.switchView('grid'));
          stacks.prepend(closeBtn);
        }
      }
      
      stacks.style.display = 'block';
      document.body.style.overflow = 'hidden';
      
      requestAnimationFrame(() => {
        stacks.classList.remove('exit');
        stacks.classList.add('enter');
      });
      
      const firstFocusable = stacks.querySelector('.panel-close, .stack-title, .category-stack .stack-title');
      if (firstFocusable) {
        firstFocusable.setAttribute('tabindex', '-1');
        firstFocusable.focus({ preventScroll: true });
      }
      
      console.log('📐 Switched to stack view (panel open)');
    }
  }
};

// =========================================
// STACK RENDERER (3D Category Stacks)
// =========================================
const stackRenderer = {
    categoryConfig: {
    text:  { label: 'Text Tools',  emoji: '📝', color: 'text' },
    image: { label: 'Image Tools', emoji: '🎨', color: 'image' },
    code:  { label: 'Code Tools',  emoji: '💻', color: 'code' },
    audio: { label: 'Audio Tools', emoji: '🎵', color: 'audio' },
    video: { label: 'Video Tools', emoji: '🎬', color: 'video' },
    data:   { label: 'Data Tools', emoji: '📊', color: 'data' },
    other: { label: 'Other Tools', emoji: '🔧', color: 'other' }
  },
  
  groupByCategory() {
    const grouped = {};
    
    state.filtered.forEach(tool => {
      const category = tool.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(tool);
    });
    
    return grouped;
  },
  
  renderStackCard(tool) {
    const categoryDisplay = (tool.category || 'other').charAt(0).toUpperCase() + (tool.category || 'other').slice(1);
    
    return `
      <div class="stack-card" data-tool-id="${tool.id}">
        <div class="card-header">
          <h3 class="card-title">${ui.escapeHtml(tool.title)}</h3>
          <span class="card-category">${categoryDisplay}</span>
        </div>
        <p class="card-description">
          ${ui.escapeHtml(tool.description || 'AI Tool')}
        </p>
      </div>
    `;
  },
  
  renderCategoryStack(category, tools) {
    const config = this.categoryConfig[category] || this.categoryConfig.other;
    const cardsHtml = tools.map(tool => this.renderStackCard(tool)).join('');
    
    return `
      <div class="category-stack" data-category="${category}">
        <div class="stack-header">
          <h2 class="stack-title">
            <span aria-hidden="true">${config.emoji}</span>
            ${config.label}
          </h2>
          <span class="stack-count">${tools.length}</span>
        </div>
        <div class="stack-container" data-stack-id="${category}">
          <div class="stack-cards" data-category="${category}">
            ${cardsHtml}
          </div>
        </div>
      </div>
    `;
  },
  
  render() {
    if (!ui.elements.toolStacks) return;
    
    const grouped = this.groupByCategory();
    const categories = Object.keys(grouped).sort();
    
    if (categories.length === 0) {
      ui.elements.toolStacks.innerHTML = '<p class="state-text">Keine Tools gefunden</p>';
      return;
    }
    
    const stacksHtml = categories
      .map(category => this.renderCategoryStack(category, grouped[category]))
      .join('');
    
    ui.elements.toolStacks.innerHTML = stacksHtml;
    
    this.attachStackHandlers();
    
    console.log(`📚 Rendered ${categories.length} category stacks`);
  },
  
  attachStackHandlers() {
    const stackContainers = $$('.stack-container');
    
    stackContainers.forEach(container => {
      const stackCards = container.querySelector('.stack-cards');
      if (!stackCards) return;
      
      container.addEventListener('click', (e) => {
        if (e.target.closest('.card-link')) return;
        
        const isFanned = stackCards.classList.contains('fanned');
        
        $$('.stack-cards').forEach(sc => {
          if (sc !== stackCards) {
            sc.classList.remove('fanned');
          }
        });
        
        stackCards.classList.toggle('fanned', !isFanned);
        
        console.log(`📇 Stack ${isFanned ? 'closed' : 'opened'}:`, container.dataset.stackId);
      });
    });
    
    const links = $$('.stack-card .card-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const toolName = e.currentTarget.dataset.toolName;
        analytics.trackToolClick(toolName);
      });
    });
  }
};

// =========================================
// SEARCH FUNCTIONALITY
// =========================================
const search = {
  init() {
    if (!ui.elements.search) return;
    
    const handleInput = debounce((e) => {
      const value = sanitizeInput(e.target.value);
      state.searchQuery = value;
      
      if (ui.elements.searchClear) {
        ui.elements.searchClear.style.display = value ? 'flex' : 'none';
      }
      
      if (value) {
        analytics.trackSearch(value);
      }
      
      ui.render();
    }, CONFIG.search.debounceMs);
    
    ui.elements.search.addEventListener('input', handleInput);
    
    if (ui.elements.searchClear) {
      ui.elements.searchClear.addEventListener('click', () => {
        ui.elements.search.value = '';
        state.searchQuery = '';
        ui.elements.searchClear.style.display = 'none';
        ui.render();
        ui.elements.search.focus();
      });
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
      console.log('🚀 Initializing Quantum AI Hub v2.0...');
      console.log('Config:', CONFIG);
      
      ui.cacheElements();
      errorHandler.setupRetry();
      
      // Load favorites from localStorage
      state.favorites = favoritesManager.load();
      console.log('⭐ Loaded favorites:', state.favorites);
      
      // Initialize animated background
      animatedBackground.init();
      
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
      viewManager.init();
      
      console.log('✅ App initialized successfully!');
      console.log('✨ All features active:');
      console.log('   - Kategorie-Filter');
      console.log('   - Sortierung');
      console.log('   - Favoriten-System');
      console.log('   - Erweiterte Details');
      console.log('   - Animierter Hintergrund');
      console.log('   - Click-Highlight');
      
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
        
        console.log('🔧 Emergency: Initializing view manager...');
        viewManager.init();
        
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Debug: Expose state to console
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.appState = state;
  window.appConfig = CONFIG;
  console.log('💡 Debug mode: window.appState and window.appConfig available');
}

// =========================================
// END
// =========================================
