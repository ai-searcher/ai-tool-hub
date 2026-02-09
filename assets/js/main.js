// ===========================================
// THEME INITIALIZATION
// ===========================================

/**
 * Initializes the theme system
 */
function initTheme() {
    console.log('🎨 Initializing theme system...');
    
    try {
        // Get DOM elements
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.querySelector('.theme-icon');
        const body = document.body;
        
        if (!themeToggle || !themeIcon) {
            console.warn('⚠️ Theme toggle elements not found');
            return;
        }
        
        // Get saved theme from localStorage with fallback
        let savedTheme = 'light'; // Default fallback
        
        try {
            const stored = localStorage.getItem('theme');
            
            // Validate stored theme value
            if (stored === 'light' || stored === 'dark') {
                savedTheme = stored;
                console.log(`📁 Loaded theme from localStorage: ${savedTheme}`);
            } else if (stored) {
                console.warn(`⚠️ Invalid theme value in localStorage: "${stored}", using default`);
                localStorage.removeItem('theme'); // Clean invalid value
            } else {
                console.log('📁 No valid theme found in localStorage');
            }
        } catch (storageError) {
            console.error('❌ Error accessing localStorage:', storageError);
            // Continue with default theme
        }
        
        // Check system preference if no valid saved theme
        let systemPreference = 'light';
        try {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                systemPreference = 'dark';
            }
            console.log(`🖥️ System preference detected: ${systemPreference}`);
        } catch (mediaError) {
            console.error('❌ Error detecting system preference:', mediaError);
        }
        
        // Determine final theme
        let finalTheme = savedTheme;
        if (savedTheme === 'light' && systemPreference === 'dark') {
            // Use system preference as fallback if no valid saved theme
            finalTheme = systemPreference;
            console.log(`🎯 Using system preference: ${finalTheme}`);
        }
        
        // Apply theme to body
        body.classList.remove('light-theme', 'dark-theme');
        body.classList.add(`${finalTheme}-theme`);
        console.log(`✅ Applied theme class: ${finalTheme}-theme`);
        
        // Update toggle icon
        updateThemeIcon(themeIcon, finalTheme);
        
        // Set up theme toggle event listener
        themeToggle.addEventListener('click', function() {
            const currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            // Update body class
            body.classList.remove(`${currentTheme}-theme`);
            body.classList.add(`${newTheme}-theme`);
            
            // Update icon
            updateThemeIcon(themeIcon, newTheme);
            
            // Save to localStorage
            try {
                localStorage.setItem('theme', newTheme);
                console.log(`💾 Saved theme to localStorage: ${newTheme}`);
            } catch (storageError) {
                console.error('❌ Error saving theme to localStorage:', storageError);
            }
            
            // Log theme change
            console.log(`🔄 Theme changed from ${currentTheme} to ${newTheme}`);
        });
        
        console.log(`✅ Theme initialization complete. Active theme: ${finalTheme}`);
        
    } catch (error) {
        console.error('❌ Error in theme initialization:', error);
        // Ensure at least default theme is applied
        document.body.classList.add('light-theme');
    }
}

/**
 * Updates the theme icon based on current theme
 */
function updateThemeIcon(iconElement, theme) {
    if (!iconElement) return;
    
    // Remove all possible icon classes
    iconElement.classList.remove('fa-sun', 'fa-moon', 'fa-adjust');
    
    // Add appropriate icon class
    if (theme === 'dark') {
        iconElement.classList.add('fa-sun'); // Sun icon for dark mode (click to switch to light)
    } else {
        iconElement.classList.add('fa-moon'); // Moon icon for light mode (click to switch to dark)
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
        // Initialize theme first
        initTheme();
        
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

console.log('🎛️ AI Tool Hub controller loaded');