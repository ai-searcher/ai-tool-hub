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
        console.log('Theme bereits initialisiert, überspringe...');
        return;
    }
    console.log('Starte zentrale Theme-Initialisierung...');
    
    try {
        // 1. Disable all transitions immediately
        document.body.classList.add('no-transition');
        
        // 2. Theme-Logik mit Prioritäten
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        console.log(`Gespeichertes Theme: "${savedTheme}"`);
        console.log(`System-Preference (dark): ${prefersDark}`);
        
        // Entscheidungslogik:
        // 1. Gespeichertes Theme (höchste Priorität)
        // 2. System-Preference
        // 3. Default: Dark Mode
        let themeToApply = 'dark'; // Standard: Dark Mode
        
        if (savedTheme === 'light' || savedTheme === 'dark') {
            themeToApply = savedTheme;
            console.log(`Verwende gespeichertes Theme: ${themeToApply}`);
        } else if (!savedTheme && prefersDark) {
            themeToApply = 'dark';
            console.log('Verwende System-Preference: Dark Mode');
        } else {
            themeToApply = 'dark';
            console.log('Verwende Default: Dark Mode');
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
                console.log(`Icon gesetzt: ${themeToApply === 'light' ? 'moon' : 'sun'}`);
            }
            
            // Event-Listener für zukünftige Klicks
            themeToggle.addEventListener('click', function() {
                const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                console.log(`Benutzer wechselt Theme: ${currentTheme} -> ${newTheme}`);
                
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
                    console.log(`Theme gespeichert: ${newTheme}`);
                } catch (error) {
                    console.error('Fehler beim Speichern in localStorage:', error);
                }
            });
            
            console.log('Theme-Toggle Event-Listener hinzugefügt');
        } else {
            console.log('Theme-Toggle Button nicht gefunden');
        }
        
        // 5. Nach 50ms Transitions wieder aktivieren
        setTimeout(() => {
            document.body.classList.remove('no-transition');
            themeInitialized = true;
            console.log('Theme-Initialisierung abgeschlossen, Transitions aktiv');
        }, 50);
        
    } catch (error) {
        console.error('Kritischer Fehler bei Theme-Initialisierung:', error);
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
// NEU: DIRECTORY MODAL VARIABLEN
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
        
        // Calculate total upvotes after all data is loaded
        calculateTotalUpvotes();
        
        // Calculate rankings based on loaded data
        calculateRankings();
        
        // Update UI with loaded data
        updateUI();
        
        // Initialize event listeners
        initializeEventHandlers();
        
        // NEU: Directory Modal Event Listeners hinzufügen
        initDirectoryModalEvents();
        
        // NEU: Filter-Bar Auto-Compact initialisieren
        initFilterBarAutoCompact();
        
        // NEU: Holographic Stats Animation starten
        if (window.updateHeroStatsFromData) {
            window.updateHeroStatsFromData({
                total: appState.totalStats.total,
                freeCount: appState.totalStats.free,
                pulse: appState.totalStats.updatedToday
            });
        }
        
        // Hide loading spinner
        hideLoadingSpinner();
        
        console.log('Application initialized successfully');
        showNotification();
        
    } catch (error) {
        console.error('Error initializing app:', error);
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
            console.log(`Loaded ${dbTools.length} tools from database`);
            appState.tools = dbTools;
            appState.filteredTools = [...dbTools];
            return;
        }
        
        // Fallback to local JSON if database is empty
        console.log('Database empty, loading from local JSON...');
        const response = await fetch('./data.json');
        
        if (!response.ok) {
            throw new Error('Failed to load local JSON');
        }
        
        const jsonTools = await response.json();
        console.log(`Loaded ${jsonTools.length} tools from JSON`);
        
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
 * Calculates total upvotes across all tools
 */
function calculateTotalUpvotes() {
    const totalUpvotes = appState.tools.reduce((sum, tool) => {
        return sum + (tool.vote_count || 0);
    }, 0);
    
    appState.totalStats.updatedToday = totalUpvotes;
    console.log(`Total upvotes calculated: ${totalUpvotes}`);
}

/**
 * Loads tool statistics for hero section
 */
