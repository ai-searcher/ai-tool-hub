// ===========================================
// EVENT HANDLERS & LISTENERS
// AI Tool Hub - Event Management
// ===========================================

import { supabase, saveVote, loadMultipleToolVotes } from './supabase.js';
import { showNotification } from './utils.js';
import { UI_CONFIG } from './config.js';

// ===========================================
// ZENTRALE EVENT-MANAGEMENT
// ===========================================

// State management
let currentState = {
    activeFilter: 'all',
    searchQuery: '',
    viewMode: 'grid',
    sortBy: 'newest',
    currentPage: 1,
    isLoading: false,
    tools: [],
    votes: {},
    activeModal: null
};

// Event-Handler Registry mit WeakMap für automatische Cleanup
const eventHandlerRegistry = new Map();
const elementListeners = new WeakMap();

// Debounce-Management mit sicherer Cleanup-Logik
const debounceTimers = new Map();
const throttleFlags = new Map();
const asyncOperations = new Map();
const pendingRequests = new Set();

// ===========================================
// DEBOUNCE / THROTTLE UTILITIES MIT SAFE CLEANUP
// ===========================================

/**
 * Debounce function mit sicherer Cleanup-Logik
 */
function safeDebounce(id, fn, delay = UI_CONFIG.DEBOUNCE_DELAY) {
    const existingTimer = debounceTimers.get(id);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }
    
    const timer = setTimeout(() => {
        try {
            fn();
        } catch (error) {
            console.error(`Debounce function error for ${id}:`, error);
        } finally {
            debounceTimers.delete(id);
        }
    }, delay);
    
    debounceTimers.set(id, timer);
    return timer;
}

/**
 * Throttle function mit async-sicherer Logik
 */
function safeThrottle(id, fn, limit = 300) {
    if (throttleFlags.has(id)) {
        return false;
    }
    
    throttleFlags.set(id, true);
    
    // Für async-Funktionen: verhindere parallele Ausführung
    let isAsync = false;
    let operationPromise = null;
    
    try {
        const result = fn();
        
        // Prüfe ob Funktion async ist
        if (result && typeof result.then === 'function') {
            isAsync = true;
            operationPromise = result;
            asyncOperations.set(id, operationPromise);
            
            // Entferne Flag erst nach Abschluss ODER nach Timeout
            const timeoutId = setTimeout(() => {
                throttleFlags.delete(id);
                asyncOperations.delete(id);
            }, limit);
            
            result.finally(() => {
                clearTimeout(timeoutId);
                throttleFlags.delete(id);
                asyncOperations.delete(id);
            }).catch(() => {
                // Silent catch für async errors
            });
            
            return true;
        }
    } catch (error) {
        console.error(`Throttle function error for ${id}:`, error);
        // Sync error: Flag nach Timeout entfernen
        setTimeout(() => {
            throttleFlags.delete(id);
        }, limit);
        throw error;
    }
    
    // Sync function: Flag nach Timeout entfernen
    if (!isAsync) {
        setTimeout(() => {
            throttleFlags.delete(id);
        }, limit);
    }
    
    return true;
}

/**
 * Cleanup aller Timer und Flags
 */
function cleanupTimersAndFlags() {
    debounceTimers.forEach((timer, id) => {
        clearTimeout(timer);
    });
    debounceTimers.clear();
    
    throttleFlags.clear();
    
    asyncOperations.forEach((promise, id) => {
        throttleFlags.delete(id);
    });
    asyncOperations.clear();
    
    pendingRequests.forEach(controller => {
        try {
            controller.abort();
        } catch (e) {
            // Ignore abort errors
        }
    });
    pendingRequests.clear();
}

// ===========================================
// EVENT REGISTRATION & CLEANUP UTILITIES
// ===========================================

/**
 * Sichere Event-Registrierung mit korrekten Listener-Optionen
 */
