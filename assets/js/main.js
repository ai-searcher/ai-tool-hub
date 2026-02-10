// ===========================================
// SOFORTIGE THEME-INITIALISIERUNG (OHNE EVENT-LISTENER)
// ===========================================
(function() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'dark');
    
    document.body.classList.add('no-transition');
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(theme === 'light' ? 'light-mode' : 'dark-mode');
    
    setTimeout(() => document.body.classList.remove('no-transition'), 50);
})();

// ===========================================
// MAIN APPLICATION CONTROLLER
// AI Tool Hub - Main Orchestrator
// ===========================================

import {
    loadTools,
    loadCategories,
    loadRankings,
    loadToolStatistics,
    loadMultipleToolVotes,
    saveVote,
    testConnection,
    supabase
} from './supabase.js';

import {
    renderToolGrid,
    renderRanking,
    renderCategoryFilters,
    updateHeroStats,
    showLoadingSpinner,
    hideLoadingSpinner,
    showEmptyState,
    createToolCard
} from './ui.js';

import {
    initAllEvents,
    getState,
    updateState,
    setEventHandlers,
    resetFilters
} from './events.js';

import {
    showNotification,
    debounce,
    formatDate,
    getRandomItems,
    sortByProperty
} from './utils.js';

import {
    UI_CONFIG,
    DEFAULT_CATEGORIES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES
} from './config.js';

// Embedded default tools as fallback
const DEFAULT_TOOLS = [
    {
        id: 'tool_chatgpt',
        title: 'ChatGPT',
        description: 'Ein fortschrittlicher KI-Chatbot von OpenAI.',
        category: 'chat',
        tags: ['chat', 'text', 'openai'],
        rating: 4.8,
        usage_count: 10000,
        vote_count: 500,
        vote_average: 4.8,
        is_free: true,
        is_featured: true,
        icon: 'fas fa-comment',
        link: 'https://chat.openai.com',
        created_at: '2022-11-30T00:00:00Z',
        updated_at: '2023-10-01T00:00:00Z'
    },
    {
        id: 'tool_midjourney',
        title: 'Midjourney',
        description: 'KI-gestützte Bildgenerierung über Discord.',
        category: 'image',
        tags: ['image', 'art', 'generation'],
        rating: 4.6,
        usage_count: 8000,
        vote_count: 420,
        vote_average: 4.6,
        is_free: false,
        is_featured: true,
        icon: 'fas fa-image',
        link: 'https://www.midjourney.com',
        created_at: '2022-07-01T00:00:00Z',
        updated_at: '2023-10-01T00:00:00Z'
    },
    {
        id: 'tool_github_copilot',
        title: 'GitHub Copilot',
        description: 'KI-Paarprogrammierer für Entwickler.',
        category: 'code',
        tags: ['code', 'development', 'ai'],
        rating: 4.7,
        usage_count: 12000,
        vote_count: 680,
        vote_average: 4.7,
        is_free: false,
        is_featured: true,
        icon: 'fas fa-code',
        link: 'https://github.com/features/copilot',
        created_at: '2021-10-01T00:00:00Z',
        updated_at: '2023-10-01T00:00:00Z'
    }
];

// Global application state
let appState = {
    tools: [],
    filteredTools: [],
    categories: [],
    rankings: [],
    votes: {},
    isLoading: true,
    currentFilter: 'all',
    currentSearch: '',
    currentView: 'grid',
    currentSort: 'newest',
    totalStats: {
        total: 0,
        totalUpvotes: 0,
        free: 0
    }
};

// ===========================================
// APPLICATION LIFECYCLE MANAGEMENT
// ===========================================

// Track initialization state
let appInitialized = false;
let supabaseSubscriptions = null;
const directoryModalListeners = new Map();
let filterBarScrollHandler = null;
let escapeKeyHandler = null;

/**
 * Cleanup-Funktion für App-Lifecycle
 */
function cleanupApp() {
    console.log('Cleanup App Resources...');
    
    // Supabase Subscriptions cleanup
    if (supabaseSubscriptions) {
        try {
            if (supabaseSubscriptions.tools && supabaseSubscriptions.tools.unsubscribe) {
                supabaseSubscriptions.tools.unsubscribe();
            }
            if (supabaseSubscriptions.votes && supabaseSubscriptions.votes.unsubscribe) {
                supabaseSubscriptions.votes.unsubscribe();
            }
        } catch (error) {
            console.warn('Error during supabase subscription cleanup:', error);
        }
        supabaseSubscriptions = null;
    }
    
    // Directory Modal Listeners cleanup
    for (const [element, listeners] of directoryModalListeners.entries()) {
         if (!Array.isArray(listeners)) continue;
         listeners.forEach(({ type, handler }) => {
             if (element && handler) {
                 element.removeEventListener(type, handler);
             }
         });
    }
    directoryModalListeners.clear();
    
    // Filter Bar Scroll Listener cleanup
    if (filterBarScrollHandler) {
        window.removeEventListener('scroll', filterBarScrollHandler);
        filterBarScrollHandler = null;
    }
    
    // Escape Key Listener cleanup
    if (escapeKeyHandler) {
        document.removeEventListener('keydown', escapeKeyHandler);
        escapeKeyHandler = null;
    }
    
    appInitialized = false;
    console.log('App cleanup completed');
}

// ===========================================
// DIRECTORY MODAL VARIABLEN
// ===========================================

// Directory Modal State
let directoryModalState = {
    activeCategory: 'all',
    lastFocusedElement: null
};

// ===========================================
// DATA LOADING & INITIALIZATION
// ===========================================

/**
 * Initializes the application by loading all data
 */
