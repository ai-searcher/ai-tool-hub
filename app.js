// =========================================
// QUANTUM AI HUB - APP.JS
// Version: 1.0.0
// Production Ready - All Systems Checked
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
    .replace(/[<>'"]/g, '') // Remove dangerous chars
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
      // fallback-compatible fetch with AbortController timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s

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
      // Use the view with category info
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
  // Validate single tool
  validateTool(tool, index) {
    const errors = [];
    const warnings = [];
    
    // Check required fields
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
    
    // Check types
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
    
    // Check ranges
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
    
    // Check patterns
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
  
  // Auto-fix tool
  autoFix(tool) {
    const fixed = { ...tool };
    
    // Generate ID if missing
    if (!fixed.id || typeof fixed.id !== 'number') {
      fixed.id = Date.now() + Math.floor(Math.random() * 1000);
      console.log(`🔧 Auto-fix: Generated ID for "${fixed.title}"`);
    }
    
    // Fix URL protocol
    if (fixed.link && !fixed.link.match(/^https?:\/\//i)) {
      fixed.link = 'https://' + fixed.link;
      console.log(`🔧 Auto-fix: Added https:// to "${fixed.title}"`);
    }
    
    // Generate description if missing
    if (!fixed.description || fixed.description === '') {
      fixed.description = `${fixed.title} - AI Tool`;
      console.log(`🔧 Auto-fix: Generated description for "${fixed.title}"`);
    }
    
    // Detect category if missing
    if (!fixed.category) {
      fixed.category = this.detectCategory(fixed);
      console.log(`🔧 Auto-fix: Detected category "${fixed.category}" for "${fixed.title}"`);
    }
    
    // Clamp rating
    if (fixed.rating !== undefined && fixed.rating !== null) {
      if (fixed.rating < 0) fixed.rating = 0;
      if (fixed.rating > 5) fixed.rating = 5;
    }
    
    return fixed;
  },
  
  // Detect category from title/description
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
  
  // Validate all tools
  validateAll(tools) {
    const allErrors = [];
    const allWarnings = [];
    const validTools = [];
    const invalidTools = [];
    
    const seenIds = new Set();
    const seenTitles = new Set();
    
    tools.forEach((tool, index) => {
      // Auto-fix if enabled
      const processedTool = CONFIG.validation.autoFix ? this.autoFix(tool) : tool;
      
      const { errors, warnings } = this.validateTool(processedTool, index);
      
      // Check duplicate ID
      if (processedTool.id && seenIds.has(processedTool.id)) {
        errors.push({
          type: 'DUPLICATE_ID',
          field: 'id',
          message: `Tool "${processedTool.title}": Duplicate ID ${processedTool.id}`
        });
      }
      seenIds.add(processedTool.id);
      
      // Check duplicate title (warning only)
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
  
  // Display validation report
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
      
      // robust local JSON fetch with AbortController timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s

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

  const data = await response.json();
  // <-- rest of function continues unchanged (use data as before)
} finally {
  clearTimeout(timeoutId);
}
      console.log('📦 JSON parsed successfully');
      console.log('📦 Data structure:', Object.keys(data));
      console.log('📦 Data content:', data);
      
      const tools = data.tools || data;
      
      if (tools && tools.length > 0) {
        console.log('✅ Loaded from data.json:', tools.length, 'tools');
        state.dataSource = 'json';
        return tools;
      }
      
      console.warn('⚠️ JSON loaded but no tools found');
      console.warn('⚠️ Data was:', data);
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
    
    // Try Supabase first
    let tools = await this.loadFromSupabase();
    if (tools) return tools;
    
    // Try local JSON
    tools = await this.loadFromJSON();
    if (tools) return tools;
    
    // Fallback to defaults
    return this.loadDefaults();
  }
};

// =========================================
// UI RENDERING
// =========================================
const ui = {
  elements: {},
  
  // Cache all DOM elements
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
  
  // Show/hide states
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
  
  // Update stats bar
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
  
  // Update data source indicator
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
  
  // Render tool card
  renderCard(tool) {
    const categoryName = tool.category_name || tool.category || 'other';
    const categoryDisplay = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
    
    return `
      <div class="card" role="listitem">
        <div class="card-header">
          <h3 class="card-title">${this.escapeHtml(tool.title)}</h3>
          <span class="card-category">${categoryDisplay}</span>
        </div>
        <p class="card-description">
          ${this.escapeHtml(tool.description || 'AI Tool')}
        </p>
        <a 
          href="${this.escapeHtml(tool.link)}" 
          class="card-link" 
          target="_blank" 
          rel="noopener noreferrer"
          data-tool-id="${tool.id}"
          data-tool-name="${this.escapeHtml(tool.title)}"
        >
          Öffnen →
        </a>
      </div>
    `;
  },
  
  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  // Render all tools
render() {
  // Filter tools by search query
  if (state.searchQuery && state.searchQuery.length >= CONFIG.search.minLength) {
    const query = state.searchQuery.toLowerCase();
    state.filtered = state.tools.filter(tool => 
      tool.title.toLowerCase().includes(query) ||
      (tool.description && tool.description.toLowerCase().includes(query))
    );
  } else {
    state.filtered = [...state.tools];
  }
  
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
    }
    return;
  }
  
  // Render based on current view
  if (viewManager.currentView === 'grid') {
    this.showState('grid');
    if (this.elements.toolGrid) {
      this.elements.toolGrid.innerHTML = state.filtered.map(tool => this.renderCard(tool)).join('');
      this.attachCardHandlers();
    }
  } else {
    // Stack view
    if (this.elements.toolGrid) this.elements.toolGrid.style.display = 'none';
    if (this.elements.toolStacks) {
      this.elements.toolStacks.style.display = 'grid';
      stackRenderer.render();
    }
  }
},

  
  // Attach event handlers to cards
  attachCardHandlers() {
    const links = $$('.card-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const toolName = e.currentTarget.dataset.toolName;
        analytics.trackToolClick(toolName);
      });
    });
  }
};