function registerEventListener(element, eventType, handler, handlerId) {
    if (!element || typeof handler !== 'function') {
        console.warn(`Invalid event registration: ${handlerId}`);
        return;
    }
    
    // Korrekte Listener-Optionen basierend auf Event-Typ
    let options;
    if (['scroll', 'touchmove', 'touchstart'].includes(eventType)) {
        options = { passive: true };
    } else {
        // Für click, keydown, keypress, input: passive: false oder keine Option
        options = false;
    }
    
    // Store handler for cleanup
    const listenerEntry = { element, eventType, handler, handlerId, options };
    
    if (!elementListeners.has(element)) {
        elementListeners.set(element, []);
    }
    elementListeners.get(element).push(listenerEntry);
    
    eventHandlerRegistry.set(handlerId, listenerEntry);
    
    // Add event listener mit korrekten Optionen
    if (options) {
        element.addEventListener(eventType, handler, options);
    } else {
        element.addEventListener(eventType, handler);
    }
}

/**
 * Entfernt spezifischen Event-Listener
 */
function removeEventListenerById(handlerId) {
    const listenerEntry = eventHandlerRegistry.get(handlerId);
    if (!listenerEntry) return;
    
    const { element, eventType, handler, options } = listenerEntry;
    
    if (element && element.removeEventListener) {
        if (options) {
            element.removeEventListener(eventType, handler, options);
        } else {
            element.removeEventListener(eventType, handler);
        }
    }
    
    if (elementListeners.has(element)) {
        const listeners = elementListeners.get(element);
        const index = listeners.findIndex(l => l.handlerId === handlerId);
        if (index > -1) {
            listeners.splice(index, 1);
        }
        if (listeners.length === 0) {
            elementListeners.delete(element);
        }
    }
    
    eventHandlerRegistry.delete(handlerId);
}

/**
 * Entfernt alle Event-Listener eines bestimmten Elements
 */
function removeAllElementListeners(element) {
    if (!elementListeners.has(element)) return;
    
    const listeners = elementListeners.get(element);
    listeners.forEach(({ eventType, handler, options }) => {
        if (options) {
            element.removeEventListener(eventType, handler, options);
        } else {
            element.removeEventListener(eventType, handler);
        }
    });
    
    listeners.forEach(({ handlerId }) => {
        eventHandlerRegistry.delete(handlerId);
    });
    
    elementListeners.delete(element);
}

// ===========================================
// KEYBOARD SHORTCUTS MIT KORREKTEM ESC-HANDLING
// ===========================================

/**
 * Initialisiert globale Keyboard Shortcuts
 */
function initKeyboardShortcuts() {
    const handleGlobalKeyDown = (e) => {
        // ESC: Globale Behandlung nur wenn kein Modal aktiv
        if (e.key === 'Escape') {
            if (!currentState.activeModal) {
                const searchInput = document.getElementById('search-input');
                if (searchInput && searchInput.value) {
                    e.preventDefault();
                    searchInput.value = '';
                    const inputEvent = new Event('input', { bubbles: true });
                    searchInput.dispatchEvent(inputEvent);
                    searchInput.focus();
                }
            }
            // Modal-ESC wird in initModalEvents separat behandelt
            return;
        }
        
        // Ctrl/Cmd + K: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            return;
        }
        
        // Ctrl/Cmd + T: Toggle theme
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) themeToggle.click();
            return;
        }
        
        // Ctrl/Cmd + F: Focus search (alternative)
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            return;
        }
        
        // Ctrl/Cmd + R: Reset filters
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            const resetBtn = document.querySelector('[data-reset-filters]');
            if (resetBtn) resetBtn.click();
            return;
        }
    };
    
    registerEventListener(document, 'keydown', handleGlobalKeyDown, 'global-keyboard-shortcuts');
}

// ===========================================
// SEARCH & FILTER EVENTS
// ===========================================

/**
 * Initializes search input event listeners
 */