async function initApp() {
    console.log('AI Tool Hub initializing...');
    
    // Cleanup bei Re-Initialization
    if (appInitialized) {
        cleanupApp();
    }
    
    try {
        // Kurze Pause für sichere Render-Initialisierung
        await new Promise(resolve => setTimeout(resolve, 100));
        
        showLoadingSpinner();
        
        // Test database connection (non-blocking)
        let isConnected = false;
        try {
            isConnected = await testConnection();
            console.log(`Database connection: ${isConnected ? 'OK' : 'Failed'}`);
        } catch (dbError) {
            console.warn('Database connection test failed, using local data:', dbError);
        }
        
        // Lade zuerst die Tools (wichtig, weil andere Schritte Tools brauchen)
        await loadAllTools();

        // Danach parallel die abhängigen Schritte
        await Promise.allSettled([
            loadCategoriesData(),
            loadToolStats(),
            initializeVotes()
        ]);
        
        //Calculate total upvotes after all data is loaded
        calculateTotalUpvotes();
        
        // Calculate rankings based on loaded data
        calculateRankings();
        
        // Initialize event listeners FIRST (WICHTIG!)
        initializeEventHandlers();
        
        // Update UI with loaded data SECOND
        updateUI();

        
        // Directory Modal Event Listeners hinzufügen
        initDirectoryModalEvents();
        
        // Filter-Bar Auto-Compact initialisieren
        initFilterBarAutoCompact();
        
        // Holographic Stats Animation starten
        if (window.updateHeroStatsFromData) {
            window.updateHeroStatsFromData({
                total: appState.totalStats.total,
                freeCount: appState.totalStats.free,
                pulse: appState.totalStats.totalUpvotes
            });
        }
        
        // Hide loading spinner
        hideLoadingSpinner();
        
        // Mark as initialized
        appInitialized = true;
        
                console.log('✅ Application initialized successfully');
        console.log(`📊 Loaded ${appState.tools.length} tools`);
        console.log(`🔍 Filtered tools: ${appState.filteredTools.length}`);
        
        // Notification NUR wenn Tools geladen wurden
        if (appState.tools.length > 0) {
            showNotification('Anwendung erfolgreich geladen!', 'success');
        } else {
            console.error('❌ No tools loaded!');
        }
 
        
        // GA4 Tracking Event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'app_load', {
                'event_category': 'engagement',
                'event_label': 'init_complete',
                'value': appState.tools.length
            });
        }
        
    } catch (error) {
        console.error('Error initializing app:', error);
        hideLoadingSpinner();
        showEmptyState('Fehler beim Laden der Daten. Bitte versuche es später erneut.');
        showNotification(ERROR_MESSAGES.LOADING_ERROR, 'error');
        
        // GA4 Tracking Event for error
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                'description': 'app_initialization_failed',
                'fatal': false
            });
        }
    }
}

/**
 * Loads tools from database and combines with local JSON data
 */
async function loadAllTools() {
    console.log('🔄 Loading tools...');
    
    // VERSUCH 1: Supabase Datenbank
    try {
        console.log('Trying Supabase database...');
        const dbTools = await loadTools();
        
        if (dbTools && Array.isArray(dbTools) && dbTools.length > 0) {
            console.log(`✅ Loaded ${dbTools.length} tools from database`);
            appState.tools = dbTools;
            appState.filteredTools = [...dbTools];
            calculateTotalUpvotes();
            return; // Erfolgreich geladen
        }
        
        console.log('⚠️ Database returned no tools');
    } catch (dbError) {
        console.warn('⚠️ Database error:', dbError.message);
    }
    
    // VERSUCH 2: Lokale JSON-Datei
    try {
        console.log('Trying local JSON file...');
        const response = await fetch('./data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        
        // JSON kann zwei Formate haben:
        // 1. Direkt ein Array: [{ id: "...", title: "..." }, ...]
        // 2. Objekt mit tools Property: { tools: [...] }
        let toolsArray = [];
        if (Array.isArray(jsonData)) {
            toolsArray = jsonData;
        } else if (jsonData && Array.isArray(jsonData.tools)) {
            toolsArray = jsonData.tools;
        }
        
        if (toolsArray.length > 0) {
            console.log(`✅ Loaded ${toolsArray.length} tools from JSON`);
            
            // Transformiere JSON-Daten in unser Format
            const transformedTools = toolsArray.map(tool => ({
                id: tool.id || generateId(),
                title: tool.title || 'Unnamed Tool',
                description: tool.description || 'No description available.',
                category: tool.category || 'uncategorized',
                tags: Array.isArray(tool.tags) ? tool.tags : [],
                rating: Number(tool.rating) || 4.0,
                usage_count: Number(tool.usage_count) || 0,
                vote_count: Number(tool.vote_count) || 0,
                vote_average: Number(tool.vote_average || tool.rating) || 4.0,
                is_free: Boolean(tool.is_free),
                is_featured: Boolean(tool.is_featured),
                icon: tool.icon || 'fas fa-robot',
                link: tool.link || '#',
                created_at: tool.created_at || new Date().toISOString(),
                updated_at: tool.updated_at || new Date().toISOString()
            }));
            
            appState.tools = transformedTools;
            appState.filteredTools = [...transformedTools];
            calculateTotalUpvotes();
            return; // Erfolgreich geladen
        }
        
        console.log('⚠️ JSON file contained no tools');
    } catch (jsonError) {
        console.warn('⚠️ JSON error:', jsonError.message);
    }
    
    // VERSUCH 3: Eingebaute Fallback-Tools
    console.log('⚠️ Using embedded fallback tools (3 default tools)');
    appState.tools = DEFAULT_TOOLS;
    appState.filteredTools = [...DEFAULT_TOOLS];
    calculateTotalUpvotes();
}


/**
 * Loads categories from database or uses defaults
 */
async function loadCategoriesData() {
    try {
        const dbCategories = await loadCategories();
        
        if (dbCategories && dbCategories.length > 0) {
            appState.categories = dbCategories;
        } else {
            // Use default categories
            appState.categories = DEFAULT_CATEGORIES.map(cat => ({
                id: cat.id,
                name: cat.name,
                icon: cat.icon,
                count: appState.tools.filter(t => 
                    cat.id === 'all' || t.category === cat.id
                ).length
            }));
        }
        
        // Update category counts
        updateCategoryCounts();
        
    } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to default categories
        appState.categories = DEFAULT_CATEGORIES.map(cat => ({
            id: cat.id,
            name: cat.name,
            icon: cat.icon,
            count: cat.id === 'all' ? appState.tools.length : 
                   appState.tools.filter(t => t.category === cat.id).length
        }));
    }
}

