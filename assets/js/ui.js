// ===========================================
// UI COMPONENT GENERATOR
// AI Tool Hub - HTML Component Generation
// ===========================================

import { TOOL_DEFAULTS } from './config.js';

// ===========================================
// TOOL CARD GENERATORS
// ===========================================

/**
 * Generates HTML for a tool card with futuristic design
 * @param {Object} toolData - Tool object from database
 * @param {string} viewMode - 'grid' or 'list' view
 * @returns {string} - HTML string for the tool card
 */
export function createToolCard(toolData, viewMode = 'grid') {
    if (!toolData) return '';
    
    const {
        id,
        title,
        description,
        category,
        tags = [],
        rating = TOOL_DEFAULTS.RATING,
        usage_count = 0,
        is_free = false,
        is_featured = false,
        icon = 'fas fa-robot',
        link,
        vote_count = 0,
        vote_average = rating,
        created_at
    } = toolData;
    
    const isGridView = viewMode === 'grid';
    
    // Format rating to one decimal place
    const formattedRating = vote_average ? vote_average.toFixed(1) : rating.toFixed(1);
    
    // Generate stars HTML based on rating
    const starsHTML = generateStarsHTML(vote_average || rating);
    
    // Format tags (max 3 in grid view)
    const displayTags = isGridView ? tags.slice(0, 3) : tags;
    
    // Format date
    const formattedDate = formatDate(created_at);
    
    // Determine badge content
    const badgeText = is_free ? 'KOSTENLOS' : (is_featured ? 'FEATURED' : '');
    const badgeClass = is_free ? 'free-badge' : (is_featured ? 'featured-badge' : '');
    
    return `
        <article class="tool-card ${isGridView ? '' : 'list-view'}" data-id="${id}" data-category="${category || 'uncategorized'}">
            ${is_featured ? '<div class="featured-glow"></div>' : ''}
            
            <div class="tool-header">
                <div class="tool-icon">
                    <i class="${icon}"></i>
                </div>
                
                ${badgeText ? `
                <div class="tool-badge ${badgeClass}">
                    ${badgeText}
                </div>
                ` : ''}
            </div>
            
            <div class="tool-content">
                <h3 class="tool-title" title="${title}">
                    ${title}
                </h3>
                
                <p class="tool-description" title="${description}">
                    ${truncateText(description, isGridView ? 100 : 200)}
                </p>
                
                ${displayTags.length > 0 ? `
                <div class="tool-tags">
                    ${displayTags.map(tag => `
                        <span class="tool-tag">${tag}</span>
                    `).join('')}
                    ${tags.length > 3 && isGridView ? `<span class="tool-tag">+${tags.length - 3}</span>` : ''}
                </div>
                ` : ''}
            </div>
            
            <div class="tool-footer">
                <div class="tool-stats">
                    <div class="tool-rating" title="Bewertung: ${formattedRating}/5">
                        ${starsHTML}
                        <span class="rating-value">${formattedRating}</span>
                        <span class="rating-count">(${vote_count})</span>
                    </div>
                    
                    ${usage_count > 0 ? `
                    <div class="tool-usage" title="Verwendungen: ${usage_count}">
                        <i class="fas fa-users"></i>
                        <span>${abbreviateNumber(usage_count)}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${formattedDate ? `
                <div class="tool-date">
                    <i class="far fa-calendar"></i>
                    <span>${formattedDate}</span>
                </div>
                ` : ''}
            </div>
            
            ${link ? `
            <a href="${link}" target="_blank" rel="noopener noreferrer" class="tool-link">
                <span>Zum Tool</span>
                <i class="fas fa-external-link-alt"></i>
            </a>
            ` : ''}
            
            <div class="tool-actions">
                <button class="vote-btn" data-action="upvote" aria-label="Für dieses Tool stimmen">
                    <i class="fas fa-chevron-up"></i>
                    <span class="vote-count">0</span>
                </button>
                
                <button class="save-btn" aria-label="Tool speichern">
                    <i class="far fa-bookmark"></i>
                </button>
                
                <button class="share-btn" aria-label="Tool teilen">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        </article>
    `;
}

/**
 * Generates HTML for multiple tool cards
 * @param {Array} toolsArray - Array of tool objects
 * @param {string} viewMode - 'grid' or 'list' view
 * @returns {string} - Combined HTML string
 */
export function generateToolCardsHTML(toolsArray, viewMode = 'grid') {
    if (!Array.isArray(toolsArray) || toolsArray.length === 0) {
        return '<p class="no-tools-message">Keine Tools gefunden.</p>';
    }
    
    return toolsArray.map(tool => createToolCard(tool, viewMode)).join('');
}

/**
 * Renders tool cards into the tool grid container
 * @param {Array} toolsArray - Array of tool objects
 * @param {string} viewMode - 'grid' or 'list' view
 */
export function renderToolGrid(toolsArray, viewMode = 'grid') {
    const toolGrid = document.getElementById('tool-grid');
    if (!toolGrid) return;
    
    // Update grid class for view mode
    toolGrid.className = `tool-grid ${viewMode === 'list' ? 'list-view' : ''}`;
    
    if (!Array.isArray(toolsArray) || toolsArray.length === 0) {
        toolGrid.innerHTML = `
            <div class="empty-state show">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3 class="empty-title">Keine Tools gefunden</h3>
                <p class="empty-description">
                    Versuche, andere Suchbegriffe zu verwenden oder filtere nach einer anderen Kategorie.
                </p>
            </div>
        `;
        return;
    }
    
    toolGrid.innerHTML = generateToolCardsHTML(toolsArray, viewMode);
}

// ===========================================
// RANKING GENERATORS
// ===========================================

/**
 * Generates HTML for top 5 ranking cards
 * @param {Array} rankingArray - Array of ranked tool objects
 * @returns {string} - HTML string for ranking
 */
export function createRankingHTML(rankingArray) {
    if (!Array.isArray(rankingArray) || rankingArray.length === 0) {
        return `
            <div class="ranking-placeholder">
                <i class="fas fa-trophy"></i>
                <p>Noch kein Ranking verfügbar</p>
            </div>
        `;
    }
    
    // Limit to top 5
    const topFive = rankingArray.slice(0, 5);
    
    return topFive.map((item, index) => {
        const { tool, position = index + 1, score } = item;
        const toolData = tool || item;
        
        const medalClass = getMedalClass(position);
        const scoreFormatted = score ? score.toFixed(1) : '0.0';
        
        return `
            <div class="ranking-item" data-position="${position}" data-id="${toolData.id}">
                <div class="rank-header">
                    <div class="rank-badge ${medalClass}">
                        ${getMedalIcon(position)}
                    </div>
                    <div class="rank-info">
                        <h4 class="rank-title" title="${toolData.title}">
                            ${truncateText(toolData.title, 30)}
                        </h4>
                        <div class="rank-category">
                            <i class="fas fa-tag"></i>
                            <span>${toolData.category || 'Unkategorisiert'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="rank-stats">
                    <div class="rank-score">
                        <i class="fas fa-star"></i>
                        <span class="score-value">${scoreFormatted}</span>
                    </div>
                    
                    <div class="rank-metrics">
                        <span class="metric" title="Bewertungen">
                            <i class="fas fa-vote-yea"></i>
                            ${toolData.vote_count || 0}
                        </span>
                        <span class="metric" title="Verwendungen">
                            <i class="fas fa-users"></i>
                            ${abbreviateNumber(toolData.usage_count || 0)}
                        </span>
                    </div>
                </div>
                
                <div class="rank-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(100, (score || 0) * 20)}%"></div>
                    </div>
                    <span class="progress-label">Score: ${scoreFormatted}/5</span>
                </div>
                
                ${toolData.link ? `
                <a href="${toolData.link}" target="_blank" rel="noopener noreferrer" class="rank-link">
                    <i class="fas fa-external-link-alt"></i>
                    <span>Besuchen</span>
                </a>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Renders ranking into the sidebar container
 * @param {Array} rankingArray - Array of ranked tool objects
 */
export function renderRanking(rankingArray) {
    const rankingContainer = document.getElementById('ranking-container');
    const lastUpdateElement = document.getElementById('last-update');
    
    if (!rankingContainer) return;
    
    rankingContainer.innerHTML = createRankingHTML(rankingArray);
    
    // Update timestamp
    if (lastUpdateElement) {
        const now = new Date();
        lastUpdateElement.textContent = formatTime(now);
    }
}

// ===========================================
// FILTER GENERATORS
// ===========================================

/**
 * Generates HTML for category filters
 * @param {Array} categoriesArray - Array of category objects
 * @returns {string} - HTML string for filter buttons
 */
export function createCategoryFiltersHTML(categoriesArray) {
    if (!Array.isArray(categoriesArray) || categoriesArray.length === 0) {
        return '';
    }
    
    // Add "All" category at the beginning
    const allCategories = [
        { id: 'all', name: 'Alle Tools', icon: 'fas fa-th-large', count: 0 },
        ...categoriesArray
    ];
    
    return allCategories.map(category => {
        const countBadge = category.count > 0 ? `<span class="filter-count">${category.count}</span>` : '';
        
        return `
            <button class="filter-btn" data-filter="${category.id}">
                <i class="${category.icon || 'fas fa-tag'}"></i>
                <span>${category.name}</span>
                ${countBadge}
            </button>
        `;
    }).join('');
}

/**
 * Renders category filters into the filter container
 * @param {Array} categoriesArray - Array of category objects
 */
export function renderCategoryFilters(categoriesArray) {
    const filterContainer = document.getElementById('filter-container');
    if (!filterContainer) return;
    
    filterContainer.innerHTML = createCategoryFiltersHTML(categoriesArray);
}

// ===========================================
// HERO STATISTICS
// ===========================================

/**
 * Updates hero section statistics
 * @param {Object} stats - Statistics object
 */
export function updateHeroStats(stats) {
    const totalTools = document.getElementById('total-tools');
    const updatedToday = document.getElementById('updated-today');
    const freeTools = document.getElementById('free-tools');
    
    if (totalTools) totalTools.textContent = stats.total || 0;
    if (updatedToday) updatedToday.textContent = stats.updatedToday || 0;
    if (freeTools) freeTools.textContent = stats.free || 0;
}

// ===========================================
// MODAL CONTENT
// ===========================================

/**
 * Populates modal content
 * @param {string} modalId - ID of the modal
 * @param {string} content - HTML content
 */
export function populateModal(modalId, content) {
    const modalContent = document.getElementById(`${modalId}-content`);
    if (modalContent) {
        modalContent.innerHTML = content;
    }
}

// ===========================================
// LOADING STATES
// ===========================================

/**
 * Shows loading spinner in tool grid
 */
export function showLoadingSpinner() {
    const toolGrid = document.getElementById('tool-grid');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    if (toolGrid) {
        toolGrid.innerHTML = '';
    }
    
    if (loadingSpinner) {
        loadingSpinner.style.display = 'flex';
    }
}

/**
 * Hides loading spinner
 */
export function hideLoadingSpinner() {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

/**
 * Shows empty state message
 */
export function showEmptyState(message = 'Keine Tools gefunden.') {
    const toolGrid = document.getElementById('tool-grid');
    if (toolGrid) {
        toolGrid.innerHTML = `
            <div class="empty-state show">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3 class="empty-title">${message}</h3>
                <p class="empty-description">
                    Versuche, andere Suchbegriffe zu verwenden oder filtere nach einer anderen Kategorie.
                </p>
            </div>
        `;
    }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Generates stars HTML based on rating
 * @param {number} rating - Rating from 0-5
 * @returns {string} - HTML stars
 */
function generateStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHTML = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (halfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }
    
    return starsHTML;
}

/**
 * Gets medal class based on position
 * @param {number} position - Ranking position
 * @returns {string} - CSS class
 */
function getMedalClass(position) {
    switch(position) {
        case 1: return 'gold';
        case 2: return 'silver';
        case 3: return 'bronze';
        default: return 'normal';
    }
}

/**
 * Gets medal icon based on position
 * @param {number} position - Ranking position
 * @returns {string} - Icon or number
 */
function getMedalIcon(position) {
    switch(position) {
        case 1: return '<i class="fas fa-medal"></i>';
        case 2: return '<i class="fas fa-medal"></i>';
        case 3: return '<i class="fas fa-medal"></i>';
        default: return position;
    }
}

/**
 * Truncates text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
}

/**
 * Abbreviates large numbers (e.g., 1500 -> 1.5k)
 * @param {number} num - Number to abbreviate
 * @returns {string} - Abbreviated number
 */
function abbreviateNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

/**
 * Formats date to German format
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // If less than 7 days ago, show relative time
    if (diffDays < 7) {
        if (diffDays === 0) return 'Heute';
        if (diffDays === 1) return 'Gestern';
        return `Vor ${diffDays} Tagen`;
    }
    
    // Otherwise show date
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Formats time to HH:MM format
 * @param {Date} date - Date object
 * @returns {string} - Formatted time
 */
function formatTime(date) {
    return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===========================================
// EXPORTS
// ===========================================

export default {
    createToolCard,
    generateToolCardsHTML,
    renderToolGrid,
    createRankingHTML,
    renderRanking,
    createCategoryFiltersHTML,
    renderCategoryFilters,
    updateHeroStats,
    populateModal,
    showLoadingSpinner,
    hideLoadingSpinner,
    showEmptyState
};