export function initSearchEvents(handleSearch) {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchClear = document.getElementById('search-clear');

    if (!searchInput || !searchButton) {
        console.warn('Search elements not found');
        return;
    }

    // Real-time search with debouncing
    const handleSearchInput = (e) => {
        const query = e.target.value.trim();
        currentState.searchQuery = query;
        
        if (searchClear) {
            searchClear.style.display = query ? 'block' : 'none';
        }

        safeDebounce('search', () => {
            if (typeof handleSearch === 'function') {
                handleSearch(query, currentState.activeFilter);
            }
        }, UI_CONFIG.DEBOUNCE_DELAY);
    };

    // Search button click
    const handleSearchClick = (e) => {
        e.preventDefault();
        if (typeof handleSearch === 'function') {
            handleSearch(currentState.searchQuery, currentState.activeFilter);
        }
    };

    // Enter key in search input
    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (typeof handleSearch === 'function') {
                handleSearch(currentState.searchQuery, currentState.activeFilter);
            }
        }
    };

    // Clear search
    const handleClearClick = (e) => {
        e.preventDefault();
        searchInput.value = '';
        currentState.searchQuery = '';
        if (searchClear) searchClear.style.display = 'none';
        if (typeof handleSearch === 'function') {
            handleSearch('', currentState.activeFilter);
        }
        searchInput.focus();
    };

    // Attach events with safe registration
    registerEventListener(searchInput, 'input', handleSearchInput, 'search-input');
    registerEventListener(searchButton, 'click', handleSearchClick, 'search-button');
    registerEventListener(searchInput, 'keypress', handleSearchKeyPress, 'search-keypress');
    
    if (searchClear) {
        registerEventListener(searchClear, 'click', handleClearClick, 'search-clear');
    }
}

/**
 * Initializes filter category event listeners
 */
export function initFilterEvents(handleFilter) {
    const filterContainer = document.getElementById('filter-container');
    
    if (!filterContainer) {
        console.warn('Filter container not found');
        return;
    }

    const handleFilterClick = (e) => {
        const filterBtn = e.target.closest('[data-filter]');
        if (!filterBtn) return;

        const filter = filterBtn.dataset.filter;
        if (!filter || typeof handleFilter !== 'function') return;

        e.preventDefault();

        safeThrottle(`filter-${filter}`, () => {
            currentState.activeFilter = filter;
            
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.classList.remove('active', 'loading');
            });
            filterBtn.classList.add('active');
            
            handleFilter(filter, currentState.searchQuery);
        }, 300);
    };

    const handleFilterKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const filterBtn = e.target.closest('[data-filter]');
            if (filterBtn) {
                e.preventDefault();
                filterBtn.click();
            }
        }
    };

    registerEventListener(filterContainer, 'click', handleFilterClick, 'filter-click');
    registerEventListener(filterContainer, 'keydown', handleFilterKeyDown, 'filter-keydown');
}

// ===========================================
// VOTING EVENTS MIT SICHERER STATE-SYNCHRONISATION
// ===========================================

/**
 * Initializes voting event listeners
 */