/**
 * Calculates total upvotes across all tools
 * Jetzt: Anzahl aller abgegebenen Stimmen (vote_count pro Tool summiert)
 */
function calculateTotalUpvotes() {
    const totalVotes = appState.tools.reduce((sum, tool) => {
        return sum + (tool.vote_count || 0);
    }, 0);
    
    appState.totalStats.totalUpvotes = totalVotes;
    console.log(`Total votes calculated: ${totalVotes}`);
}

/**
 * Loads tool statistics for hero section
 */
async function loadToolStats() {
    try {
        const stats = await loadToolStatistics();
        
        // Set total and free from database stats if available
        if (stats && stats.total !== undefined) {
            appState.totalStats.total = stats.total;
        } else {
            appState.totalStats.total = appState.tools.length;
        }
        
        if (stats && stats.free !== undefined) {
            appState.totalStats.free = stats.free;
        } else {
            appState.totalStats.free = appState.tools.filter(tool => tool.is_free).length;
        }
        
        // Always recalculate upvotes from tools data
        calculateTotalUpvotes();
        
    } catch (error) {
        console.error('Error loading tool stats:', error);
        // Calculate all stats from local data
        appState.totalStats.total = appState.tools.length;
        appState.totalStats.free = appState.tools.filter(tool => tool.is_free).length;
        calculateTotalUpvotes();
    }
}

/**
 * Initializes vote data for all tools
 */
async function initializeVotes() {
    try {
        const toolIds = appState.tools.map(tool => tool.id);
        const votesData = await loadMultipleToolVotes(toolIds);
        appState.votes = votesData;
        
        // Update tools with vote data
        appState.tools.forEach(tool => {
            if (votesData[tool.id]) {
                tool.vote_count = votesData[tool.id].count || 0;
                tool.vote_average = votesData[tool.id].average || tool.rating;
            }
        });
        
        // Recalculate total upvotes after vote data is loaded
        calculateTotalUpvotes();
        
    } catch (error) {
        console.error('Error initializing votes:', error);
        // Initialize empty votes object
        appState.votes = {};
        // Still calculate upvotes from existing tool data
        calculateTotalUpvotes();
    }
}

// ===========================================
// DIRECTORY MODAL FUNKTIONEN
// ===========================================

/**
 * Initialisiert Event Listener für das Directory Modal
 */
function initDirectoryModalEvents() {
    console.log('Initialisiere Directory Modal Events...');
    
    // 1. Hero-Stat-Kachel für "aktive Tools" klickbar machen
    const heroStatsContainer = document.querySelector('.hero-stats');
    if (heroStatsContainer) {
        const totalToolsCard = document.getElementById('card-active');
        if (totalToolsCard) {
            // Entferne existierende Listener zuerst
            removeDirectoryModalListener(totalToolsCard, 'click');
            removeDirectoryModalListener(totalToolsCard, 'keydown');
            
            totalToolsCard.style.cursor = 'pointer';
            totalToolsCard.setAttribute('role', 'button');
            totalToolsCard.setAttribute('tabindex', '0');
            totalToolsCard.setAttribute('aria-label', 'Tool-Verzeichnis öffnen');
            
            const clickHandler = openDirectoryModal;
            const keyHandler = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDirectoryModal();
                }
            };
            
            addDirectoryModalListener(totalToolsCard, 'click', clickHandler);
            addDirectoryModalListener(totalToolsCard, 'keydown', keyHandler);
            
            console.log('Hero-Stat-Kachel für Directory Modal klickbar gemacht');
        }
    }
    
    // 2. Modal Close Event Listener
    const closeButton = document.getElementById('directory-close');
    if (closeButton) {
        removeDirectoryModalListener(closeButton, 'click');
        const clickHandler = closeDirectoryModal;
        addDirectoryModalListener(closeButton, 'click', clickHandler);
    }
    
    // 3. Overlay Click Event
    const modalOverlay = document.querySelector('#directory-modal .modal-overlay');
    if (modalOverlay) {
        removeDirectoryModalListener(modalOverlay, 'click');
        const clickHandler = (e) => {
            if (e.target === modalOverlay) {
                closeDirectoryModal();
            }
        };
        addDirectoryModalListener(modalOverlay, 'click', clickHandler);
    }
    
    // 4. Escape Key Event (global, nur einmal registrieren)
    if (!escapeKeyHandler) {
        escapeKeyHandler = (e) => {
            const modal = document.getElementById('directory-modal');
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                closeDirectoryModal();
            }
        };
        document.addEventListener('keydown', escapeKeyHandler);
    }
    
    console.log('Directory Modal Events initialisiert');
}

// Map initialisieren: const directoryModalListeners = new Map();
function addDirectoryModalListener(element, type, handler) {
    if (!element || !handler) return;

    // ensure an array exists
    let arr = directoryModalListeners.get(element);
    if (!arr) {
        arr = [];
        directoryModalListeners.set(element, arr);
    }

    // add listener
    element.addEventListener(type, handler);
    const key = `${type}-${Math.random().toString(36).substr(2,9)}`;
    arr.push({ type, handler, key });
}

