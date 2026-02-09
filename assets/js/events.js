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
// Debounce timers for buttons
const buttonDebounceTimers = new Map(); // NEU: Für Button-Debouncing
// Loading states for buttons
const buttonLoadingStates = new Map(); // NEU: Für Loading-States

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

    // NEU: Error-Handling für fehlende Elemente
    if (!searchInput || !searchButton) {
        console.warn('Search elements not found');
        return;
    }

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
    searchButton.addEventListener('click', (e) => {
        // NEU: Prevent default für Form-Buttons
        if (e.target.tagName === 'BUTTON' && e.target.type === 'submit') {
            e.preventDefault();
        }
        handleSearch(currentState.searchQuery, currentState.activeFilter);
    });

    // Enter key in search input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            // NEU: Prevent default
            e.preventDefault();
            handleSearch(currentState.searchQuery, currentState.activeFilter);
        }
    });

    // Clear search
    if (searchClear) {
        searchClear.addEventListener('click', (e) => {
            // NEU: Prevent default
            if (e.target.tagName === 'BUTTON') {
                e.preventDefault();
            }
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
    
    // NEU: Error-Handling für fehlende Elemente
    if (!filterContainer) {
        console.warn('Filter container not found');
        return;
    }

    // NEU: Erweiterte Event-Delegation mit besseren Selectors
    filterContainer.addEventListener('click', (e) => {
        // NEU: Bessere Selectors für Filter-Buttons
        const filterBtn = e.target.closest('button.filter-btn, .filter-btn[data-filter], [data-filter].btn');
        if (!filterBtn) return;

        const filter = filterBtn.dataset.filter;
        if (!filter) return;

        // NEU: Prevent default für Button-Clicks
        if (filterBtn.tagName === 'BUTTON') {
            e.preventDefault();
        }

        // NEU: Debouncing für schnelle Klicks
        const buttonId = `filter-${filter}`;
        if (buttonDebounceTimers.has(buttonId)) {
            clearTimeout(buttonDebounceTimers.get(buttonId));
        }
        
        // NEU: Visuelles Feedback (Loading-States)
        filterBtn.classList.add('loading');
        buttonLoadingStates.set(buttonId, true);

        // Setze Timer für Debouncing
        const timer = setTimeout(() => {
            // Update active filter
            currentState.activeFilter = filter;
            
            // Update UI
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('loading');
            });
            filterBtn.classList.add('active');
            filterBtn.classList.remove('loading');
            buttonLoadingStates.delete(buttonId);

            // Apply filter
            handleFilter(filter, currentState.searchQuery);
        }, 300); // 300ms Debounce

        buttonDebounceTimers.set(buttonId, timer);
    });

    // NEU: Tastatur-Navigation für Filter-Buttons
    filterContainer.addEventListener('keydown', (e) => {
        // Handle Enter and Space keys
        if (e.key === 'Enter' || e.key === ' ') {
            const filterBtn = e.target.closest('button.filter-btn, .filter-btn[data-filter], [data-filter].btn');
            if (!filterBtn) return;
            
            e.preventDefault();
            filterBtn.click();
        }
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
    
    // NEU: Error-Handling für fehlende Elemente
    if (!toolGrid) {
        console.warn('Tool grid not found');
        return;
    }

    // NEU: Erweiterte Event-Delegation mit besseren Selectors
    toolGrid.addEventListener('click', async (e) => {
        // NEU: Bessere Selectors für Vote-Buttons
        const voteBtn = e.target.closest('button.vote-btn, .vote-btn[data-action], [data-action].btn, .vote-button');
        if (!voteBtn) return;

        const toolCard = voteBtn.closest('.tool-card, [data-id]');
        if (!toolCard) return;

        const toolId = toolCard.dataset.id;
        const action = voteBtn.dataset.action;
        
        if (!toolId || !action) return;

        // NEU: Prevent default für Button-Clicks
        if (voteBtn.tagName === 'BUTTON') {
            e.preventDefault();
        }

        // Prevent multiple votes while processing
        if (voteBtn.classList.contains('voting')) return;
        
        // NEU: Debouncing für schnelle Klicks
        const buttonId = `vote-${toolId}-${action}`;
        if (buttonDebounceTimers.has(buttonId)) {
            return; // Ignoriere schnelle aufeinanderfolgende Klicks
        }

        voteBtn.classList.add('voting');
        
        // NEU: Visuelles Feedback (Loading-States)
        const originalHTML = voteBtn.innerHTML;
        voteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (voteBtn.querySelector('.vote-count')) {
            voteBtn.querySelector('.vote-count').style.visibility = 'hidden';
        }

        // Setze Debounce-Timer
        const timer = setTimeout(async () => {
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
                // Entferne Loading-State
                voteBtn.classList.remove('voting');
                voteBtn.innerHTML = originalHTML;
                if (voteBtn.querySelector('.vote-count')) {
                    voteBtn.querySelector('.vote-count').style.visibility = 'visible';
                }
                
                // Entferne Debounce-Timer nach Verarbeitung
                buttonDebounceTimers.delete(buttonId);
            }
        }, 300); // 300ms Debounce

        buttonDebounceTimers.set(buttonId, timer);
    });

    // NEU: Tastatur-Navigation für Vote-Buttons
    toolGrid.addEventListener('keydown', (e) => {
        // Handle Enter and Space keys
        if (e.key === 'Enter' || e.key === ' ') {
            const voteBtn = e.target.closest('button.vote-btn, .vote-btn[data-action], [data-action].btn, .vote-button');
            if (!voteBtn) return;
            
            e.preventDefault();
            voteBtn.click();
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

    // NEU: Error-Handling für fehlende Elemente
    if (!imprintBtn || !imprintModal) {
        console.warn('Imprint modal elements not found');
    } else {
        // Open imprint modal
        imprintBtn.addEventListener('click', (e) => {
            // NEU: Prevent default für Button-Clicks
            if (imprintBtn.tagName === 'BUTTON') {
                e.preventDefault();
            }
            openModal(imprintModal);
        });
    }

    // NEU: Error-Handling für fehlende Elemente
    if (!privacyBtn || !privacyModal) {
        console.warn('Privacy modal elements not found');
    } else {
        // Open privacy modal
        privacyBtn.addEventListener('click', (e) => {
            // NEU: Prevent default für Button-Clicks
            if (privacyBtn.tagName === 'BUTTON') {
                e.preventDefault();
            }
            openModal(privacyModal);
        });
    }

    // Close buttons
    if (imprintClose) {
        imprintClose.addEventListener('click', (e) => {
            // NEU: Prevent default für Button-Clicks
            if (imprintClose.tagName === 'BUTTON') {
                e.preventDefault();
            }
            closeModal(imprintModal);
        });
    }
    if (privacyClose) {
        privacyClose.addEventListener('click', (e) => {
            // NEU: Prevent default für Button-Clicks
            if (privacyClose.tagName === 'BUTTON') {
                e.preventDefault();
            }
            closeModal(privacyModal);
        });
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
    
    // NEU: Error-Handling für fehlende Elemente
    if (!themeToggle) {
        console.warn('Theme toggle not found');
        return;
    }

    themeToggle.addEventListener('click', (e) => {
        // NEU: Prevent default für Button-Clicks
        if (themeToggle.tagName === 'BUTTON') {
            e.preventDefault();
        }

        // NEU: Debouncing für schnelle Klicks
        const buttonId = 'theme-toggle';
        if (buttonDebounceTimers.has(buttonId)) {
            return;
        }

        // NEU: Visuelles Feedback (Loading-States)
        themeToggle.classList.add('loading');
        const originalHTML = themeToggle.innerHTML;
        themeToggle.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const timer = setTimeout(() => {
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
            
            // Entferne Loading-State
            themeToggle.classList.remove('loading');
            themeToggle.innerHTML = originalHTML;
            buttonDebounceTimers.delete(buttonId);
        }, 300);

        buttonDebounceTimers.set(buttonId, timer);
    });

    // NEU: Tastatur-Navigation für Theme-Toggle
    themeToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            themeToggle.click();
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
    
    // NEU: Error-Handling für fehlende Elemente
    if (!viewToggle) {
        console.warn('View toggle not found');
        return;
    }

    viewToggle.addEventListener('click', (e) => {
        // NEU: Prevent default für Button-Clicks
        if (viewToggle.tagName === 'BUTTON') {
            e.preventDefault();
        }

        // NEU: Debouncing für schnelle Klicks
        const buttonId = 'view-toggle';
        if (buttonDebounceTimers.has(buttonId)) {
            return;
        }

        // NEU: Visuelles Feedback (Loading-States)
        viewToggle.classList.add('loading');
        const originalHTML = viewToggle.innerHTML;
        viewToggle.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const timer = setTimeout(() => {
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
            
            // Entferne Loading-State
            viewToggle.classList.remove('loading');
            viewToggle.innerHTML = originalHTML;
            buttonDebounceTimers.delete(buttonId);
        }, 300);

        buttonDebounceTimers.set(buttonId, timer);
    });

    // NEU: Tastatur-Navigation für View-Toggle
    viewToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            viewToggle.click();
        }
    });
}

/**
 * Initializes sort event listener
 */
export function initSortEvents(handleSort) {
    const sortToggle = document.getElementById('sort-toggle');
    
    // NEU: Error-Handling für fehlende Elemente
    if (!sortToggle) {
        console.warn('Sort toggle not found');
        return;
    }

    sortToggle.addEventListener('click', (e) => {
        // NEU: Prevent default für Button-Clicks
        if (sortToggle.tagName === 'BUTTON') {
            e.preventDefault();
        }

        // NEU: Debouncing für schnelle Klicks
        const buttonId = 'sort-toggle';
        if (buttonDebounceTimers.has(buttonId)) {
            return;
        }

        // NEU: Visuelles Feedback (Loading-States)
        sortToggle.classList.add('loading');
        const originalHTML = sortToggle.innerHTML;
        sortToggle.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const timer = setTimeout(() => {
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
            
            // Entferne Loading-State
            sortToggle.classList.remove('loading');
            sortToggle.innerHTML = originalHTML;
            buttonDebounceTimers.delete(buttonId);
        }, 300);

        buttonDebounceTimers.set(buttonId, timer);
    });

    // NEU: Tastatur-Navigation für Sort-Toggle
    sortToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            sortToggle.click();
        }
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
    
    // NEU: Error-Handling für fehlende Elemente
    if (!scrollTopBtn) {
        console.warn('Scroll top button not found');
        return;
    }

    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });

    // Scroll to top when clicked
    scrollTopBtn.addEventListener('click', (e) => {
        // NEU: Prevent default für Button-Clicks
        if (scrollTopBtn.tagName === 'BUTTON') {
            e.preventDefault();
        }
        
        // NEU: Visuelles Feedback (Loading-States)
        scrollTopBtn.classList.add('loading');
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Entferne Loading-State nach Abschluss
        setTimeout(() => {
            scrollTopBtn.classList.remove('loading');
        }, 1000);
    });

    // NEU: Tastatur-Navigation für Scroll-Top-Button
    scrollTopBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            scrollTopBtn.click();
        }
    });
}