export function initVoteEvents(handleVoteUpdate) {
    const toolGrid = document.getElementById('tool-grid');
    
    if (!toolGrid) {
        console.warn('Tool grid not found');
        return;
    }

    const handleVoteClick = async (e) => {
        const voteBtn = e.target.closest('[data-action]');
        if (!voteBtn) return;

        const toolCard = voteBtn.closest('[data-id]');
        if (!toolCard) return;

        const toolId = toolCard.dataset.id;
        const action = voteBtn.dataset.action;
        
        if (!toolId || !action) return;

        e.preventDefault();

        if (voteBtn.classList.contains('voting')) return;
        
        const buttonId = `vote-${toolId}-${action}`;
        if (debounceTimers.has(buttonId)) return;

        voteBtn.classList.add('voting');
        const originalHTML = voteBtn.innerHTML;
        const voteCountElement = voteBtn.querySelector('.vote-count');
        const originalVoteCount = voteCountElement ? parseInt(voteCountElement.textContent) || 0 : 0;
        
        if (voteCountElement) {
            const optimisticCount = action === 'upvote' ? originalVoteCount + 1 : Math.max(0, originalVoteCount - 1);
            voteCountElement.textContent = optimisticCount;
        }
        
        voteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        if (voteCountElement) {
            voteCountElement.style.visibility = 'hidden';
        }

        safeDebounce(buttonId, async () => {
            try {
                const voteValue = action === 'upvote' ? 1 : -1;
                const userId = getUserId();
                
                const result = await saveVote(toolId, voteValue, userId);
                
                if (result && result.success) {
                    updateVoteUI(voteBtn, toolId, action, result.data);
                    
                    if (typeof handleVoteUpdate === 'function') {
                        handleVoteUpdate(toolId, result.data);
                    }
                    
                    showNotification('Bewertung gespeichert!', 'success');
                } else {
                    if (voteCountElement) {
                        voteCountElement.textContent = originalVoteCount;
                    }
                    showNotification(result?.message || 'Fehler beim Speichern der Bewertung', 'error');
                }
            } catch (error) {
                console.error('Error processing vote:', error);
                if (voteCountElement) {
                    voteCountElement.textContent = originalVoteCount;
                }
                showNotification('Ein Fehler ist aufgetreten', 'error');
            } finally {
                voteBtn.classList.remove('voting');
                voteBtn.innerHTML = originalHTML;
                if (voteCountElement) {
                    voteCountElement.style.visibility = 'visible';
                }
            }
        }, 300);
    };

    const handleVoteKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const voteBtn = e.target.closest('[data-action]');
            if (voteBtn) {
                e.preventDefault();
                voteBtn.click();
            }
        }
    };

    registerEventListener(toolGrid, 'click', handleVoteClick, 'vote-click');
    registerEventListener(toolGrid, 'keydown', handleVoteKeyDown, 'vote-keydown');
}

/**
 * Updates the vote UI
 */
function updateVoteUI(voteBtn, toolId, action, serverData) {
    const voteCountElement = voteBtn.querySelector('.vote-count');
    if (voteCountElement && serverData) {
        const serverCount = serverData.count || serverData.votes || 0;
        voteCountElement.textContent = serverCount;
    }

    voteBtn.classList.add('voted');
    const voteFeedbackTimer = setTimeout(() => {
        voteBtn.classList.remove('voted');
    }, 1000);
    
    debounceTimers.set(`vote-feedback-${toolId}`, voteFeedbackTimer);

    if (serverData) {
        currentState.votes[toolId] = {
            ...currentState.votes[toolId],
            count: serverData.count || serverData.votes || 0,
            lastUpdated: Date.now()
        };
    }
}

// ===========================================
// MODAL EVENTS MIT ZENTRALEM ESC-HANDLING
// ===========================================

/**
 * Initializes modal event listeners
 */
export function initModalEvents() {
    const modals = [
        { btn: 'imprint-btn', modal: 'imprint-modal', close: 'imprint-close', overlay: 'imprint-overlay' },
        { btn: 'privacy-btn', modal: 'privacy-modal', close: 'privacy-close', overlay: 'privacy-overlay' }
    ];

    // Zentrale ESC-Handling für Modals
    const handleModalEscape = (e) => {
        if (e.key === 'Escape' && currentState.activeModal) {
            e.stopPropagation();
            e.preventDefault();
            closeModal(currentState.activeModal);
        }
    };

    // ESC-Listener auf document für Modals
    registerEventListener(document, 'keydown', handleModalEscape, 'modal-escape');

    modals.forEach(({ btn, modal, close, overlay }) => {
        const btnElement = document.getElementById(btn);
        const modalElement = document.getElementById(modal);
        const closeElement = document.getElementById(close);
        const overlayElement = document.getElementById(overlay);

        if (!btnElement || !modalElement) {
            console.warn(`Modal elements not found: ${btn}, ${modal}`);
            return;
        }

        const handleOpenClick = (e) => {
            e.preventDefault();
            openModal(modalElement);
        };

        const handleCloseClick = (e) => {
            e.preventDefault();
            closeModal(modalElement);
        };

        registerEventListener(btnElement, 'click', handleOpenClick, `${btn}-click`);

        if (closeElement) {
            registerEventListener(closeElement, 'click', handleCloseClick, `${close}-click`);
        }

        if (overlayElement) {
            registerEventListener(overlayElement, 'click', handleCloseClick, `${overlay}-click`);
        }
    });
}