function removeDirectoryModalListener(element, type) {
    if (!element) return;
    const arr = directoryModalListeners.get(element);
    if (!arr || arr.length === 0) return;

    // find matching entries
    for (let i = arr.length - 1; i >= 0; i--) {
        const entry = arr[i];
        if (!type || entry.type === type) {
            element.removeEventListener(entry.type, entry.handler);
            arr.splice(i, 1);
        }
    }

    if (arr.length === 0) directoryModalListeners.delete(element);
}

/**
 * Öffnet das Directory Modal
 */
function openDirectoryModal() {
    console.log('Öffne Directory Modal...');
    
    // Speichere das zuletzt fokussierte Element
    directoryModalState.lastFocusedElement = document.activeElement;
    
    const modal = document.getElementById('directory-modal');
    if (!modal) {
        console.error('Directory Modal nicht gefunden');
        return;
    }
    
    // Modal aktivieren
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    
    // ARIA Attribute setzen
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.modal-container').setAttribute('aria-modal', 'true');
    
    // Tabs und Liste rendern
    renderDirectoryTabs();
    renderDirectoryList('all');
    
    // Fokus auf Close-Button setzen (für Accessibility)
    const closeButton = document.getElementById('directory-close');
    if (closeButton) {
        setTimeout(() => {
            closeButton.focus();
        }, 100);
    }
    
    console.log('Directory Modal geöffnet');
    
    // GA4 Tracking Event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'directory_open', {
            'event_category': 'engagement',
            'event_label': 'modal_opened'
        });
    }
}

/**
 * Schließt das Directory Modal
 */
function closeDirectoryModal() {
    console.log('Schließe Directory Modal...');
    
    const modal = document.getElementById('directory-modal');
    if (!modal) return;
    
    // Modal deaktivieren
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    
    // ARIA Attribute zurücksetzen
    modal.setAttribute('aria-hidden', 'true');
    modal.querySelector('.modal-container').setAttribute('aria-modal', 'false');
    
    // Fokus zurück zum ursprünglichen Element
    if (directoryModalState.lastFocusedElement) {
        setTimeout(() => {
            directoryModalState.lastFocusedElement.focus();
        }, 100);
    }
    
    console.log('Directory Modal geschlossen');
}

/**
 * Rendert die Tabs für Kategorien im Directory Modal
 */
function renderDirectoryTabs() {
    const tabsContainer = document.getElementById('directory-tabs');
    if (!tabsContainer) return;
    
    // Tab für "Alle"
    const allTab = document.createElement('button');
    allTab.className = 'directory-tab active';
    allTab.setAttribute('data-category', 'all');
    allTab.setAttribute('aria-selected', 'true');
    allTab.setAttribute('role', 'tab');
    allTab.textContent = 'Alle';
    
    removeDirectoryModalListener(allTab, 'click');
    const clickHandler = () => {
        setActiveTab('all');
        renderDirectoryList('all');
    };
    addDirectoryModalListener(allTab, 'click', clickHandler);
    
    tabsContainer.innerHTML = '';
    tabsContainer.appendChild(allTab);
    
    // Tabs für jede Kategorie
    appState.categories.forEach(category => {
        if (category.id === 'all') return;
        
        const tab = document.createElement('button');
        tab.className = 'directory-tab';
        tab.setAttribute('data-category', category.id);
        tab.setAttribute('aria-selected', 'false');
        tab.setAttribute('role', 'tab');
        tab.textContent = `${category.name} (${category.count})`;
        
        const clickHandler = () => {
            setActiveTab(category.id);
            renderDirectoryList(category.id);
        };
        addDirectoryModalListener(tab, 'click', clickHandler);
        
        tabsContainer.appendChild(tab);
    });
    
    console.log(`${appState.categories.length} Kategorie-Tabs gerendert`);
}

/**
 * Setzt den aktiven Tab im Directory Modal
 */
function setActiveTab(categoryId) {
    const tabs = document.querySelectorAll('.directory-tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-category') === categoryId) {
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
        } else {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        }
    });
    directoryModalState.activeCategory = categoryId;
}

/**
 * Gibt Tools nach Kategorie zurück
 */
function getToolsByCategory(categoryId) {
    if (categoryId === 'all') {
        return appState.tools;
    }
    return appState.tools.filter(tool => tool.category === categoryId);
}

/**
 * Rendert die Tool-Liste für die aktive Kategorie
 */