// =========================================
// VIEW MANAGEMENT (Grid/Stack Toggle)
// =========================================
const viewManager = {
  currentView: 'grid', // 'grid' or 'stack'
  
  init() {
    // Cache view elements
    ui.elements.viewToggle = getElement('#view-toggle');
    ui.elements.viewGrid = getElement('#view-grid');
    ui.elements.viewStack = getElement('#view-stack');
    ui.elements.toolStacks = getElement('#tool-stacks');
    
    if (!ui.elements.viewToggle) return;
    
    // Show toggle buttons when tools are loaded
    if (state.tools.length > 0) {
      ui.elements.viewToggle.style.display = 'flex';
    }
    
    // Grid button handler
    if (ui.elements.viewGrid) {
      ui.elements.viewGrid.addEventListener('click', () => {
        this.switchView('grid');
      });
    }
    
    // Stack button handler
    if (ui.elements.viewStack) {
      ui.elements.viewStack.addEventListener('click', () => {
        this.switchView('stack');
      });
    }
  },
  
  switchView(view) {
    this.currentView = view;
    
    // Update button states
    if (ui.elements.viewGrid && ui.elements.viewStack) {
      ui.elements.viewGrid.classList.toggle('active', view === 'grid');
      ui.elements.viewStack.classList.toggle('active', view === 'stack');
      
      // Update ARIA
      ui.elements.viewGrid.setAttribute('aria-selected', view === 'grid');
      ui.elements.viewStack.setAttribute('aria-selected', view === 'stack');
    }
    
    // Show/hide views
    if (ui.elements.toolGrid) {
      ui.elements.toolGrid.style.display = view === 'grid' ? 'grid' : 'none';
    }
    if (ui.elements.toolStacks) {
      ui.elements.toolStacks.style.display = view === 'stack' ? 'grid' : 'none';
    }
    
    // Render stack view if switching to it
    if (view === 'stack') {
      stackRenderer.render();
    }
    
    console.log(`📐 Switched to ${view} view`);
  }
};