/**
 * Opens a modal dialog
 */
function openModal(modalElement) {
    if (!modalElement) return;
    
    if (currentState.activeModal) {
        closeModal(currentState.activeModal);
    }
    
    modalElement.classList.add('show');
    modalElement.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    currentState.activeModal = modalElement;
    
    const focusableElements = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
        focusableElements[0].focus();
    }
}

/**
 * Closes a modal dialog
 */
function closeModal(modalElement) {
    if (!modalElement) return;
    
    modalElement.classList.remove('show');
    modalElement.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentState.activeModal = null;
}

// ===========================================
// THEME & VIEW EVENTS
// ===========================================

/**
 * Initializes theme toggle event listener
 */
export function initThemeEvents() {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (!themeToggle) {
        console.warn('Theme toggle not found');
        return;
    }

    const handleThemeClick = (e) => {
        e.preventDefault();

        const buttonId = 'theme-toggle';
        if (!safeThrottle(buttonId, () => {
            try {
                document.body.classList.add('no-transition');
                
                const isDarkMode = document.body.classList.contains('light-mode');
                if (isDarkMode) {
                    document.body.classList.remove('light-mode');
                    document.body.classList.add('dark-mode');
                    localStorage.setItem('theme', 'dark');
                    showNotification('Dark Mode aktiviert', 'info');
                } else {
                    document.body.classList.remove('dark-mode');
                    document.body.classList.add('light-mode');
                    localStorage.setItem('theme', 'light');
                    showNotification('Light Mode aktiviert', 'info');
                }
                
                void document.body.offsetHeight;
                document.body.classList.remove('no-transition');
                
            } catch (error) {
                console.error('Error during theme transition:', error);
                showNotification('Fehler beim Theme-Wechsel', 'error');
            }
        }, 300)) {
            return;
        }
    };

    const handleThemeKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            themeToggle.click();
        }
    };

    registerEventListener(themeToggle, 'click', handleThemeClick, 'theme-click');
    registerEventListener(themeToggle, 'keydown', handleThemeKeyDown, 'theme-keydown');
}

/**
 * Initializes view mode toggle event listener
 */
export function initViewEvents(handleViewChange) {
    const viewToggle = document.getElementById('view-toggle');
    
    if (!viewToggle) {
        console.warn('View toggle not found');
        return;
    }

    const handleViewClick = (e) => {
        e.preventDefault();

        const buttonId = 'view-toggle';
        if (!safeThrottle(buttonId, () => {
            const isListView = viewToggle.classList.contains('list-view');
            const newViewMode = isListView ? 'grid' : 'list';
            
            viewToggle.classList.toggle('list-view');
            currentState.viewMode = newViewMode;
            
            if (typeof handleViewChange === 'function') {
                handleViewChange(newViewMode);
            }
            
            showNotification(`${newViewMode === 'grid' ? 'Grid' : 'List'} Ansicht aktiviert`, 'info');
        }, 300)) {
            return;
        }
    };

    const handleViewKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            viewToggle.click();
        }
    };

    registerEventListener(viewToggle, 'click', handleViewClick, 'view-click');
    registerEventListener(viewToggle, 'keydown', handleViewKeyDown, 'view-keydown');
}

/**
 * Initializes sort event listener
 */
