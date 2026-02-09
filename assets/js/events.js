// ===========================================
// EVENT HANDLERS & LISTENERS
// AI Tool Hub - Event Management
// ===========================================

import { supabase, saveVote, loadMultipleToolVotes } from './supabase.js';
import { showNotification } from './utils.js';
import { UI_CONFIG } from './config.js';

// Einfache Platzhalter-Funktion
const updateUIAfterVote = () => {
    console.log("Vote würde UI aktualisieren");
};

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

// Debounce timer for search
let searchDebounceTimer;

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

    if (!searchInput || !searchButton) return;

    // Real-time search with debouncing
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        currentState.searchQuery = query;
        
        // Toggle clear button visibility
        if (searchClear) {
            searchClear.style.display = query ? 'block' : 'none';
        }

        // Clear previous timer
        clearTimeout(searchDebounceTimer);
        
        // Set new timer for debouncing
        searchDebounceTimer = setTimeout(() => {
            handleSearch(query, currentState.activeFilter);
        }, UI_CONFIG.DEBOUNCE_DELAY);
    });

    // Search button click
    searchButton.addEventListener('click', () => {
        handleSearch(currentState.searchQuery, currentState.activeFilter);
    });

    // Enter key in search input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch(currentState.searchQuery, currentState.activeFilter);
        }
    });

    // Clear search
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            currentState.searchQuery = '';
            searchClear.style.display = 'none';
            handleSearch('', currentState.activeFilter);
            searchInput.focus();
        });
    }
}

/**
 * Initializes filter category event listeners
 */
export function initFilterEvents(handleFilter) {
    const filterContainer = document.getElementById('filter-container');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('.filter-btn');
        if (!filterBtn) return;

        const filter = filterBtn.dataset.filter;
        if (!filter) return;

        // Update active filter
        currentState.activeFilter = filter;
        
        // Update UI
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        filterBtn.classList.add('active');

        // Apply filter
        handleFilter(filter, currentState.searchQuery);
    });
}

// ===========================================
// VOTING EVENTS
// ===========================================

/**
 * Initializes voting event listeners using event delegation
 */
export function initVoteEvents(handleVoteUpdate) {
    const toolGrid = document.getElementById('tool-grid');
    if (!toolGrid) return;

    toolGrid.addEventListener('click', async (e) => {
        // Check if click is on vote button
        const voteBtn = e.target.closest('.vote-btn');
        if (!voteBtn) return;

        const toolCard = voteBtn.closest('.tool-card');
        if (!toolCard) return;

        const toolId = toolCard.dataset.id;
        const action = voteBtn.dataset.action;
        
        if (!toolId || !action) return;

        // Prevent multiple votes while processing
        if (voteBtn.classList.contains('voting')) return;
        voteBtn.classList.add('voting');

        try {
            // Determine vote value (upvote = 1, downvote = -1)
            // For now, we'll implement only upvotes
            const voteValue = action === 'upvote' ? 1 : -1;
            
            // Generate a unique user identifier (in a real app, this would be based on user session)
            const userId = getUserId();
            
            // Save vote to database
            const result = await saveVote(toolId, voteValue, userId);
            
            if (result.success) {
                // Update UI immediately
                updateVoteUI(voteBtn, toolId, action);
                
                // Call external handler if provided
                if (handleVoteUpdate) {
                    handleVoteUpdate(toolId, result.data);
                }
                
                // Show success notification
                showNotification('Bewertung gespeichert!', 'success');
            } else {
                showNotification(result.message || 'Fehler beim Speichern der Bewertung', 'error');
            }
        } catch (error) {
            console.error('Error processing vote:', error);
            showNotification('Ein Fehler ist aufgetreten', 'error');
        } finally {
            voteBtn.classList.remove('voting');
        }
    });
}

/**
 * Updates the vote UI after a successful vote
 */
function updateVoteUI(voteBtn, toolId, action) {
    const voteCountElement = voteBtn.querySelector('.vote-count');
    if (voteCountElement) {
        const currentCount = parseInt(voteCountElement.textContent) || 0;
        const newCount = action === 'upvote' ? currentCount + 1 : Math.max(0, currentCount - 1);
        voteCountElement.textContent = newCount;
    }

    // Add visual feedback
    voteBtn.classList.add('voted');
    setTimeout(() => {
        voteBtn.classList.remove('voted');
    }, 1000);

    // Update tool's vote count in state
    if (currentState.votes[toolId]) {
        const currentVotes = currentState.votes[toolId];
        if (action === 'upvote') {
            currentState.votes[toolId] = {
                ...currentVotes,
                count: (currentVotes.count || 0) + 1
            };
        }
    }
}

// ===========================================
// MODAL EVENTS
// ===========================================

/**
 * Initializes modal event listeners
 */
