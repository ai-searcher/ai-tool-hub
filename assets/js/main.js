// ===========================================
// ZENTRALE THEME INITIALISIERUNG
// ===========================================

// Globale Variable um mehrfache Initialisierung zu verhindern
let themeInitialized = false;

/**
 * Zentrale Theme-Initialisierung (nur einmal ausführen)
 * Verhindert das Springen zwischen Themes beim Seitenneuladen
 */
function initializeTheme() {
    // Verhindere mehrfache Ausführung
    if (themeInitialized) {
        console.log('⚡ Theme bereits initialisiert, überspringe...');
        return;
    }
    
    console.log('🎨 Starte zentrale Theme-Initialisierung...');
    
    try {
        // 1. Disable all transitions immediately
        document.body.classList.add('no-transition');
        
        // 2. Theme-Logik mit Prioritäten
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        console.log(`📁 Gespeichertes Theme: "${savedTheme}"`);
        console.log(`🖥️ System-Preference (dark): ${prefersDark}`);
        
        // Entscheidungslogik:
        // 1. Gespeichertes Theme (höchste Priorität)
        // 2. System-Preference
        // 3. Default: Dark Mode
        let themeToApply = 'dark'; // Standard: Dark Mode
        
        if (savedTheme === 'light' || savedTheme === 'dark') {
            themeToApply = savedTheme;
            console.log(`🎯 Verwende gespeichertes Theme: ${themeToApply}`);
        } else if (!savedTheme && prefersDark) {
            themeToApply = 'dark';
            console.log('🎯 Verwende System-Preference: Dark Mode');
        } else {
            themeToApply = 'dark';
            console.log('🎯 Verwende Default: Dark Mode');
        }
        
        // 3. Theme-Klasse anwenden (OHNE Übergänge)
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(`${themeToApply}-theme`);
        
        // 4. Toggle-Icon sofort setzen (falls vorhanden)
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const themeIcon = themeToggle.querySelector('i');
            if (themeIcon) {
                themeIcon.classList.remove('fa-sun', 'fa-moon', 'fa-adjust');
                themeIcon.classList.add(themeToApply === 'light' ? 'fa-moon' : 'fa-sun');
                console.log(`🔧 Icon gesetzt: ${themeToApply === 'light' ? 'moon' : 'sun'}`);
            }
            
            // Event-Listener für zukünftige Klicks
            themeToggle.addEventListener('click', function() {
                const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                console.log(`🔄 Benutzer wechselt Theme: ${currentTheme} → ${newTheme}`);
                
                // Theme anwenden
                document.body.classList.remove(`${currentTheme}-theme`);
                document.body.classList.add(`${newTheme}-theme`);
                
                // Icon aktualisieren
                const icon = this.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-sun', 'fa-moon');
                    icon.classList.add(newTheme === 'dark' ? 'fa-sun' : 'fa-moon');
                }
                
                // In localStorage speichern
                try {
                    localStorage.setItem('theme', newTheme);
                    console.log(`💾 Theme gespeichert: ${newTheme}`);
                } catch (error) {
                    console.error('❌ Fehler beim Speichern in localStorage:', error);
                }
            });
            
            console.log('🎯 Theme-Toggle Event-Listener hinzugefügt');
        } else {
            console.log('⚠️ Theme-Toggle Button nicht gefunden');
        }
        
        // 5. Nach 50ms Transitions wieder aktivieren
        setTimeout(() => {
            document.body.classList.remove('no-transition');
            themeInitialized = true;
            console.log('✅ Theme-Initialisierung abgeschlossen, Transitions aktiv');
        }, 50);
        
    } catch (error) {
        console.error('❌ Kritischer Fehler bei Theme-Initialisierung:', error);
        // Fallback: Dark Theme anwenden und Transitions aktivieren
        document.body.classList.remove('no-transition');
        document.body.classList.add('dark-theme');
        themeInitialized = true;
    }
}

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
        updatedToday: 0,
        free: 0
    }
};

// ===========================================
// DATA LOADING & INITIALIZATION
// ===========================================

/**
 * Initializes the application by loading all data
 */