function renderDirectoryList(categoryId) {
    const listContainer = document.getElementById('directory-list');
    if (!listContainer) return;
    
    const tools = getToolsByCategory(categoryId);
    const categoryName = categoryId === 'all' ? 'Alle Tools' :
        appState.categories.find(c => c.id === categoryId)?.name || categoryId;
    
    // Titel aktualisieren
    const modalTitle = document.getElementById('directory-modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Tool-Verzeichnis: ${categoryName} (${tools.length})`;
    }
    
    // Liste rendern
    listContainer.innerHTML = '';
    
    if (tools.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'directory-empty';
        emptyMessage.innerHTML = `<i class="fas fa-search"></i> <p>Keine Tools in dieser Kategorie gefunden.</p>`;
        listContainer.appendChild(emptyMessage);
        return;
    }
    
    // Begrenze auf 12 Tools für bessere Performance
    const displayTools = tools.slice(0, 12);
    
    displayTools.forEach(tool => {
        const toolItem = document.createElement('div');
        toolItem.className = 'directory-tool-item';
        toolItem.setAttribute('data-tool-id', tool.id);
        
        // Kürze Beschreibung auf max. 90 Zeichen
        const desc = tool.description || '';
        const shortDescription = desc.length > 90 
            ? desc.substring(0, 90) + '...' 
            : desc;
        
        toolItem.innerHTML = `
            <div class="directory-tool-info">
                <h3 class="directory-tool-title">${tool.title}</h3>
                <p class="directory-tool-description">${shortDescription}</p>
            </div>
            <button class="btn btn-primary directory-tool-jump" data-tool-id="${tool.id}">
                <i class="fas fa-arrow-right"></i>
                Zum Tool
            </button>
        `;
        
        // Event Listener für den "Zum Tool" Button
        const jumpButton = toolItem.querySelector('.directory-tool-jump');
        if (jumpButton) {
            const clickHandler = () => handleToolJump(tool.id);
            addDirectoryModalListener(jumpButton, 'click', clickHandler);
        }
        
        listContainer.appendChild(toolItem);
    });
    
    // "Mehr anzeigen" Button, wenn es mehr als 12 Tools gibt
    if (tools.length > 12) {
        const showMoreButton = document.createElement('button');
        showMoreButton.className = 'btn btn-secondary directory-show-more';
        showMoreButton.innerHTML = `<i class="fas fa-chevron-down"></i> Mehr anzeigen (${tools.length - 12} weitere)`;
        
        const clickHandler = () => {
            const remainingTools = tools.slice(12);
            remainingTools.forEach(tool => {
                const toolItem = document.createElement('div');
                toolItem.className = 'directory-tool-item';
                toolItem.setAttribute('data-tool-id', tool.id);
                
                const desc = tool.description || '';
                const shortDescription = desc.length > 90 
                    ? desc.substring(0, 90) + '...' 
                    : desc;
                
                toolItem.innerHTML = `
                    <div class="directory-tool-info">
                        <h3 class="directory-tool-title">${tool.title}</h3>
                        <p class="directory-tool-description">${shortDescription}</p>
                    </div>
                    <button class="btn btn-primary directory-tool-jump" data-tool-id="${tool.id}">
                        <i class="fas fa-arrow-right"></i>
                        Zum Tool
                    </button>
                `;
                
                const jumpButton = toolItem.querySelector('.directory-tool-jump');
                if (jumpButton) {
                    const clickHandler = () => handleToolJump(tool.id);
                    addDirectoryModalListener(jumpButton, 'click', clickHandler);
                }
                
                listContainer.appendChild(toolItem);
            });
            
            showMoreButton.remove();
        };
        
        addDirectoryModalListener(showMoreButton, 'click', clickHandler);
        listContainer.appendChild(showMoreButton);
    }
    
    console.log(`${displayTools.length} Tools in Directory Liste gerendert (${categoryId})`);
}

/**
 * Springt zu einer Tool-Card und highlightet sie
 */
function handleToolJump(toolId) {
    console.log(`Springe zu Tool: ${toolId}`);
    
    // Modal schließen
    closeDirectoryModal();
    
    // Prüfe, ob Tool-Card im aktuellen Filter sichtbar ist
    const toolCard = document.querySelector(`.tool-card[data-id="${toolId}"]`);
    const isToolInCurrentFilter = appState.filteredTools.some(tool => tool.id === toolId);
    
    if (!isToolInCurrentFilter) {
        // Tool ist nicht sichtbar - Filter zurücksetzen
        console.log('Tool nicht sichtbar, setze Filter zurück...');
        
        appState.currentFilter = 'all';
        appState.currentSearch = '';
        
        // Such-Input zurücksetzen
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Filter anwenden und UI aktualisieren
        filterTools();
        updateUI();
        
        // Warte auf UI Update, dann scroll und highlight
        setTimeout(() => {
            scrollToAndHighlightTool(toolId);
        }, 200);
        
    } else if (toolCard) {
        // Tool ist sichtbar - direkt scrollen und highlighten
        scrollToAndHighlightTool(toolId);
    } else {
        // Tool-Card existiert nicht im DOM, aber ist im Filter
        // Warte kurz und versuche es erneut
        setTimeout(() => {
            scrollToAndHighlightTool(toolId);
        }, 100);
    }
    
    // GA4 Tracking Event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'directory_jump', {
            'event_category': 'engagement',
            'event_label': 'tool_navigation',
            'value': 1
        });
    }
}

/**
 * Scrollt zu einer Tool-Card und highlightet sie
 */
function scrollToAndHighlightTool(toolId) {
    const toolCard = document.querySelector(`.tool-card[data-id="${toolId}"]`);
    
    if (!toolCard) {
        console.error(`Tool-Card mit ID ${toolId} nicht gefunden`);
        showNotification('Tool konnte nicht gefunden werden', 'error');
        return;
    }
    
    console.log(`Scrolle zu Tool-Card: ${toolId}`);
    
    // Sanft zur Karte scrollen
    toolCard.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
    
    // Highlight-Effekt hinzufügen
    toolCard.classList.add('tool-highlight');
    
    // Highlight nach 1600ms entfernen
    setTimeout(() => {
        toolCard.classList.remove('tool-highlight');
    }, 1600);
}

// ===========================================
// DATA PROCESSING & FILTERING
// ===========================================

/**
 * Filters tools based on current filter and search
 */
function filterTools() {
    let filtered = [...appState.tools];
    
    // Apply category filter
    if (appState.currentFilter !== 'all') {
        filtered = filtered.filter(tool => 
            tool.category === appState.currentFilter
        );
    }
    
    // Apply search filter
    if (appState.currentSearch.trim() !== '') {
        const searchTerm = appState.currentSearch.toLowerCase();
        filtered = filtered.filter(tool => {
            const title = (tool.title || '').toLowerCase();
            const description = (tool.description || '').toLowerCase();
            const tags = Array.isArray(tool.tags) ? tool.tags.map(tag => (tag || '').toLowerCase()) : [];
            
            // Simple fuzzy search (partial matches)
            return title.includes(searchTerm) ||
                   description.includes(searchTerm) ||
                   tags.some(tag => tag.includes(searchTerm));
        });
    }
    
    // Apply sorting
    filtered = sortTools(filtered, appState.currentSort);
    
    appState.filteredTools = filtered;
}