export function initModalEvents() {
    // Imprint modal
    const imprintBtn = document.getElementById('imprint-btn');
    const imprintModal = document.getElementById('imprint-modal');
    const imprintClose = document.getElementById('imprint-close');
    const imprintOverlay = document.getElementById('imprint-overlay');

    // Privacy modal
    const privacyBtn = document.getElementById('privacy-btn');
    const privacyModal = document.getElementById('privacy-modal');
    const privacyClose = document.getElementById('privacy-close');
    const privacyOverlay = document.getElementById('privacy-overlay');

    // Open imprint modal
    if (imprintBtn && imprintModal) {
        imprintBtn.addEventListener('click', () => openModal(imprintModal));
    }

    // Open privacy modal
    if (privacyBtn && privacyModal) {
        privacyBtn.addEventListener('click', () => openModal(privacyModal));
    }

    // Close buttons
    if (imprintClose) {
        imprintClose.addEventListener('click', () => closeModal(imprintModal));
    }
    if (privacyClose) {
        privacyClose.addEventListener('click', () => closeModal(privacyModal));
    }

    // Overlay clicks
    if (imprintOverlay) {
        imprintOverlay.addEventListener('click', () => closeModal(imprintModal));
    }
    if (privacyOverlay) {
        privacyOverlay.addEventListener('click', () => closeModal(privacyModal));
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && currentState.activeModal) {
            closeModal(currentState.activeModal);
        }
    });

    // Close modal when clicking outside content
    document.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const modalContent = modal.querySelector('.modal-container');
            if (modalContent && !modalContent.contains(e.target)) {
                closeModal(modal);
            }
        });
    });
}

/**
 * Opens a modal dialog
 */
function openModal(modalElement) {
    if (!modalElement) return;
    
    // Close any open modal first
    if (currentState.activeModal) {
        closeModal(currentState.activeModal);
    }
    
    modalElement.classList.add('show');
    modalElement.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    currentState.activeModal = modalElement;
    
    // Focus first focusable element in modal
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
    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
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
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.add(savedTheme + '-mode');
}

/**
 * Initializes view mode toggle event listener
 */
export function initViewEvents(handleViewChange) {
    const viewToggle = document.getElementById('view-toggle');
    if (!viewToggle) return;

    viewToggle.addEventListener('click', () => {
        const isListView = viewToggle.classList.contains('list-view');
        const newViewMode = isListView ? 'grid' : 'list';
        
        // Toggle class on button
        viewToggle.classList.toggle('list-view');
        
        // Update state
        currentState.viewMode = newViewMode;
        
        // Call handler
        if (handleViewChange) {
            handleViewChange(newViewMode);
        }
        
        // Show notification
        showNotification(`${newViewMode === 'grid' ? 'Grid' : 'List'} Ansicht aktiviert`, 'info');
    });
}

/**
 * Initializes sort event listener
 */
export function initSortEvents(handleSort) {
    const sortToggle = document.getElementById('sort-toggle');
    if (!sortToggle) return;

    sortToggle.addEventListener('click', () => {
        // Cycle through sort options
        const sortOptions = ['newest', 'rating', 'name', 'popular'];
        const currentIndex = sortOptions.indexOf(currentState.sortBy);
        const nextIndex = (currentIndex + 1) % sortOptions.length;
        const newSort = sortOptions[nextIndex];
        
        // Update state
        currentState.sortBy = newSort;
        
        // Update button text
        const sortLabels = {
            'newest': 'Neueste',
            'rating': 'Beste Bewertung',
            'name': 'Name A-Z',
            'popular': 'Beliebteste'
        };
        
        sortToggle.querySelector('span').textContent = sortLabels[newSort];
        
        // Call handler
        if (handleSort) {
            handleSort(newSort);
        }
        
        // Show notification
        showNotification(`Sortiert nach: ${sortLabels[newSort]}`, 'info');
    });
}

// ===========================================
// SCROLL & NAVIGATION EVENTS
// ===========================================

/**
 * Initializes scroll-to-top event listener
 */
export function initScrollEvents() {
    const scrollTopBtn = document.getElementById('scroll-top');
    if (!scrollTopBtn) return;

    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });

    // Scroll to top when clicked
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * Initializes ranking refresh event listener
 */
export function initRankingEvents(handleRankingRefresh) {
    const refreshBtn = document.getElementById('refresh-ranking');
    if (!refreshBtn || !handleRankingRefresh) return;

    refreshBtn.addEventListener('click', async () => {
        // Add loading animation
        refreshBtn.classList.add('refreshing');
        
        try {
            await handleRankingRefresh();
            showNotification('Ranking aktualisiert', 'success');
        } catch (error) {
            console.error('Error refreshing ranking:', error);
            showNotification('Fehler beim Aktualisieren des Rankings', 'error');
        } finally {
            setTimeout(() => {
                refreshBtn.classList.remove('refreshing');
            }, 500);
        }
    });
}

// ===========================================
// TOOL INTERACTION EVENTS
// ===========================================

/**
 * Initializes tool card interaction events
 */