async function loadToolStats() {
    try {
        const stats = await loadToolStatistics();
        
        // Set total and free from database stats
        appState.totalStats.total = stats.total || appState.tools.length;
        appState.totalStats.free = stats.free || appState.tools.filter(tool => tool.is_free).length;
        
        // Always calculate upvotes from local tools data
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
                tool.vote_count = votesData[tool.id].count;
                tool.vote_average = votesData[tool.id].average;
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
// NEU: DIRECTORY MODAL FUNKTIONEN
// ===========================================

/**
 * Initialisiert Event Listener für das Directory Modal
 */
function initDirectoryModalEvents() {
    console.log('Initialisiere Directory Modal Events...');
    
    // 1. Hero-Stat-Kachel für "aktive Tools" klickbar machen
    const heroStatsContainer = document.querySelector('.hero-stats');
    if (heroStatsContainer) {
        // Versuche, die "aktive Tools" Kachel zu finden
        const totalToolsCard = document.getElementById('card-active');
        if (totalToolsCard) {
            totalToolsCard.style.cursor = 'pointer';
            totalToolsCard.setAttribute('role', 'button');
            totalToolsCard.setAttribute('tabindex', '0');
            totalToolsCard.setAttribute('aria-label', 'Tool-Verzeichnis öffnen');
            
            totalToolsCard.addEventListener('click', openDirectoryModal);
            totalToolsCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDirectoryModal();
                }
            });
            
            console.log('Hero-Stat-Kachel für Directory Modal klickbar gemacht');
        }
    }
    
    // 2. Modal Close Event Listener
    const closeButton = document.getElementById('directory-close');
    if (closeButton) {
        closeButton.addEventListener('click', closeDirectoryModal);
    }
    
    // 3. Overlay Click Event
    const modalOverlay = document.querySelector('#directory-modal .modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeDirectoryModal();
            }
        });
    }
    
    // 4. Escape Key Event
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('directory-modal');
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            closeDirectoryModal();
        }
    });
    
    console.log('Directory Modal Events initialisiert');
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
    allTab.addEventListener('click', () => {
        setActiveTab('all');
        renderDirectoryList('all');
    });
    
    tabsContainer.innerHTML = '';
    tabsContainer.appendChild(allTab);
    
    // Tabs für jede Kategorie
    appState.categories.forEach(category => {
        if (category.id === 'all') return; // "Alle" haben wir schon
        
        const tab = document.createElement('button');
        tab.className = 'directory-tab';
        tab.setAttribute('data-category', category.id);
        tab.setAttribute('aria-selected', 'false');
        tab.setAttribute('role', 'tab');
        tab.textContent = `${category.name} (${category.count})`;
        tab.addEventListener('click', () => {
            setActiveTab(category.id);
            renderDirectoryList(category.id);
        });
        
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
        const shortDescription = tool.description.length > 90 
            ? tool.description.substring(0, 90) + '...' 
            : tool.description;
        
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
            jumpButton.addEventListener('click', () => {
                handleToolJump(tool.id);
            });
        }
        
        listContainer.appendChild(toolItem);
    });
    
    // "Mehr anzeigen" Button, wenn es mehr als 12 Tools gibt
    if (tools.length > 12) {
        const showMoreButton = document.createElement('button');
        showMoreButton.className = 'btn btn-secondary directory-show-more';
        showMoreButton.innerHTML = `<i class="fas fa-chevron-down"></i> Mehr anzeigen (${tools.length - 12} weitere)`;
        showMoreButton.addEventListener('click', () => {
            // Lade alle restlichen Tools
            const remainingTools = tools.slice(12);
            remainingTools.forEach(tool => {
                const toolItem = document.createElement('div');
                toolItem.className = 'directory-tool-item';
                toolItem.setAttribute('data-tool-id', tool.id);
                
                const shortDescription = tool.description.length > 90 
                    ? tool.description.substring(0, 90) + '...' 
                    : tool.description;
                
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
                    jumpButton.addEventListener('click', () => {
                        handleToolJump(tool.id);
                    });
                }
                
                listContainer.appendChild(toolItem);
            });
            
            showMoreButton.remove();
        });
        
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
// NEU: AUTO-COMPACT-ON-SCROLL FUNKTIONALITÄT
// ===========================================

/**
 * Initialisiert automatisches Kompakt-Modus für Filterbar beim Scrollen
 * Fügt 'compact' Klasse ab 80px Scroll hinzu
 */
function initFilterBarAutoCompact() {
    const filterBar = document.getElementById('filter-bar');
    if (!filterBar) return;
    
    let ticking = false;
    
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        
        window.requestAnimationFrame(() => {
            const shouldCompact = window.scrollY > 80;
            filterBar.classList.toggle('compact', shouldCompact);
            ticking = false;
        });
    };
    
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial state
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
            
            // Recalculate total upvotes
            calculateTotalUpvotes();
            
            // Recalculate rankings
            calculateRankings();
            
            // Update UI
            updateUI();
            
            // Update hero stats animation with new upvote count
            if (window.updateHeroStatsFromData) {
                window.updateHeroStatsFromData({
                    total: appState.totalStats.total,
                    freeCount: appState.totalStats.free,
                    pulse: appState.totalStats.updatedToday
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
                    calculateTotalUpvotes();
                    filterTools();
                    updateUI();
                    
                    // Update hero stats animation
                    if (window.updateHeroStatsFromData) {
                        window.updateHeroStatsFromData({
                            total: appState.totalStats.total,
                            freeCount: appState.totalStats.free,
                            pulse: appState.totalStats.updatedToday
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
                            pulse: appState.totalStats.updatedToday
                        });
                    }
                }
            )
            .subscribe();
        
        console.log('Real-time updates enabled');
        
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
    console.log('Early Theme-Initialisierung...');
    
    // Nur wenn DOM bereits bereit ist
    if (document.readyState === 'loading') {
        console.log('Warte auf DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM geladen, initialisiere Theme...');
            initializeTheme();
        });
    } else {
        console.log('DOM bereits geladen, initialisiere sofort...');
        initializeTheme();
    }
}

// Starte frühe Theme-Initialisierung SOFORT
earlyThemeInit();

// ===========================================
// NEU: HOLOGRAPHIC STATS ANIMATION
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
            {id: 'updated-today', dur: 1400},
            {id: 'free-tools', dur: 1000}
        ];
        nodes.forEach(function(n) {
            const el = document.getElementById(n.id);
            if (!el) return;
            const target = parseInt(el.getAttribute('data-target') || '0', 10);
            animateNumber(el, target, n.dur);
        });
        const pulseEl = document.getElementById('updated-today');
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
            {key: 'pulse', selector: 'updated-today'},
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
    filterTools: filterTools
};

// Export für andere Module (falls benötigt)
export { initializeTheme, themeInitialized };

console.log('AI Tool Hub controller loaded');