/**
 * Sorts tools based on selected sort option
 */
function sortTools(tools, sortBy) {
    const sorted = [...tools];
    
    switch (sortBy) {
        case 'newest':
            return sorted.sort((a, b) => 
                new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
        
        case 'rating':
            return sorted.sort((a, b) => 
                (b.vote_average || b.rating || 0) - (a.vote_average || a.rating || 0)
            );
        
        case 'name':
            return sorted.sort((a, b) => 
                (a.title || '').localeCompare(b.title || '')
            );
        
        case 'popular':
            return sorted.sort((a, b) => 
                (b.usage_count || 0) - (a.usage_count || 0)
            );
        
        default:
            return sorted;
    }
}

/**
 * Updates category counts based on filtered tools
 */
function updateCategoryCounts() {
    appState.categories = appState.categories.map(category => {
        if (category.id === 'all') {
            return {
                ...category,
                count: appState.tools.length
            };
        }
        
        const count = appState.tools.filter(tool => 
            tool.category === category.id
        ).length;
        
        return {
            ...category,
            count
        };
    });
}

/**
 * Calculates rankings based on tool ratings and usage
 */
function calculateRankings() {
    // Calculate score for each tool (weighted average of rating and usage)
    const toolsWithScore = appState.tools.map(tool => {
        const ratingScore = (tool.vote_average || tool.rating || 4) * 20; // Convert to 0-100 scale
        const usageScore = Math.min(100, (tool.usage_count || 0) / 10); // Usage contributes up to 100
        const totalScore = (ratingScore * 0.7) + (usageScore * 0.3); // 70% rating, 30% usage
        
        return {
            ...tool,
            score: totalScore
        };
    });
    
    // Sort by score and take top 5
    const sorted = toolsWithScore.sort((a, b) => (b.score || 0) - (a.score || 0));
    appState.rankings = sorted.slice(0, 5);
}

// ===========================================
// UI UPDATES
// ===========================================

/**
 * Updates all UI components with current state
 */
function updateUI() {
    // Update hero statistics
    updateHeroStats(appState.totalStats);
    
    // Update category filters
    renderCategoryFilters(appState.categories);
    
    // Update active filter button
    updateActiveFilter();
    
    // Update tool grid
    if (appState.filteredTools.length === 0) {
        showEmptyState();
    } else {
        renderToolGrid(appState.filteredTools, appState.currentView);
        
        // Update vote counts on tool cards
        updateToolVoteCounts();
    }
    
    // Update ranking
    renderRanking(appState.rankings);
    
    // Update view mode
    updateViewMode();
}

/**
 * Updates vote counts on rendered tool cards
 */
function updateToolVoteCounts() {
    appState.filteredTools.forEach(tool => {
        const voteBtn = document.querySelector(`.tool-card[data-id="${tool.id}"] .vote-btn`);
        if (voteBtn) {
            const voteCountElement = voteBtn.querySelector('.vote-count');
            if (voteCountElement) {
                voteCountElement.textContent = tool.vote_count || 0;
            }
        }
    });
}

/**
 * Updates active filter button state
 */
function updateActiveFilter() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === appState.currentFilter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Updates view mode
 */
function updateViewMode() {
    const viewToggle = document.getElementById('view-toggle');
    const toolGrid = document.getElementById('tool-grid');
    
    if (viewToggle && toolGrid) {
        if (appState.currentView === 'list') {
            viewToggle.classList.add('list-view');
            toolGrid.classList.add('list-view');
        } else {
            viewToggle.classList.remove('list-view');
            toolGrid.classList.remove('list-view');
        }
    }
}

// ===========================================
// AUTO-COMPACT-ON-SCROLL FUNKTIONALITÄT
// ===========================================

/**
 * Initialisiert automatisches Kompakt-Modus für Filterbar beim Scrollen
 * Fügt 'compact' Klasse ab 80px Scroll hinzu
 */
function initFilterBarAutoCompact() {
    const filterBar = document.getElementById('filter-bar');
    if (!filterBar) return;
    
    // Entferne existierenden Listener
    if (filterBarScrollHandler) {
        window.removeEventListener('scroll', filterBarScrollHandler);
        filterBarScrollHandler = null;
    }
    
    let ticking = false;
    
    filterBarScrollHandler = () => {
        if (ticking) return;
        ticking = true;
        
        window.requestAnimationFrame(() => {
            const shouldCompact = window.scrollY > 80;
            filterBar.classList.toggle('compact', shouldCompact);
            ticking = false;
        });
    };
    
    window.addEventListener('scroll', filterBarScrollHandler, { passive: true });
    filterBarScrollHandler(); // Initial state
}

// ===========================================
// EVENT HANDLERS
// ===========================================

/**
 * Initializes all event handlers
 */
function initializeEventHandlers() {
    // Create debounced search handler
    const debouncedSearch = debounce(handleSearch, 300);
    
    setEventHandlers({
        handleSearch: debouncedSearch,
        handleFilter: handleFilter,
        handleVoteUpdate: handleVoteUpdate,
        handleViewChange: handleViewChange,
        handleSort: handleSort,
        handleRankingRefresh: handleRankingRefresh,
        handleReset: handleReset
    });
    
    initAllEvents();
}

/**
 * Handles search input
 */
function handleSearch(searchTerm) {
    appState.currentSearch = searchTerm;
    filterTools();
    updateUI();
    
    // Show notification if no results
    if (appState.filteredTools.length === 0 && searchTerm.trim() !== '') {
        showNotification('Keine Ergebnisse gefunden', 'info');
    }
    
    // GA4 Tracking Event
    if (typeof gtag !== 'undefined' && searchTerm.trim() !== '') {
        gtag('event', 'search', {
            'search_term': searchTerm,
            'event_category': 'engagement',
            'event_label': 'tool_search'
        });
    }
}

/**
 * Handles category filter selection
 */
function handleFilter(filterId) {
    appState.currentFilter = filterId;
    filterTools();
    updateUI();
    
    // Show notification if no results
    if (appState.filteredTools.length === 0 && filterId !== 'all') {
        showNotification('Keine Tools in dieser Kategorie', 'info');
    }
    
    // GA4 Tracking Event
    if (typeof gtag !== 'undefined' && filterId !== 'all') {
        gtag('event', 'filter', {
            'filter_category': filterId,
            'event_category': 'engagement',
            'event_label': 'category_filter'
        });
    }
}

/**
 * Handles vote updates - Korrigierte Logik für 1-5 Bewertungen
 */
async function handleVoteUpdate(toolId, voteData) {
    try {
        // Update local state basierend auf vote_value (1-5)
        const toolIndex = appState.tools.findIndex(t => t.id === toolId);
        if (toolIndex !== -1) {
            const tool = appState.tools[toolIndex];
            const currentCount = Number(tool.vote_count || 0);
            const currentAverage = Number(tool.vote_average || tool.rating || 4);

            // Korrekte Berechnung für neue Bewertung (1-5)
            // Neuer Durchschnitt = (Alter Durchschnitt * Anzahl + neue Bewertung) / (Anzahl + 1)
            const newCount = currentCount + 1;
            const newAverageRaw = ((currentAverage * currentCount) + Number(voteData.vote_value)) / newCount;
            const newAverage = Math.round(newAverageRaw * 10) / 10; // 1 Dezimalstelle

            // Update tool data
            appState.tools[toolIndex].vote_count = newCount;
            appState.tools[toolIndex].vote_average = newAverage;

            // Update filtered tools (sofern vorhanden)
            const filteredIndex = appState.filteredTools.findIndex(t => t.id === toolId);
            if (filteredIndex !== -1) {
                appState.filteredTools[filteredIndex] = { ...appState.tools[toolIndex] };
            }

            // Recalculate total votes (Anzahl aller Stimmen)
            calculateTotalUpvotes();

            // Recalculate rankings
            calculateRankings();

            // Update UI
            updateUI();

            // Update hero stats animation with new vote count
            if (window.updateHeroStatsFromData) {
                window.updateHeroStatsFromData({
                    total: appState.totalStats.total,
                    freeCount: appState.totalStats.free,
                    pulse: appState.totalStats.totalUpvotes
                });
            }

            // GA4 Tracking Event
            if (typeof gtag !== 'undefined') {
                gtag('event', 'vote', {
                    'event_category': 'engagement',
                    'event_label': 'tool_vote',
                    'value': Number(voteData.vote_value)
                });
            }
        }

    } catch (error) {
        console.error('Error updating vote in UI:', error);
    }
}

/**
 * Handles view mode changes (grid/list)
 */
function handleViewChange(viewMode) {
    appState.currentView = viewMode;
    updateViewMode();
    
    // Re-render tool grid with new view mode
    if (appState.filteredTools.length > 0) {
        renderToolGrid(appState.filteredTools, viewMode);
        updateToolVoteCounts();
    }
    
    // GA4 Tracking Event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'view_change', {
            'view_mode': viewMode,
            'event_category': 'engagement',
            'event_label': 'view_toggle'
        });
    }
}