async function initApp() {
    console.log('🚀 AI Tool Hub initializing...');
    
    try {
        // WICHTIG: Theme GANZ AM ANFANG initialisieren
        initializeTheme();
        
        // Kurze Pause für sichere Render-Initialisierung
        await new Promise(resolve => setTimeout(resolve, 100));
        
        showLoadingSpinner();
        
        // Test database connection
        const isConnected = await testConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }
        
        // Load all data in parallel
        await Promise.all([
            loadAllTools(),
            loadCategoriesData(),
            loadToolStats(),
            initializeVotes()
        ]);
        
        // Calculate rankings based on loaded data
        calculateRankings();
        
        // Update UI with loaded data
        updateUI();
        
        // Initialize event listeners
        initializeEventHandlers();
        
        // NEU: Filter-Bar Auto-Compact nach UI Initialisierung
        initFilterBarAutoCompact();
        
        // Hide loading spinner
        hideLoadingSpinner();
        
        console.log('✅ Application initialized successfully');
        showNotification();
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        hideLoadingSpinner();
        showEmptyState('Fehler beim Laden der Daten. Bitte versuche es später erneut.');
        showNotification(ERROR_MESSAGES.LOADING_ERROR, 'error');
    }
}

// ===========================================
// NEU: AUTO-COMPACT-ON-SCROLL FUNKTIONALITÄT
// ===========================================

/**
 * Initialisiert automatisches Kompakt-Modus für Filterbar beim Scrollen
 * Fügt 'compact' Klasse ab 80px Scroll hinzu für futuristischeres Design
 */
function initFilterBarAutoCompact() {
    console.log('🔄 Initialisiere Filter-Bar Auto-Compact...');
    
    const filterBar = document.getElementById('filter-bar');
    
    if (!filterBar) {
        console.log('⚠️ Filter-Bar (#filter-bar) nicht gefunden, überspringe Auto-Compact');
        return;
    }
    
    let ticking = false;
    let lastScrollY = window.scrollY;
    const SCROLL_THRESHOLD = 80; // Pixel ab denen kompakt wird
    
    /**
     * Aktualisiert die Compact-Klasse basierend auf Scroll-Position
     */
    function updateCompactState() {
        const currentScrollY = window.scrollY;
        const shouldCompact = currentScrollY > SCROLL_THRESHOLD;
        
        // Toggle 'compact' Klasse basierend auf Scroll-Position
        filterBar.classList.toggle('compact', shouldCompact);
        
        // Optional: Debug-Logging bei Zustandsänderung
        if (currentScrollY !== lastScrollY) {
            lastScrollY = currentScrollY;
            if (shouldCompact !== filterBar.classList.contains('compact')) {
                console.log(`📐 Filter-Bar: ${shouldCompact ? 'Kompakt' : 'Normal'} (scrollY: ${currentScrollY}px)`);
            }
        }
        
        ticking = false;
    }
    
    /**
     * RequestAnimationFrame optimierte Scroll-Handler
     */
    function handleScroll() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateCompactState();
            });
            ticking = true;
        }
    }
    
    // Initialen Zustand setzen
    updateCompactState();
    
    // Scroll-Event-Listener hinzufügen
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Resize-Event für Responsiveness
    window.addEventListener('resize', handleScroll, { passive: true });
    
    console.log('✅ Filter-Bar Auto-Compact initialisiert');
}

/**
 * Loads tools from database and combines with local JSON data
 */
async function loadAllTools() {
    try {
        // First try to load from Supabase
        const dbTools = await loadTools();
        
        if (dbTools && dbTools.length > 0) {
            console.log(`📊 Loaded ${dbTools.length} tools from database`);
            appState.tools = dbTools;
            appState.filteredTools = [...dbTools];
            return;
        }
        
        // Fallback to local JSON if database is empty
        console.log('📂 Database empty, loading from local JSON...');
        const response = await fetch('./data.json');
        
        if (!response.ok) {
            throw new Error('Failed to load local JSON');
        }
        
        const jsonTools = await response.json();
        console.log(`📊 Loaded ${jsonTools.length} tools from JSON`);
        
        // Transform JSON data to match our structure
        const transformedTools = jsonTools.map(tool => ({
            id: tool.id || generateId(),
            title: tool.title,
            description: tool.description,
            category: tool.category || 'uncategorized',
            tags: tool.tags || [],
            rating: tool.rating || 4.0,
            usage_count: tool.usage_count || 0,
            vote_count: tool.vote_count || 0,
            vote_average: tool.vote_average || tool.rating || 4.0,
            is_free: tool.is_free || false,
            is_featured: tool.is_featured || false,
            icon: tool.icon || 'fas fa-robot',
            link: tool.link || '#',
            created_at: tool.created_at || new Date().toISOString(),
            updated_at: tool.updated_at || new Date().toISOString()
        }));
        
        appState.tools = transformedTools;
        appState.filteredTools = [...transformedTools];
        
    } catch (error) {
        console.error('Error loading tools:', error);
        throw error;
    }
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
        appState.categories = DEFAULT_CATEGORIES;
    }
}

/**
 * Loads tool statistics for hero section
 */