/**
 * Initializes ranking refresh event listener
 */
export function initRankingEvents(handleRankingRefresh) {
    const refreshBtn = document.getElementById('refresh-ranking');
    
    // NEU: Error-Handling für fehlende Elemente
    if (!refreshBtn || !handleRankingRefresh) {
        console.warn('Refresh ranking button not found or handler missing');
        return;
    }

    refreshBtn.addEventListener('click', async (e) => {
        // NEU: Prevent default für Button-Clicks
        if (refreshBtn.tagName === 'BUTTON') {
            e.preventDefault();
        }

        // NEU: Debouncing für schnelle Klicks
        const buttonId = 'refresh-ranking';
        if (buttonDebounceTimers.has(buttonId)) {
            return;
        }

        // NEU: Visuelles Feedback (Loading-States)
        refreshBtn.classList.add('loading', 'refreshing');
        const originalHTML = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const timer = setTimeout(async () => {
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
                    buttonDebounceTimers.delete(buttonId);
                }, 500);
            }
        }, 300);

        buttonDebounceTimers.set(buttonId, timer);
    });

    // NEU: Tastatur-Navigation für Refresh-Button
    refreshBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            refreshBtn.click();
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
    
    // NEU: Error-Handling für fehlende Elemente
    if (!toolGrid) {
        console.warn('Tool grid not found');
        return;
    }

    // Save tool to favorites
    toolGrid.addEventListener('click', async (e) => {
        // NEU: Bessere Selectors für Save-Buttons
        const saveBtn = e.target.closest('button.save-btn, .save-btn, .bookmark-btn, [data-save]');
        if (!saveBtn) return;

        const toolCard = saveBtn.closest('.tool-card, [data-id]');
        if (!toolCard) return;

        const toolId = toolCard.dataset.id;
        if (!toolId) return;

        // NEU: Prevent default für Button-Clicks
        if (saveBtn.tagName === 'BUTTON') {
            e.preventDefault();
        }

        // NEU: Debouncing für schnelle Klicks
        const buttonId = `save-${toolId}`;
        if (buttonDebounceTimers.has(buttonId)) {
            return;
        }

        // NEU: Visuelles Feedback (Loading-States)
        saveBtn.classList.add('loading');
        const originalHTML = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const timer = setTimeout(() => {
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
            
            // Entferne Loading-State
            saveBtn.classList.remove('loading');
            saveBtn.innerHTML = originalHTML;
            buttonDebounceTimers.delete(buttonId);
        }, 300);

        buttonDebounceTimers.set(buttonId, timer);
    });

    // Share tool
    toolGrid.addEventListener('click', async (e) => {
        // NEU: Bessere Selectors für Share-Buttons
        const shareBtn = e.target.closest('button.share-btn, .share-btn, [data-share]');
        if (!shareBtn) return;

        const toolCard = shareBtn.closest('.tool-card, [data-id]');
        if (!toolCard) return;

        const toolTitle = toolCard.querySelector('.tool-title').textContent;
        const toolLink = toolCard.querySelector('.tool-link')?.href || window.location.href;

        // NEU: Prevent default für Button-Clicks
        if (shareBtn.tagName === 'BUTTON') {
            e.preventDefault();
        }

        // NEU: Debouncing für schnelle Klicks
        const buttonId = `share-${toolCard.dataset.id || 'unknown'}`;
        if (buttonDebounceTimers.has(buttonId)) {
            return;
        }

        // NEU: Visuelles Feedback (Loading-States)
        shareBtn.classList.add('loading');
        const originalHTML = shareBtn.innerHTML;
        shareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const timer = setTimeout(async () => {
            try {
                await navigator.clipboard.writeText(`${toolTitle}: ${toolLink}`);
                showNotification('Link kopiert!', 'success');
            } catch (error) {
                console.error('Error copying link:', error);
                showNotification('Link konnte nicht kopiert werden', 'error');
            } finally {
                // Entferne Loading-State
                shareBtn.classList.remove('loading');
                shareBtn.innerHTML = originalHTML;
                buttonDebounceTimers.delete(buttonId);
            }
        }, 300);

        buttonDebounceTimers.set(buttonId, timer);
    });

    // Tool link tracking
    toolGrid.addEventListener('click', async (e) => {
        // NEU: Bessere Selectors für Tool-Links
        const toolLink = e.target.closest('a.tool-link, .tool-link[href], .tool-card a[href]');
        if (!toolLink) return;

        const toolCard = toolLink.closest('.tool-card, [data-id]');
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

    // NEU: Tastatur-Navigation für Tool-Interaktionen
    toolGrid.addEventListener('keydown', (e) => {
        // Handle Enter and Space keys für interaktive Elemente
        if (e.key === 'Enter' || e.key === ' ') {
            const interactiveElement = e.target.closest('button.save-btn, .save-btn, button.share-btn, .share-btn, .tool-link');
            if (!interactiveElement) return;
            
            e.preventDefault();
            interactiveElement.click();
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