/**
 * Handles sort changes
 */
function handleSort(sortBy) {
    appState.currentSort = sortBy;
    filterTools();
    updateUI();
    
    // GA4 Tracking Event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'sort', {
            'sort_by': sortBy,
            'event_category': 'engagement',
            'event_label': 'tool_sort'
        });
    }
}

/**
 * Handles ranking refresh
 */
async function handleRankingRefresh() {
    try {
        showNotification('Ranking wird aktualisiert...', 'info');
        
        // Recalculate rankings
        calculateRankings();
        
        // Update UI
        renderRanking(appState.rankings);
        
        showNotification('Ranking aktualisiert!', 'success');
        
        // GA4 Tracking Event
        if (typeof gtag !== 'undefined') {
            gtag('event', 'refresh', {
                'event_category': 'engagement',
                'event_label': 'ranking_refresh'
            });
        }
        
    } catch (error) {
        console.error('Error refreshing ranking:', error);
        showNotification('Fehler beim Aktualisieren des Rankings', 'error');
    }
}

/**
 * Handles reset of all filters
 */
function handleReset() {
    appState.currentFilter = 'all';
    appState.currentSearch = '';
    appState.currentSort = 'newest';
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    filterTools();
    updateUI();
    
    showNotification('Alle Filter zurückgesetzt', 'info');
    
    // GA4 Tracking Event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'reset', {
            'event_category': 'engagement',
            'event_label': 'filter_reset'
        });
    }
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Generates a unique ID for tools
 */