async function loadToolStats() {
    try {
        const stats = await loadToolStatistics();
        appState.totalStats = stats;
    } catch (error) {
        console.error('Error loading tool stats:', error);
        // Calculate stats from local data
        const today = new Date().toISOString().split('T')[0];
        appState.totalStats = {
            total: appState.tools.length,
            updatedToday: appState.tools.filter(tool => 
                tool.updated_at && tool.updated_at.startsWith(today)
            ).length,
            free: appState.tools.filter(tool => tool.is_free).length
        };
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
                tool.vote_count = votesData[tool.id].count;
                tool.vote_average = votesData[tool.id].average;
            }
        });
        
    } catch (error) {
        console.error('Error initializing votes:', error);
        // Initialize empty votes object
        appState.votes = {};
    }
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
        filtered = filtered.filter(tool =>
            tool.title.toLowerCase().includes(searchTerm) ||
            tool.description.toLowerCase().includes(searchTerm) ||
            tool.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
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
                new Date(b.created_at) - new Date(a.created_at)
            );
        
        case 'rating':
            return sorted.sort((a, b) => 
                (b.vote_average || b.rating) - (a.vote_average || a.rating)
            );
        
        case 'name':
            return sorted.sort((a, b) => 
                a.title.localeCompare(b.title)
            );
        
        case 'popular':
            return sorted.sort((a, b) => 
                b.usage_count - a.usage_count
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
        const ratingScore = (tool.vote_average || tool.rating) * 20; // Convert to 0-100 scale
        const usageScore = Math.min(100, tool.usage_count / 10); // Usage contributes up to 100
        const totalScore = (ratingScore * 0.7) + (usageScore * 0.3); // 70% rating, 30% usage
        
        return {
            ...tool,
            score: totalScore
        };
    });
    
    // Sort by score and take top 5
    const sorted = toolsWithScore.sort((a, b) => b.score - a.score);
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
// EVENT HANDLERS
// ===========================================

/**
 * Initializes all event handlers
 */
function initializeEventHandlers() {
    setEventHandlers({
        handleSearch: handleSearch,
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
}

/**
 * Handles vote updates
 */
async function handleVoteUpdate(toolId, voteData) {
    try {
        // Update local state
        const toolIndex = appState.tools.findIndex(t => t.id === toolId);
        if (toolIndex !== -1) {
            appState.tools[toolIndex].vote_count = (appState.tools[toolIndex].vote_count || 0) + 1;
            
            // Recalculate average
            const currentAvg = appState.tools[toolIndex].vote_average || appState.tools[toolIndex].rating;
            const newAvg = ((currentAvg * (appState.tools[toolIndex].vote_count - 1)) + voteData.vote_value) / 
                          appState.tools[toolIndex].vote_count;
            appState.tools[toolIndex].vote_average = newAvg;
            
            // Update filtered tools
            const filteredIndex = appState.filteredTools.findIndex(t => t.id === toolId);
            if (filteredIndex !== -1) {
                appState.filteredTools[filteredIndex] = { ...appState.tools[toolIndex] };
            }
            
            // Recalculate rankings
            calculateRankings();
            
            // Update UI
            updateUI();
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
}

/**
 * Handles sort changes
 */
function handleSort(sortBy) {
    appState.currentSort = sortBy;
    filterTools();
    updateUI();
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
        // Subscribe to tool updates
        const toolsSubscription = supabase
            .channel('tools-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'ai_tools' },
                async (payload) => {
                    console.log('Tool change detected:', payload);
                    
                    // Reload tools and update UI
                    await loadAllTools();
                    filterTools();
                    updateUI();
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
                    calculateRankings();
                    updateUI();
                }
            )
            .subscribe();
        
        console.log('✅ Real-time updates enabled');
        
        // Store subscriptions for cleanup
        window.supabaseSubscriptions = {
            tools: toolsSubscription,
            votes: votesSubscription
        };
        
    } catch (error) {
        console.error('Error setting up real-time updates:', error);
    }
}

// ===========================================
// EARLY THEME INITIALIZATION
// ===========================================

/**
 * Sofortige Theme-Initialisierung für DOMContentLoaded
 * Wird separat aufgerufen, bevor initApp() läuft
 */
function earlyThemeInit() {
    console.log('🌅 Early Theme-Initialisierung...');
    
    // Nur wenn DOM bereits bereit ist
    if (document.readyState === 'loading') {
        console.log('⏳ Warte auf DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM geladen, initialisiere Theme...');
            initializeTheme();
        });
    } else {
        console.log('⚡ DOM bereits geladen, initialisiere sofort...');
        initializeTheme();
    }
}

// Starte frühe Theme-Initialisierung SOFORT
earlyThemeInit();

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
    filterTools: filterTools
};

// Export für andere Module (falls benötigt)
export { initializeTheme, themeInitialized };

console.log('🎛️ AI Tool Hub controller loaded');