export function initSortEvents(handleSort) {
    const sortToggle = document.getElementById('sort-toggle');
    
    if (!sortToggle) {
        console.warn('Sort toggle not found');
        return;
    }

    const handleSortClick = (e) => {
        e.preventDefault();

        const buttonId = 'sort-toggle';
        if (!safeThrottle(buttonId, () => {
            const sortOptions = ['newest', 'rating', 'name', 'popular'];
            const currentIndex = sortOptions.indexOf(currentState.sortBy);
            const nextIndex = (currentIndex + 1) % sortOptions.length;
            const newSort = sortOptions[nextIndex];
            
            currentState.sortBy = newSort;
            
            const sortLabels = {
                'newest': 'Neueste',
                'rating': 'Beste Bewertung',
                'name': 'Name A-Z',
                'popular': 'Beliebteste'
            };
            
            const spanElement = sortToggle.querySelector('span');
            if (spanElement) {
                spanElement.textContent = sortLabels[newSort];
            }
            
            if (typeof handleSort === 'function') {
                handleSort(newSort);
            }
            
            showNotification(`Sortiert nach: ${sortLabels[newSort]}`, 'info');
        }, 300)) {
            return;
        }
    };

    const handleSortKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            sortToggle.click();
        }
    };

    registerEventListener(sortToggle, 'click', handleSortClick, 'sort-click');
    registerEventListener(sortToggle, 'keydown', handleSortKeyDown, 'sort-keydown');
}

// ===========================================
// SCROLL & RESIZE EVENTS
// ===========================================

/**
 * Initializes scroll-to-top event listener
 */
export function initScrollEvents() {
    const scrollTopBtn = document.getElementById('scroll-top');
    
    if (!scrollTopBtn) {
        console.warn('Scroll top button not found');
        return;
    }

    const handleScroll = () => {
        safeThrottle('scroll-throttle', () => {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        }, 100);
    };

    const handleScrollClick = (e) => {
        e.preventDefault();
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handleScrollKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            scrollTopBtn.click();
        }
    };

    registerEventListener(window, 'scroll', handleScroll, 'window-scroll');
    registerEventListener(scrollTopBtn, 'click', handleScrollClick, 'scroll-top-click');
    registerEventListener(scrollTopBtn, 'keydown', handleScrollKeyDown, 'scroll-top-keydown');
}

/**
 * Initializes resize event listener
 */
export function initResizeEvents(handleResize) {
    const handleWindowResize = () => {
        safeDebounce('resize', () => {
            if (typeof handleResize === 'function') {
                handleResize();
            }
        }, 250);
    };

    registerEventListener(window, 'resize', handleWindowResize, 'window-resize');
}

/**
 * Initializes ranking refresh event listener
 */
export function initRankingEvents(handleRankingRefresh) {
    const refreshBtn = document.getElementById('refresh-ranking');
    
    if (!refreshBtn || typeof handleRankingRefresh !== 'function') {
        console.warn('Refresh ranking button not found or handler missing');
        return;
    }

    const handleRefreshClick = async (e) => {
        e.preventDefault();

        const buttonId = 'refresh-ranking';
        if (!safeThrottle(buttonId, async () => {
            refreshBtn.classList.add('loading', 'refreshing');
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                await handleRankingRefresh();
                showNotification('Ranking aktualisiert', 'success');
            } catch (error) {
                console.error('Error refreshing ranking:', error);
                showNotification('Fehler beim Aktualisieren des Rankings', 'error');
            } finally {
                setTimeout(() => {
                    refreshBtn.classList.remove('loading', 'refreshing');
                    refreshBtn.innerHTML = originalHTML;
                }, 500);
            }
        }, 300)) {
            return;
        }
    };

    const handleRefreshKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            refreshBtn.click();
        }
    };

    registerEventListener(refreshBtn, 'click', handleRefreshClick, 'refresh-click');
    registerEventListener(refreshBtn, 'keydown', handleRefreshKeyDown, 'refresh-keydown');
}

// ===========================================
// TOOL INTERACTION EVENTS
// ===========================================

/**
 * Initializes tool card interaction events
 */
