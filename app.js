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
    } catch (err) {
        console.error('error listener failed', err);
    }
});

// Wrap fetch to log failing requests
(function() {
    if (!window.fetch) return;
    const _origFetch = window.fetch;
    window.fetch = async function(resource, init) {
        try {
            const res = await _origFetch(resource, init);
            if (!res.ok) {
                console.warn('Fetch non-ok:', {
                    url: String(resource),
                    status: res.status,
                    statusText: res.statusText
                });
            }
            return res;
        } catch (err) {
            try {
                console.error('Fetch failed:', {
                    url: String(resource),
                    error: err
                });
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
                const response = await fetch('./data.json', { signal: controller.signal });
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

        try {
            console.log(`[ui.showState] -> requested state: "${stateName}"`);
        } catch (e) {}

        states.forEach(s => {
            const el = this.elements[s];
            if (el) {
                el.style.display = s === stateName ? 'block' : 'none';
            }
        });

        if (this.elements.toolGrid) {
            const prevInline = this.elements.toolGrid.getAttribute('style') || '';
            try {
                console.log(`[ui.showState] toolGrid previous inline style: "${prevInline}"`);
            } catch (e) {}

            if (stateName === 'grid') {
                this.elements.toolGrid.style.display = 'grid';
                this.elements.toolGrid.style.removeProperty('visibility');
                this.elements.toolGrid.style.removeProperty('opacity');
                try {
                    console.log('[ui.showState] toolGrid set to display: grid');
                } catch (e) {}
            } else {
                this.elements.toolGrid.style.display = 'none';
                try {
                    console.log(`[ui.showState] toolGrid hidden for state "${stateName}"`);
                } catch (e) {}
            }
        } else {
            console.warn('[ui.showState] toolGrid element NOT found in cached elements');
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
        if (this.elements.statsBar) {
            this.elements.statsBar.style.display = 'flex';
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

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    },

    renderCard(tool) {
        const categoryName = tool.category_name || tool.category || 'other';
        const categoryDisplay = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
        const contextTexts = (typeof this.getContextText === 'function')
            ? this.getContextText(tool)
            : ([
                tool.description || '',
                ...(Array.isArray(tool.tags) ? tool.tags.slice(0, 3) : [])
            ].filter(Boolean));

        if (!contextTexts.length) contextTexts.push(tool.description || tool.title || 'Mehr Informationen');

        return `
            <div class="card-square" 
                 data-tool-id="${this.escapeHtml(String(tool.id))}"
                 data-category="${this.escapeHtml(categoryName)}"
                 data-tool-name="${this.escapeHtml(tool.title)}"
                 data-href="${this.escapeHtml(tool.link)}"
                 data-depth="10"
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
                       aria-label="${this.escapeHtml(tool.title)} öffnen"></a>
                </div>
            </div>
        `;
    },

    render() {
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

        if (this.elements.toolGrid) {
            if (!this.elements.toolGrid.classList.contains('tool-grid-squares')) {
                this.elements.toolGrid.classList.add('tool-grid-squares');
            }
            this.elements.toolGrid.innerHTML = state.filtered.map(tool => this.renderCard(tool)).join('');
            this.attachCardHandlers();
        }
    },

// =========================================
// QUANTUM AI HUB v1.0 | app.js
// Zeile 420: attachCardHandlers() - FIX: Temporärer armed-State (300ms)
// =========================================
attachCardHandlers() {
    const grid = this.elements.toolGrid || getElement('#tool-grid');
    if (!grid) return;

    if (grid.clickHandler) {
        grid.removeEventListener('click', grid.clickHandler);
        grid.removeEventListener('keydown', grid.keyHandler);
    }

    grid.clickHandler = (e) => {
        const overlay = e.target.closest('.card-overlay-link');
        const card = e.target.closest('.card-square');

        if (overlay && card) {
            e.preventDefault();
            e.stopPropagation();

            const toolName = card.dataset.toolName || card.getAttribute('data-tool-name') || card.querySelector('.square-title-large')?.textContent || 'Unknown';
            const href = overlay.getAttribute('data-href') || card.getAttribute('data-href') || overlay.getAttribute('href');

            try {
                analytics.trackToolClick(toolName);
            } catch (err) {
                console.warn('Analytics tracking failed', err);
            }

            // FIX: Temporärer armed-State (Highlight 300ms)
            card.classList.add('card-armed');
            setTimeout(() => card.classList.remove('card-armed'), 300);

            if (typeof openToolModal === 'function') {
                try {
                    openToolModal({
                        title: toolName,
                        href: href,
                        description: card.getAttribute('aria-label') || '',
                        cardElement: card
                    });
                } catch (err) {
                    console.error('openToolModal error', err);
                }
            } else {
                // Fallback: Direkt öffnen
                window.open(href, '_blank');
            }
            return;
        }

        if (card && !overlay) {
            e.preventDefault();
            // FIX: Temporärer armed-State (Highlight 300ms)
            card.classList.add('card-armed');
            setTimeout(() => card.classList.remove('card-armed'), 300);

            const toolName = card.dataset.toolName || 'Unknown';
            try {
                analytics.trackToolClick(toolName);
            } catch (err) {}
        }
    };

    grid.keyHandler = (e) => {
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

    grid.addEventListener('click', grid.clickHandler);
    grid.addEventListener('keydown', grid.keyHandler, { passive: false });
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
                try {
                    analytics.trackSearch(value);
                } catch (err) {}
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
        } catch (err) {}

        ui.showState('error');
    },

    setupRetry() {
        if (!ui.elements.retryButton) return;

        ui.elements.retryButton.addEventListener('click', () => {
            console.log('Retrying...');
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

            console.log('Raw tools loaded:', rawTools.length);

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

            console.log('✅ App initialized successfully!');

            try {
                if (!window.appState) {
                    window.appState = state;
                }
                window.dispatchEvent(new Event('quantum:ready'));
            } catch (e) {
                console.debug('app: could not expose global state or dispatch event', e);
            }

        } catch (error) {
            console.error('❌ CRITICAL ERROR in init:', error);
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);

            console.log('🔧 EMERGENCY: Activating fallback to defaults...');

            try {
                state.tools = DEFAULT_TOOLS;
                state.filtered = [...state.tools];
                state.loading = false;
                state.error = null;
                state.dataSource = 'emergency';

                console.log('✅ Emergency: Updating UI...');
                ui.updateStats();
                ui.updateDataSource();
                ui.render();

                console.log('✅ Emergency: Initializing search...');
                search.init();

                console.log('✅ Emergency recovery successful! App running with defaults.');
                console.log('⚠️ Check console errors above to debug the original issue.');

                try {
                    window.dispatchEvent(new Event('quantum:ready'));
                } catch (e) {}

            } catch (recoveryError) {
                console.error('❌ EMERGENCY RECOVERY FAILED:', recoveryError);
                console.error('This should never happen. Something is very wrong.');
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

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.appState = state;
    window.appConfig = CONFIG;
    console.log('Debug mode: window.appState and window.appConfig available');
}

// =========================================
// MODAL SYSTEM
// =========================================

function createToolModal() {
    if (document.getElementById('tool-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'tool-modal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '9999';
    modal.style.background = 'rgba(0,0,0,0.7)';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    modal.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true" 
             style="background:#0f1224;border-radius:14px;padding:24px;width:90%;max-width:500px;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
            <h3 id="tool-modal-title" style="color:var(--primary);margin-bottom:8px;">Tool</h3>
            <p id="tool-modal-desc" style="color:var(--text-dim);margin-bottom:12px;"></p>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
                <a id="tool-modal-open" class="card-link" 
                   style="display:inline-flex;padding:8px 12px;border-radius:8px;background:var(--primary);color:var(--bg-dark);text-decoration:none;">
                   Öffnen
                </a>
                <button id="tool-modal-close" 
                        style="background:transparent;border:1px solid rgba(255,255,255,0.08);padding:8px 12px;border-radius:8px;color:var(--text-secondary);">
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

    if (!document.toolModalEscapeHandlerAttached) {
        const toolModalEscapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeToolModal();
            }
        };
        document.addEventListener('keydown', toolModalEscapeHandler);
        document.toolModalEscapeHandlerAttached = true;
    }
}

function openToolModal(tool) {
    createToolModal();

    const modal = document.getElementById('tool-modal');
    if (!modal) return;

    const titleEl = modal.querySelector('#tool-modal-title');
    const descEl = modal.querySelector('#tool-modal-desc');
    const openLink = modal.querySelector('#tool-modal-open');

    if (titleEl) titleEl.textContent = tool.title || 'Tool';
    if (descEl) descEl.textContent = tool.description || '';
    if (openLink) {
        openLink.href = tool.href || '#';
        openLink.target = '_blank';
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
}

function closeToolModal() {
    const modal = document.getElementById('tool-modal');
    if (!modal) return;

    modal.classList.remove('open');
    modal.style.display = 'none';
}

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'tool-modal-close') {
        closeToolModal();
    }
});