export function initToolInteractionEvents() {
    const toolGrid = document.getElementById('tool-grid');
    if (!toolGrid) return;

    // Save tool to favorites
    toolGrid.addEventListener('click', async (e) => {
        const saveBtn = e.target.closest('.save-btn');
        if (!saveBtn) return;

        const toolCard = saveBtn.closest('.tool-card');
        if (!toolCard) return;

        const toolId = toolCard.dataset.id;
        if (!toolId) return;

        // Toggle save state
        const isSaved = saveBtn.classList.contains('saved');
        
        if (isSaved) {
            saveBtn.classList.remove('saved');
            saveBtn.querySelector('i').className = 'far fa-bookmark';
            showNotification('Aus Favoriten entfernt', 'info');
        } else {
            saveBtn.classList.add('saved');
            saveBtn.querySelector('i').className = 'fas fa-bookmark';
            showNotification('Zu Favoriten hinzugefügt', 'success');
        }

        // Save to localStorage
        const savedTools = JSON.parse(localStorage.getItem('savedTools') || '[]');
        if (isSaved) {
            const index = savedTools.indexOf(toolId);
            if (index > -1) savedTools.splice(index, 1);
        } else {
            savedTools.push(toolId);
        }
        localStorage.setItem('savedTools', JSON.stringify(savedTools));
    });

    // Share tool
    toolGrid.addEventListener('click', async (e) => {
        const shareBtn = e.target.closest('.share-btn');
        if (!shareBtn) return;

        const toolCard = shareBtn.closest('.tool-card');
        if (!toolCard) return;

        const toolTitle = toolCard.querySelector('.tool-title').textContent;
        const toolLink = toolCard.querySelector('.tool-link')?.href || window.location.href;

        try {
            await navigator.clipboard.writeText(`${toolTitle}: ${toolLink}`);
            showNotification('Link kopiert!', 'success');
        } catch (error) {
            console.error('Error copying link:', error);
            showNotification('Link konnte nicht kopiert werden', 'error');
        }
    });

    // Tool link tracking
    toolGrid.addEventListener('click', async (e) => {
        const toolLink = e.target.closest('.tool-link');
        if (!toolLink) return;

        const toolCard = toolLink.closest('.tool-card');
        if (!toolCard) return;

        const toolId = toolCard.dataset.id;
        if (!toolId) return;

        // Increment usage count
        try {
            const response = await supabase.rpc('increment_tool_usage', { tool_id: toolId });
            if (response.error) {
                console.error('Error tracking tool usage:', response.error);
            }
        } catch (error) {
            console.error('Error tracking tool usage:', error);
        }
    });
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Generates a unique user ID for anonymous voting
 */
function getUserId() {
    let userId = localStorage.getItem('aiToolHubUserId');
    
    if (!userId) {
        // Generate a random user ID
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('aiToolHubUserId', userId);
    }
    
    return userId;
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
    
    // Reset UI
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    const searchClear = document.getElementById('search-clear');
    if (searchClear) searchClear.style.display = 'none';
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
        }
    });
    
    const sortToggle = document.getElementById('sort-toggle');
    if (sortToggle) {
        sortToggle.querySelector('span').textContent = 'Neueste';
    }
    
    // Call reset handler
    if (handleReset) {
        handleReset();
    }
    
    showNotification('Alle Filter zurückgesetzt', 'info');
}

// ===========================================
// INITIALIZATION
// ===========================================

/**
 * Initializes all event listeners
 */
export function initAllEvents(handlers = {}) {
    // Search and filter events
    if (handlers.handleSearch) {
        initSearchEvents(handlers.handleSearch);
    }
    
    if (handlers.handleFilter) {
        initFilterEvents(handlers.handleFilter);
    }
    
    // Voting events
    if (handlers.handleVoteUpdate) {
        initVoteEvents(handlers.handleVoteUpdate);
    }
    
    // Modal events
    initModalEvents();
    
    // Theme and view events
    initThemeEvents();
    
    if (handlers.handleViewChange) {
        initViewEvents(handlers.handleViewChange);
    }
    
    if (handlers.handleSort) {
        initSortEvents(handlers.handleSort);
    }
    
    // Scroll and navigation events
    initScrollEvents();
    
    if (handlers.handleRankingRefresh) {
        initRankingEvents(handlers.handleRankingRefresh);
    }
    
    // Tool interaction events
    initToolInteractionEvents();
    
    console.log('✅ All event listeners initialized');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    // Escape to close modal
    if (e.key === 'Escape' && currentState.activeModal) {
        closeModal(currentState.activeModal);
    }
    
    // Ctrl/Cmd + R to reset filters
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (handlers && handlers.handleReset) {
            resetFilters(handlers.handleReset);
        }
    }
});

// Global click handler for tooltips
document.addEventListener('click', (e) => {
    // Close all open tooltips
    const openTooltips = document.querySelectorAll('[data-tooltip].active');
    openTooltips.forEach(tooltip => {
        tooltip.classList.remove('active');
    });
    
    // Show tooltip on elements with data-tooltip attribute
    const tooltipElement = e.target.closest('[data-tooltip]');
    if (tooltipElement) {
        tooltipElement.classList.add('active');
    }
});

// Global handlers reference
let handlers = {};

/**
 * Sets handlers for event callbacks
 */
export function setEventHandlers(newHandlers) {
    handlers = { ...handlers, ...newHandlers };
}