// =========================================
// STACK RENDERER (3D Category Stacks)
// =========================================
const stackRenderer = {
  // Category labels and emojis
  categoryConfig: {
  text:  { label: 'Text Tools',  emoji: '📝', color: 'text' },
  image: { label: 'Image Tools', emoji: '🎨', color: 'image' },
  code:  { label: 'Code Tools',  emoji: '💻', color: 'code' },
  audio: { label: 'Audio Tools', emoji: '🎵', color: 'audio' },
  video: { label: 'Video Tools', emoji: '🎬', color: 'video' },
  data:  { label: 'Data Tools',  emoji: '📊', color: 'data' },
  other: { label: 'Other Tools', emoji: '🔧', color: 'other' }
},
  
  // Group tools by category
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
  
  // Render single stack card
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
        <a 
          href="${ui.escapeHtml(tool.link)}" 
          class="card-link" 
          target="_blank" 
          rel="noopener noreferrer"
          data-tool-name="${ui.escapeHtml(tool.title)}"
          onclick="event.stopPropagation()"
        >
          Öffnen →
        </a>
      </div>
    `;
  },
  
  // Render category stack
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
  
  // Render all stacks
  render() {
    if (!ui.elements.toolStacks) return;
    
    const grouped = this.groupByCategory();
    const categories = Object.keys(grouped).sort();
    
    if (categories.length === 0) {
      ui.elements.toolStacks.innerHTML = '<p class="state-text">Keine Tools gefunden</p>';
      return;
    }
    
    // Render each category stack
    const stacksHtml = categories
      .map(category => this.renderCategoryStack(category, grouped[category]))
      .join('');
    
    ui.elements.toolStacks.innerHTML = stacksHtml;
    
    // Attach stack handlers
    this.attachStackHandlers();
    
    console.log(`📚 Rendered ${categories.length} category stacks`);
  },
  
  // Attach click/touch handlers to stacks
  attachStackHandlers() {
    const stackContainers = $$('.stack-container');
    
    stackContainers.forEach(container => {
      const stackCards = container.querySelector('.stack-cards');
      if (!stackCards) return;
      
      // Click/Touch to fan out
      container.addEventListener('click', (e) => {
        // Don't toggle if clicking on a link
        if (e.target.closest('.card-link')) return;
        
        const isFanned = stackCards.classList.contains('fanned');
        
        // Close all other stacks
        $$('.stack-cards').forEach(sc => {
          if (sc !== stackCards) {
            sc.classList.remove('fanned');
          }
        });
        
        // Toggle current stack
        stackCards.classList.toggle('fanned', !isFanned);
        
        console.log(`📇 Stack ${isFanned ? 'closed' : 'opened'}:`, container.dataset.stackId);
      });
    });
    
    // Attach analytics to links
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
    
    // Input handler with debounce
    const handleInput = debounce((e) => {
      const value = sanitizeInput(e.target.value);
      state.searchQuery = value;
      
      // Show/hide clear button
      if (ui.elements.searchClear) {
        ui.elements.searchClear.style.display = value ? 'flex' : 'none';
      }
      
      // Track search
      if (value) {
        analytics.trackSearch(value);
      }
      
      // Re-render
      ui.render();
    }, CONFIG.search.debounceMs);
    
    ui.elements.search.addEventListener('input', handleInput);
    
    // Clear button
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
      console.log('🚀 Initializing Quantum AI Hub...');
      console.log('Config:', CONFIG);
      
      // Cache DOM elements
      ui.cacheElements();
      
      // Setup error handler
      errorHandler.setupRetry();
      
      // Show loading state
      ui.showState('loading');
      
      // Load data with triple fallback
      const rawTools = await dataLoader.load();
      
      if (!rawTools || rawTools.length === 0) {
        throw new Error('No data available from any source');
      }
      
      console.log('📥 Raw tools loaded:', rawTools.length);
      
      // Validate and process tools
      const validation = validator.validateAll(rawTools);
      validator.displayReport(validation);
      
      // Use valid tools only
      state.tools = validation.validTools;
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
      
      // Initialize search
      search.init();
      
      // Initialize view manager
      viewManager.init();

      console.log('✅ App initialized successfully!');
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in init:', error);
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Emergency fallback to defaults
      console.log('🚨 EMERGENCY: Activating fallback to defaults...');
      
      try {
        state.tools = DEFAULT_TOOLS;
        state.filtered = [...state.tools];
        state.loading = false;
        state.error = null; // Clear error
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
        
        // Last resort: show error
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