function generateId() {
    return 'tool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Gets current application state (for debugging)
 */
function getAppState() {
    return { ...appState };
}

// ===========================================
// REAL-TIME UPDATES (OPTIONAL)
// ===========================================

/**
 * Initializes real-time updates from Supabase
 */
function initRealtimeUpdates() {
    try {
        // Prüfe ob Supabase Client verfügbar ist
        if (!supabase || typeof supabase.channel !== 'function') {
            console.error('Supabase client not properly initialized');
            return;
        }
        
        // Cleanup existing subscriptions
        if (supabaseSubscriptions) {
            try {
                if (supabaseSubscriptions.tools && typeof supabaseSubscriptions.tools.unsubscribe === 'function') {
                    supabaseSubscriptions.tools.unsubscribe();
                }
                if (supabaseSubscriptions.votes && typeof supabaseSubscriptions.votes.unsubscribe === 'function') {
                    supabaseSubscriptions.votes.unsubscribe();
                }
            } catch (error) {
                console.warn('Error during supabase subscription cleanup:', error);
            }
        }
        
        // Initialize subscriptions object
        supabaseSubscriptions = {
            tools: null,
            votes: null
        };
        
        // Subscribe to tool updates
        const toolsSubscription = supabase
            .channel('tools-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'ai_tools' },
                async (payload) => {
                    console.log('Tool change detected:', payload);
                    
                    // Reload tools and update UI
                    await loadAllTools();
                    calculateTotalUpvotes();
                    filterTools();
                    updateUI();
                    
                    // Update hero stats animation
                    if (window.updateHeroStatsFromData) {
                        window.updateHeroStatsFromData({
                            total: appState.totalStats.total,
                            freeCount: appState.totalStats.free,
                            pulse: appState.totalStats.totalUpvotes
                        });
                    }
                }
            )
            .subscribe();
        
        // Subscribe to vote updates
        const votesSubscription = supabase
            .channel('votes-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'votes' },
                async (payload) => {
                    console.log('Vote change detected:', payload);
                    
                    // Reload votes and update affected tool
                    await initializeVotes();
                    calculateTotalUpvotes();
                    calculateRankings();
                    updateUI();
                    
                    // Update hero stats animation
                    if (window.updateHeroStatsFromData) {
                        window.updateHeroStatsFromData({
                            total: appState.totalStats.total,
                            freeCount: appState.totalStats.free,
                            pulse: appState.totalStats.totalUpvotes
                        });
                    }
                }
            )
            .subscribe();
        
        console.log('Real-time updates enabled');
        
        // Store subscriptions for cleanup
        supabaseSubscriptions.tools = toolsSubscription;
        supabaseSubscriptions.votes = votesSubscription;
        
    } catch (error) {
        console.error('Error setting up real-time updates:', error);
    }
}


// ===========================================
// HOLOGRAPHIC STATS ANIMATION
// ===========================================

(function(){
    function animateNumber(el, to, duration) {
        if (!el) return;
        duration = duration || 1200;
        const start = 0;
        const range = to - start;
        const startTime = performance.now();
        const display = function(v) { el.textContent = Math.round(v); };
        function frame(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress < 0.5 ? 2*progress*progress : -1 + (4-2*progress)*progress;
            display(start + range * eased);
            if (progress < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }
    
    function updateStatsFromTargets() {
        const nodes = [
            {id: 'total-tools', dur: 1000},
            {id: 'total-upvotes', dur: 1400},
            {id: 'free-tools', dur: 1000}
        ];
        nodes.forEach(function(n) {
            const el = document.getElementById(n.id);
            if (!el) return;
            const target = parseInt(el.getAttribute('data-target') || '0', 10);
            animateNumber(el, target, n.dur);
        });
        const pulseEl = document.getElementById('total-upvotes');
        if (pulseEl) {
            const val = parseInt(pulseEl.getAttribute('data-target') || '0', 10);
            const card = document.getElementById('card-updated');
            if (card) {
                const intensity = Math.min(1, val / 100);
                card.style.boxShadow = '0 14px 38px rgba(0,243,255,' + (0.05 + intensity*0.12) + '), 0 0 30px rgba(185,103,255,' + (0.03 + intensity*0.06) + ')';
            }
        }
    }
    
    function updateHeroStatsFromData(data){
        if (!data || typeof data !== 'object') return;
        const map = [
            {key: 'total', selector: 'total-tools'},
            {key: 'pulse', selector: 'total-upvotes'},
            {key: 'freeCount', selector: 'free-tools'}
        ];
        map.forEach(function(m) {
            if (m.key in data && document.getElementById(m.selector)){
                document.getElementById(m.selector).setAttribute('data-target', String(data[m.key] || 0));
            }
        });
        updateStatsFromTargets();
    }
    
    document.addEventListener('DOMContentLoaded', function() {
        updateStatsFromTargets();
    });
    
    window.updateHeroStatsFromData = updateHeroStatsFromData;
})();

// ===========================================
// APPLICATION START
// ===========================================

// Initialize application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM ist bereits geladen
    initApp();
}

// Optional: Initialize real-time updates
// initRealtimeUpdates();

// Make app state available globally for debugging
window.AIToolHub = {
    getState: getAppState,
    refresh: initApp,
    filterTools: filterTools,
    cleanup: cleanupApp,
    
    // Debug-Tools
    debug: {
        // Zeige alle Tools als Tabelle
        tools: () => {
            console.table(appState.tools.map(t => ({
                id: t.id,
                title: t.title,
                category: t.category,
                rating: t.vote_average || t.rating
            })));
            return `${appState.tools.length} tools`;
        },
        
        // Teste ob alles funktioniert
        test: () => {
            console.log('🔍 Running diagnostics...');
            console.log('✅ Tools loaded:', appState.tools.length);
            console.log('✅ Filtered tools:', appState.filteredTools.length);
            console.log('✅ Tool grid exists:', !!document.getElementById('tool-grid'));
            console.log('✅ Search input exists:', !!document.getElementById('search-input'));
            console.log('✅ Theme toggle exists:', !!document.getElementById('theme-toggle'));
            
            // Teste ob Tool-Grid HTML hat
            const toolGrid = document.getElementById('tool-grid');
            if (toolGrid) {
                console.log('✅ Tool grid HTML length:', toolGrid.innerHTML.length);
                console.log('✅ Tool cards in DOM:', toolGrid.querySelectorAll('.tool-card').length);
            }
            
            return 'Check console for details ↑';
        },
        
        // Lade Tools neu
        reload: async () => {
            console.log('🔄 Reloading tools...');
            await loadAllTools();
            filterTools();
            updateUI();
            console.log('✅ Done!');
            return `${appState.tools.length} tools loaded`;
        }
    }
};

export { };

console.log('AI Tool Hub controller loaded');