export function initToolInteractionEvents() {
    const toolGrid = document.getElementById('tool-grid');
    
    if (!toolGrid) {
        console.warn('Tool grid not found');
        return;
    }

    const handleToolGridClick = async (e) => {
        const saveBtn = e.target.closest('[data-save]');
        if (saveBtn) {
            e.preventDefault();
            await handleSaveClick(saveBtn);
            return;
        }

        const shareBtn = e.target.closest('[data-share]');
        if (shareBtn) {
            e.preventDefault();
            await handleShareClick(shareBtn);
            return;
        }

        const toolLink = e.target.closest('a.tool-link');
        if (toolLink && !e.defaultPrevented) {
            handleToolLinkClick(toolLink).catch(() => {});
        }
    };

    const handleToolGridKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const interactiveElement = e.target.closest('[data-save], [data-share], a.tool-link');
            if (interactiveElement) {
                e.preventDefault();
                interactiveElement.click();
            }
        }
    };

    registerEventListener(toolGrid, 'click', handleToolGridClick, 'toolgrid-click');
    registerEventListener(toolGrid, 'keydown', handleToolGridKeyDown, 'toolgrid-keydown');
}

/**
 * Handles save tool click
 */
async function handleSaveClick(saveBtn) {
    const toolCard = saveBtn.closest('[data-id]');
    if (!toolCard) return;

    const toolId = toolCard.dataset.id;
    if (!toolId) return;

    const buttonId = `save-${toolId}`;
    if (!safeThrottle(buttonId, () => {
        saveBtn.classList.add('loading');
        const originalHTML = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const isSaved = saveBtn.classList.contains('saved');
        
        if (isSaved) {
            saveBtn.classList.remove('saved');
            const icon = saveBtn.querySelector('i');
            if (icon) icon.className = 'far fa-bookmark';
            showNotification('Aus Favoriten entfernt', 'info');
        } else {
            saveBtn.classList.add('saved');
            const icon = saveBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-bookmark';
            showNotification('Zu Favoriten hinzugefügt', 'success');
        }

        try {
            const savedTools = JSON.parse(localStorage.getItem('savedTools') || '[]');
            if (isSaved) {
                const index = savedTools.indexOf(toolId);
                if (index > -1) savedTools.splice(index, 1);
            } else {
                savedTools.push(toolId);
            }
            localStorage.setItem('savedTools', JSON.stringify(savedTools));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
        
        saveBtn.classList.remove('loading');
        saveBtn.innerHTML = originalHTML;
    }, 300)) {
        return;
    }
}

/**
 * Handles share tool click
 */
async function handleShareClick(shareBtn) {
    const toolCard = shareBtn.closest('[data-id]');
    if (!toolCard) return;

    const toolTitleElement = toolCard.querySelector('.tool-title');
    const toolLinkElement = toolCard.querySelector('.tool-link');
    
    if (!toolTitleElement || !toolLinkElement) return;

    const toolTitle = toolTitleElement.textContent;
    const toolLink = toolLinkElement.href || window.location.href;

    const buttonId = `share-${toolCard.dataset.id || 'unknown'}`;
    if (!safeThrottle(buttonId, async () => {
        shareBtn.classList.add('loading');
        const originalHTML = shareBtn.innerHTML;
        shareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            await navigator.clipboard.writeText(`${toolTitle}: ${toolLink}`);
            showNotification('Link kopiert!', 'success');
        } catch (error) {
            console.error('Error copying link:', error);
            showNotification('Link konnte nicht kopiert werden', 'error');
        } finally {
            shareBtn.classList.remove('loading');
            shareBtn.innerHTML = originalHTML;
        }
    }, 300)) {
        return;
    }
}

/**
 * Handles tool link click
 */
async function handleToolLinkClick(toolLink) {
    const toolCard = toolLink.closest('[data-id]');
    if (!toolCard) return;

    const toolId = toolCard.dataset.id;
    if (!toolId) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        pendingRequests.add(controller);
        
        await supabase.rpc('increment_tool_usage', 
            { tool_id: toolId },
            { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        pendingRequests.delete(controller);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.debug('Tool usage tracking failed:', error);
        }
    }
}

// ===========================================
// TOOLTIP EVENTS
// ===========================================

/**
 * Initialisiert Tooltip-Events
 */
function initTooltipEvents() {
    const handleDocumentClick = (e) => {
        const tooltipElement = e.target.closest('[data-tooltip]');
        
        document.querySelectorAll('[data-tooltip].active').forEach(activeTooltip => {
            if (activeTooltip !== tooltipElement) {
                activeTooltip.classList.remove('active');
            }
        });
        
        if (tooltipElement) {
            tooltipElement.classList.toggle('active');
            
            const autoCloseTimer = setTimeout(() => {
                tooltipElement.classList.remove('active');
            }, 3000);
            
            debounceTimers.set(`tooltip-${Date.now()}`, autoCloseTimer);
        }
    };

    registerEventListener(document, 'click', handleDocumentClick, 'tooltip-click');
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Generates a unique user ID for anonymous voting
 */
function getUserId() {
    try {
        let userId = localStorage.getItem('aiToolHubUserId');
        
        if (!userId) {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            userId = 'user_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            localStorage.setItem('aiToolHubUserId', userId);
        }
        
        return userId;
    } catch (error) {
        console.error('Error generating user ID:', error);
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

/**
 * Gets current application state
 */
export function getState() {
    return { ...currentState };
}

/**
 * Updates application state
 */
export function updateState(newState) {
    currentState = { ...currentState, ...newState };
}

/**
 * Resets all filters and search
 */
export function resetFilters(handleReset) {
    currentState.activeFilter = 'all';
    currentState.searchQuery = '';
    currentState.sortBy = 'newest';
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    const searchClear = document.getElementById('search-clear');
    if (searchClear) searchClear.style.display = 'none';
    
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
        }
    });
    
    const sortToggle = document.getElementById('sort-toggle');
    if (sortToggle) {
        const spanElement = sortToggle.querySelector('span');
        if (spanElement) spanElement.textContent = 'Neueste';
    }
    
    if (typeof handleReset === 'function') {
        handleReset();
    }
    
    showNotification('Alle Filter zurückgesetzt', 'info');
}

// ===========================================
// INITIALIZATION & CLEANUP
// ===========================================

/**
 * Initializes all event listeners
 */
export function initAllEvents(handlers = {}) {
    removeAllEvents();
    
    if (typeof handlers.handleSearch === 'function') {
        initSearchEvents(handlers.handleSearch);
    }
    
    if (typeof handlers.handleFilter === 'function') {
        initFilterEvents(handlers.handleFilter);
    }
    
    if (typeof handlers.handleVoteUpdate === 'function') {
        initVoteEvents(handlers.handleVoteUpdate);
    }
    
    initModalEvents();
    
    initThemeEvents();
    
    if (typeof handlers.handleViewChange === 'function') {
        initViewEvents(handlers.handleViewChange);
    }
    
    if (typeof handlers.handleSort === 'function') {
        initSortEvents(handlers.handleSort);
    }
    
    initScrollEvents();
    
    if (typeof handlers.handleResize === 'function') {
        initResizeEvents(handlers.handleResize);
    }
    
    if (typeof handlers.handleRankingRefresh === 'function') {
        initRankingEvents(handlers.handleRankingRefresh);
    }
    
    initToolInteractionEvents();
    
    initKeyboardShortcuts();
    
    initTooltipEvents();
    
    console.log('✅ All event listeners initialized');
}

/**
 * Entfernt ALLE Event-Listener
 */
export function removeAllEvents() {
    eventHandlerRegistry.forEach((listenerEntry, handlerId) => {
        removeEventListenerById(handlerId);
    });
    
    const elements = Array.from(elementListeners.keys());
    elements.forEach(element => {
        removeAllElementListeners(element);
    });
    
    cleanupTimersAndFlags();
    
    currentState.activeModal = null;
    
    console.log('🧹 All event listeners and timers removed');
}

// Globale Handler-Referenz
let globalHandlers = {};

/**
 * Sets handlers for event callbacks
 */
export function setEventHandlers(newHandlers) {
    globalHandlers = { ...globalHandlers, ...newHandlers };
}