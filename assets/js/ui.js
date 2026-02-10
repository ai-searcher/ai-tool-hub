// ===========================================
// UI COMPONENT GENERATOR
// AI Tool Hub - HTML Component Generation
// Überarbeitet: Sanitizing, defensive Checks, classList statt className
// ===========================================

import { TOOL_DEFAULTS } from './config.js';

// ===========================================
// CACHE & STATE
// ===========================================

const DOM_CACHE = new Map();
let activeModals = new Set();

// ===========================================
// TOOL CARD GENERATORS
// ===========================================

/**
 * Sanitizes a value for safe insertion into attributes.
 * Uses escapeHTML for content safety, ensures string output.
 * @param {any} val
 * @returns {string}
 */
function escapeAttr(val) {
    if (val === null || val === undefined) return '';
    return escapeHTML(String(val));
}

/**
 * Sanitizes icon class string to allow only safe characters (letters, numbers, spaces, -, _, :)
 * Falls back to default icon.
 * @param {string} icon
 * @returns {string}
 */
function sanitizeIconClass(icon) {
    const defaultIcon = 'fas fa-robot';
    if (typeof icon !== 'string' || !icon.trim()) return defaultIcon;
    // allow letters, numbers, space, -, _, :, dot (rarely used), remove any other
    const cleaned = icon.replace(/[^\w\s\-\:\.]/g, '').trim();
    return cleaned || defaultIcon;
}

/**
 * Generates HTML for a tool card with futuristic design
 * @param {Object} toolData - Tool object from database
 * @param {string} viewMode - 'grid' or 'list' view
 * @returns {string} - HTML string for the tool card
 */
export function createToolCard(toolData, viewMode = 'grid') {
    if (!toolData || typeof toolData !== 'object') return '';

    const {
        id,
        title = 'Unbekanntes Tool',
        description = '',
        category,
        tags = [],
        rating = TOOL_DEFAULTS?.RATING ?? 0,
        usage_count = 0,
        is_free = false,
        is_featured = false,
        icon = 'fas fa-robot',
        link,
        demo_url,
        features = [],
        support_contact,
        vote_count = 0,
        vote_average = null,
        created_at,
        is_favorite = false,
        is_compared = false
    } = toolData;
    const safeLink = link || toolData.url || '';
    const safeDemoUrl = demo_url || toolData.demo || '';
    if (!id) return '';

    const isGridView = viewMode === 'grid';

    // Determine numeric rating robustly (allow 0)
    const numericVote = (vote_average !== null && vote_average !== undefined) ? Number(vote_average) : Number(rating || 0);
    const formattedRating = Number.isFinite(numericVote) ? numericVote.toFixed(1) : (Number(rating || 0).toFixed(1));

    // Generate stars
    const starsHTML = generateStarsHTML(numericVote);

    // Format tags (max 3 in grid view)
    const displayTags = Array.isArray(tags) ? (isGridView ? tags.slice(0, 3) : tags) : [];

    // Format date
    const formattedDate = formatDate(created_at);

    // Determine badge
    const badgeText = is_free ? 'KOSTENLOS' : (is_featured ? 'FEATURED' : '');
    const badgeClass = is_free ? 'free-badge' : (is_featured ? 'featured-badge' : '');

    // Check if has demo
    const hasDemo = !!safeDemoUrl;

    // sanitize icon
    const safeIconClass = sanitizeIconClass(icon);

    // sanitize attributes
    const safeId = escapeAttr(id);
    const safeCategory = escapeAttr(category || 'uncategorized');
    const safeIsFavorite = escapeAttr(!!is_favorite);
    const safeIsCompared = escapeAttr(!!is_compared);

    return `
        <article class="tool-card ${isGridView ? '' : 'list-view'}" 
                 data-id="${safeId}" 
                 data-category="${safeCategory}"
                 data-favorite="${safeIsFavorite}"
                 data-compared="${safeIsCompared}">
            
            ${is_featured ? '<div class="featured-glow"></div>' : ''}
            
            <div class="tool-header">
                <div class="tool-icon">
                    <i class="${escapeAttr(safeIconClass)}" aria-hidden="true"></i>
                </div>
                
                ${badgeText ? `
                <div class="tool-badge ${badgeClass}">
                    ${escapeHTML(badgeText)}
                </div>
                ` : ''}
            </div>
            
            <div class="tool-content">
                <h3 class="tool-title" title="${escapeAttr(title)}">
                    ${escapeHTML(title)}
                </h3>
                
                <p class="tool-description" title="${escapeAttr(description)}">
                    ${truncateText(description, isGridView ? 100 : 200)}
                </p>
                
                ${displayTags.length > 0 ? `
                <div class="tool-tags">
                    ${displayTags.map(tag => `
                        <span class="tool-tag">${escapeHTML(tag)}</span>
                    `).join('')}
                    ${Array.isArray(tags) && tags.length > 3 && isGridView ? `<span class="tool-tag">+${tags.length - 3}</span>` : ''}
                </div>
                ` : ''}
            </div>
            
            <div class="tool-footer">
                <div class="tool-stats">
                    <div class="tool-rating" title="Bewertung: ${formattedRating}/5">
                        ${starsHTML}
                        <span class="rating-value">${formattedRating}</span>
                        <span class="rating-count">(${escapeHTML(String(vote_count || 0))})</span>
                    </div>
                    
                    ${usage_count > 0 ? `
                    <div class="tool-usage" title="Verwendungen: ${usage_count}">
                        <i class="fas fa-users" aria-hidden="true"></i>
                        <span>${abbreviateNumber(usage_count)}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${formattedDate ? `
                <div class="tool-date">
                    <i class="far fa-calendar" aria-hidden="true"></i>
                    <span>${escapeHTML(formattedDate)}</span>
                </div>
                ` : ''}
            </div>
            
            ${safeLink ? `
            <a href="${escapeAttr(safeLink)}" target="_blank" rel="noopener noreferrer" class="tool-link">
                <span>Zum Tool</span>
                <i class="fas fa-external-link-alt" aria-hidden="true"></i>
            </a>
            ` : ''}
            
            <div class="tool-actions">
                <button class="vote-btn" data-action="upvote" data-tool-id="${safeId}" aria-label="Für dieses Tool stimmen">
                    <i class="fas fa-chevron-up" aria-hidden="true"></i>
                    <span class="vote-count">${escapeHTML(String(vote_count || 0))}</span>
                </button>
                
                <button class="save-btn ${is_favorite ? 'active' : ''}" data-tool-id="${safeId}" aria-label="Tool speichern">
                    <i class="${is_favorite ? 'fas' : 'far'} fa-bookmark" aria-hidden="true"></i>
                </button>
                
                ${hasDemo ? `
                <button class="demo-btn" data-demo-url="${escapeAttr(safeDemoUrl)}" data-tool-id="${safeId}" aria-label="Demo öffnen">
                    <i class="fas fa-play-circle" aria-hidden="true"></i>
                </button>
                ` : ''}
                
                <button class="share-btn" data-tool-id="${safeId}" aria-label="Tool teilen">
                    <i class="fas fa-share" aria-hidden="true"></i>
                </button>
                
                <button class="compare-btn ${is_compared ? 'active' : ''}" data-tool-id="${safeId}" aria-label="Zum Vergleich hinzufügen">
                    <i class="fas fa-balance-scale" aria-hidden="true"></i>
                </button>
            </div>
            
            <div class="quick-actions">
                ${safeLink ? `
                <button class="quick-action copy-link" data-url="${escapeAttr(safeLink)}" title="Link kopieren">
                    <i class="fas fa-link" aria-hidden="true"></i>
                </button>
                ` : ''}
                
                ${hasDemo ? `
                <button class="quick-action open-demo" data-url="${escapeAttr(safeDemoUrl)}" title="Demo öffnen">
                    <i class="fas fa-external-link-alt" aria-hidden="true"></i>
                </button>
                ` : ''}
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
    const toolGrid = getCachedElement('#tool-grid');
    if (!toolGrid) return;

    // Ensure base class exists and toggle list-view only
    toolGrid.classList.add('tool-grid');
    toolGrid.classList.toggle('list-view', viewMode === 'list');

    if (!Array.isArray(toolsArray) || toolsArray.length === 0) {
        toolGrid.innerHTML = `
            <div class="empty-state show">
                <div class="empty-icon">
                    <i class="fas fa-search" aria-hidden="true"></i>
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
// SKELETON LOADERS
// ===========================================

/**
 * Shows skeleton loader for tool cards
 * @param {number} count - Number of skeleton cards to show
 * @param {string} viewMode - 'grid' or 'list' view
 */
export function showSkeletonLoader(count = 8, viewMode = 'grid') {
    const toolGrid = getCachedElement('#tool-grid');
    if (!toolGrid) return;

    toolGrid.classList.add('tool-grid');
    toolGrid.classList.toggle('list-view', viewMode === 'list');

    const skeletonCards = Array.from({ length: count }, (_, i) => `
        <article class="tool-card skeleton ${viewMode === 'list' ? 'list-view' : ''}" data-skeleton-index="${i}">
            <div class="tool-header">
                <div class="tool-icon skeleton-shimmer" aria-hidden="true"></div>
                <div class="tool-badge skeleton-shimmer" aria-hidden="true"></div>
            </div>
            
            <div class="tool-content">
                <div class="tool-title skeleton-shimmer" style="width: 70%"></div>
                <div class="tool-description skeleton-shimmer" style="width: 90%"></div>
                <div class="tool-description skeleton-shimmer" style="width: 80%"></div>
                
                <div class="tool-tags" aria-hidden="true">
                    <span class="tool-tag skeleton-shimmer" style="width: 60px"></span>
                    <span class="tool-tag skeleton-shimmer" style="width: 80px"></span>
                    <span class="tool-tag skeleton-shimmer" style="width: 70px"></span>
                </div>
            </div>
            
            <div class="tool-footer">
                <div class="tool-stats">
                    <div class="tool-rating skeleton-shimmer" style="width: 100px" aria-hidden="true"></div>
                    <div class="tool-usage skeleton-shimmer" style="width: 80px" aria-hidden="true"></div>
                </div>
                
                <div class="tool-date skeleton-shimmer" style="width: 120px" aria-hidden="true"></div>
            </div>
            
            <div class="tool-actions">
                <button class="vote-btn skeleton-shimmer" aria-hidden="true"></button>
                <button class="save-btn skeleton-shimmer" aria-hidden="true"></button>
                <button class="share-btn skeleton-shimmer" aria-hidden="true"></button>
                <button class="compare-btn skeleton-shimmer" aria-hidden="true"></button>
            </div>
        </article>
    `).join('');

    toolGrid.innerHTML = skeletonCards;
}

/**
 * Hides skeleton loader and shows actual content
 */
export function hideSkeletonLoader() {
    const skeletons = document.querySelectorAll('.tool-card.skeleton');
    skeletons.forEach(skeleton => {
        skeleton.classList.add('fade-out');
        setTimeout(() => {
            if (skeleton && skeleton.parentNode) {
                skeleton.parentNode.removeChild(skeleton);
            }
        }, 300);
    });
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
                <i class="fas fa-trophy" aria-hidden="true"></i>
                <p>Noch kein Ranking verfügbar</p>
            </div>
        `;
    }

    const topFive = rankingArray.slice(0, 5);

    return topFive.map((item, index) => {
        const { tool, position = index + 1, score } = item;
        const toolData = tool || item;

        if (!toolData || !toolData.id) return '';

        const medalClass = getMedalClass(position);
        const scoreFormatted = (score !== undefined && score !== null) ? Number(score).toFixed(1) : '0.0';

        return `
            <div class="ranking-item" data-position="${escapeAttr(position)}" data-id="${escapeAttr(toolData.id)}">
                <div class="rank-header">
                    <div class="rank-badge ${medalClass}">
                        ${getMedalIcon(position)}
                    </div>
                    <div class="rank-info">
                        <h4 class="rank-title" title="${escapeAttr(toolData.title || '')}">
                            ${truncateText(toolData.title || '', 30)}
                        </h4>
                        <div class="rank-category">
                            <i class="fas fa-tag" aria-hidden="true"></i>
                            <span>${escapeHTML(toolData.category || 'Unkategorisiert')}</span>
                        </div>
                    </div>
                </div>
                
                <div class="rank-stats">
                    <div class="rank-score">
                        <i class="fas fa-star" aria-hidden="true"></i>
                        <span class="score-value">${escapeHTML(String(scoreFormatted))}</span>
                    </div>
                    
                    <div class="rank-metrics">
                        <span class="metric" title="Bewertungen">
                            <i class="fas fa-vote-yea" aria-hidden="true"></i>
                            ${escapeHTML(String(toolData.vote_count || 0))}
                        </span>
                        <span class="metric" title="Verwendungen">
                            <i class="fas fa-users" aria-hidden="true"></i>
                            ${abbreviateNumber(toolData.usage_count || 0)}
                        </span>
                    </div>
                </div>
                
                <div class="rank-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(100, (score || 0) * 20)}%"></div>
                    </div>
                    <span class="progress-label">Score: ${escapeHTML(String(scoreFormatted))}/5</span>
                </div>
                
                ${toolData.link ? `
                 <a href="${escapeAttr(toolData.link)}" target="_blank" rel="noopener noreferrer" class="rank-link">
                    <i class="fas fa-external-link-alt" aria-hidden="true"></i>
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
    const rankingContainer = getCachedElement('#ranking-container');
    const lastUpdateElement = getCachedElement('#last-update');

    if (!rankingContainer) return;

    rankingContainer.innerHTML = createRankingHTML(rankingArray);

    if (lastUpdateElement) {
        const now = new Date();
        lastUpdateElement.textContent = formatTime(now);
    }
}

// ===========================================
// FILTER GENERATORS
// ===========================================

/**
 * Generates HTML for category filters (TEXT-ONLY)
 * @param {Array} categoriesArray - Array of category objects
 * @returns {string} - HTML string for filter buttons
 */
export function createCategoryFiltersHTML(categoriesArray) {
    if (!Array.isArray(categoriesArray) || categoriesArray.length === 0) {
        return '';
    }

    const allCategories = [
        { id: 'all', name: 'Alle Tools' },
        ...categoriesArray
    ];

    return allCategories.map(category => {
        if (!category || !category.id) return '';
        return `
            <button class="filter-btn" data-filter="${escapeAttr(category.id)}">
                <span>${escapeHTML(category.name || category.id)}</span>
            </button>
        `;
    }).join('');
}

/**
 * Renders mobile dropdown for category filters
 * @param {Array} categoriesArray - Array of category objects
 */
export function renderMobileFilterDropdown(categoriesArray) {
    const header = getCachedElement('.filter-nav .header-container') || document.querySelector('.filter-nav .header-container');
    if (!header) return;

    let dropdown = document.getElementById('filter-dropdown');

    if (!dropdown) {
        dropdown = document.createElement('select');
        dropdown.id = 'filter-dropdown';
        dropdown.className = 'filter-dropdown';
        dropdown.setAttribute('aria-label', 'Kategorie-Filter');

        const controls = header.querySelector('.filter-controls');
        const container = header.querySelector('#filter-container');

        if (controls && container) {
            header.insertBefore(dropdown, container);
        } else if (controls) {
            controls.insertAdjacentElement('afterend', dropdown);
        } else {
            header.insertBefore(dropdown, header.firstChild);
        }
    }

    const allCategories = [
        { id: 'all', name: 'Alle Tools' },
        ...categoriesArray
    ];

    dropdown.innerHTML = allCategories.map(cat =>
        `<option value="${escapeAttr(cat.id)}">${escapeHTML(cat.name || cat.id)}</option>`
    ).join('');

    if (!dropdown.dataset.bound) {
        dropdown.dataset.bound = 'true';

        const handleChange = (e) => {
            const filterId = e.target.value;

            const button = document.querySelector(`.filter-btn[data-filter="${CSS.escape ? CSS.escape(filterId) : filterId}"]`);
            if (button) {
                button.click();
            } else {
                const event = new CustomEvent('filterChange', {
                    detail: { filter: filterId },
                    bubbles: true
                });
                document.dispatchEvent(event);
            }
        };

        dropdown.addEventListener('change', handleChange);
    }

    const activeButton = document.querySelector('.filter-btn.active');
    if (activeButton) {
        dropdown.value = activeButton.dataset.filter || 'all';
    } else {
        dropdown.value = 'all';
    }
}

/**
 * Synchronizes the mobile dropdown with the active filter
 * @param {string} activeFilterId - ID of the active filter
 */
export function syncFilterDropdown(activeFilterId) {
    const dropdown = document.getElementById('filter-dropdown');
    if (dropdown && dropdown.value !== String(activeFilterId)) {
        dropdown.value = activeFilterId;
    }
}

/**
 * Renders category filters into the filter container
 * @param {Array} categoriesArray - Array of category objects
 */
export function renderCategoryFilters(categoriesArray) {
    const filterContainer = getCachedElement('#filter-container');
    if (!filterContainer) return;

    filterContainer.innerHTML = createCategoryFiltersHTML(categoriesArray);

    renderMobileFilterDropdown(categoriesArray);

    const activeButton = document.querySelector('.filter-btn.active');
    if (activeButton) {
        syncFilterDropdown(activeButton.dataset.filter);
    } else {
        syncFilterDropdown('all');
    }
}

// ===========================================
// HERO STATISTICS
// ===========================================

/**
 * Updates hero section statistics
 * @param {Object} stats - Statistics object
 */
export function updateHeroStats(stats) {
    if (!stats || typeof stats !== 'object') return;

    const totalTools = getCachedElement('#total-tools');
    const updatedToday = getCachedElement('#updated-today');
    const freeTools = getCachedElement('#free-tools');

    if (totalTools) totalTools.textContent = escapeHTML(String(stats.total || 0));
    if (updatedToday) updatedToday.textContent = escapeHTML(String(stats.updatedToday || 0));
    if (freeTools) freeTools.textContent = escapeHTML(String(stats.free || 0));
}

// ===========================================
// MODAL MANAGEMENT
// ===========================================

/**
 * Safely opens a modal by ID
 * @param {string} modalId - ID of the modal to open
 */
export function openModal(modalId) {
    const modal = getCachedElement(`#${modalId}`);
    if (!modal) return;

    closeAllModals();

    modal.classList.add('active');
    document.body.classList.add('modal-open');

    activeModals.add(modalId);

    const event = new CustomEvent('modalOpened', {
        detail: { modalId }
    });
    document.dispatchEvent(event);
}

/**
 * Safely closes a modal by ID
 * @param {string} modalId - ID of the modal to close
 */
export function closeModal(modalId) {
    const modal = getCachedElement(`#${modalId}`);
    if (!modal) return;

    modal.classList.remove('active');
    activeModals.delete(modalId);

    if (activeModals.size === 0) {
        document.body.classList.remove('modal-open');
    }

    const event = new CustomEvent('modalClosed', { detail: { modalId } });
    document.dispatchEvent(event);
}

/**
 * Closes all open modals
 */
export function closeAllModals() {
    activeModals.forEach(modalId => {
        const modal = getCachedElement(`#${modalId}`);
        if (modal) {
            modal.classList.remove('active');
        }
    });

    activeModals.clear();
    document.body.classList.remove('modal-open');
}

/**
 * Populates modal content
 * @param {string} modalId - ID of the modal
 * @param {string} content - HTML content
 */
export function populateModal(modalId, content) {
    const modalContent = getCachedElement(`#${modalId}-content`);
    if (modalContent) {
        modalContent.innerHTML = content || '';
    }
}

// ===========================================
// DETAIL VIEW (MODAL)
// ===========================================

/**
 * Generates HTML for tool detail modal
 * @param {Object} toolData - Complete tool data
 * @returns {string} - HTML string for detail view
 */
export function createToolDetailHTML(toolData) {
    if (!toolData || typeof toolData !== 'object') return '';

    const {
        id,
        title = 'Unbekanntes Tool',
        description = '',
        category,
        tags = [],
        rating = 0,
        usage_count = 0,
        is_free = false,
        icon = 'fas fa-robot',
        link,
        demo_url,
        features = [],
        support_contact,
        vote_count = 0,
        vote_average = null,
        created_at,
        is_favorite = false
    } = toolData;

    const numericVote = (vote_average !== null && vote_average !== undefined) ? Number(vote_average) : Number(rating || 0);
    const formattedRating = Number.isFinite(numericVote) ? numericVote.toFixed(1) : Number(rating || 0).toFixed(1);
    const starsHTML = generateStarsHTML(numericVote);
    const formattedDate = formatDate(created_at);

    const safeIcon = sanitizeIconClass(icon);
    const safeId = escapeAttr(id);

    return `
        <div class="tool-detail" data-tool-id="${safeId}">
            <div class="detail-header">
                <div class="detail-icon">
                    <i class="${escapeAttr(safeIcon)}" aria-hidden="true"></i>
                </div>
                <div class="detail-title-section">
                    <h2 class="detail-title">${escapeHTML(title)}</h2>
                    <div class="detail-category">
                        <i class="fas fa-tag" aria-hidden="true"></i>
                        <span>${escapeHTML(category || 'Unkategorisiert')}</span>
                    </div>
                </div>
                <div class="detail-actions">
                    <button class="detail-favorite ${is_favorite ? 'active' : ''}" data-tool-id="${safeId}">
                        <i class="${is_favorite ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
                    </button>
                    <button class="detail-close" aria-label="Schließen">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            
            <div class="detail-content">
                <div class="detail-description">
                    <h3>Beschreibung</h3>
                    <p>${escapeHTML(description)}</p>
                </div>
                
                ${Array.isArray(features) && features.length > 0 ? `
                <div class="detail-features">
                    <h3>Funktionen</h3>
                    <ul>
                        ${features.map(feature => `
                            <li><i class="fas fa-check" aria-hidden="true"></i> ${escapeHTML(feature)}</li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div class="detail-meta">
                    <div class="meta-item">
                        <span class="meta-label">Bewertung:</span>
                        <div class="meta-value rating">
                            ${starsHTML}
                            <strong>${formattedRating}</strong>
                            <span>(${escapeHTML(String(vote_count || 0))} Stimmen)</span>
                        </div>
                    </div>
                    
                    <div class="meta-item">
                        <span class="meta-label">Verwendungen:</span>
                        <span class="meta-value">
                            <i class="fas fa-users" aria-hidden="true"></i>
                            ${abbreviateNumber(usage_count)}
                        </span>
                    </div>
                    
                    <div class="meta-item">
                        <span class="meta-label">Preis:</span>
                        <span class="meta-value ${is_free ? 'free' : 'paid'}">
                            ${is_free ? 'Kostenlos' : 'Bezahlung erforderlich'}
                        </span>
                    </div>
                    
                    ${formattedDate ? `
                    <div class="meta-item">
                        <span class="meta-label">Hinzugefügt:</span>
                        <span class="meta-value">
                            <i class="far fa-calendar" aria-hidden="true"></i>
                            ${escapeHTML(formattedDate)}
                        </span>
                    </div>
                    ` : ''}
                    
                    ${support_contact ? `
                    <div class="meta-item">
                        <span class="meta-label">Support:</span>
                        <span class="meta-value">
                            <i class="fas fa-headset" aria-hidden="true"></i>
                            ${escapeHTML(support_contact)}
                        </span>
                    </div>
                    ` : ''}
                </div>
                
                ${Array.isArray(tags) && tags.length > 0 ? `
                <div class="detail-tags">
                    <h3>Tags</h3>
                    <div class="tags-list">
                        ${tags.map(tag => `
                            <span class="detail-tag">${escapeHTML(tag)}</span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="detail-footer">
                ${safeLink ? `
                <a href="${escapeAttr(safeLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                    <i class="fas fa-external-link-alt" aria-hidden="true"></i>
                    Zum Tool
                </a>
                ` : ''}
                
                ${safeDemoUrl ? `
                <a href="${escapeAttr(safeDemoUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                    <i class="fas fa-play-circle" aria-hidden="true"></i>
                    Demo öffnen
                </a>
                ` : ''}
                
                ${safeLink ? `
                <button class="btn btn-outline copy-link" data-url="${escapeAttr(safeLink)}">
                    <i class="fas fa-copy" aria-hidden="true"></i>
                    Link kopieren
                </button>
                ` : ''}
            </div>
        </div>
    `;
}

// ===========================================
// COMPARE VIEW FUNCTIONS
// ===========================================

/**
 * Updates compare button state
 * @param {string} toolId - Tool ID
 * @param {boolean} isCompared - Whether tool is in compare list
 */
export function updateCompareButton(toolId, isCompared) {
    if (!toolId) return;
    const safeId = CSS.escape ? CSS.escape(String(toolId)) : String(toolId);
    const buttons = document.querySelectorAll(`.compare-btn[data-tool-id="${safeId}"]`);
    buttons.forEach(btn => {
        btn.classList.toggle('active', !!isCompared);
        btn.setAttribute('aria-label', isCompared ? 'Aus Vergleich entfernen' : 'Zum Vergleich hinzufügen');
    });
}

/**
 * Updates favorite button state
 * @param {string} toolId - Tool ID
 * @param {boolean} isFavorite - Whether tool is favorited
 */
export function updateFavoriteButton(toolId, isFavorite) {
    if (!toolId) return;
    const safeId = CSS.escape ? CSS.escape(String(toolId)) : String(toolId);
    const buttons = document.querySelectorAll(`.save-btn[data-tool-id="${safeId}"]`);
    buttons.forEach(btn => {
        btn.classList.toggle('active', !!isFavorite);
        // Replace inner icon only, avoid removing other attributes accidentally
        btn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-bookmark" aria-hidden="true"></i>`;
        btn.setAttribute('aria-label', isFavorite ? 'Von Favoriten entfernen' : 'Tool speichern');
    });
}

// ===========================================
// LOADING STATES
// ===========================================

/**
 * Shows loading spinner in tool grid
 */
export function showLoadingSpinner() {
    const toolGrid = getCachedElement('#tool-grid');
    const loadingSpinner = getCachedElement('#loading-spinner');

    if (toolGrid) {
        // keep structure but clear content
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
    const loadingSpinner = getCachedElement('#loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = '';
    }
}

/**
 * Shows empty state message
 */
export function showEmptyState(message = 'Keine Tools gefunden.') {
    const toolGrid = getCachedElement('#tool-grid');
    if (toolGrid) {
        toolGrid.innerHTML = `
            <div class="empty-state show">
                <div class="empty-icon">
                    <i class="fas fa-search" aria-hidden="true"></i>
                </div>
                <h3 class="empty-title">${escapeHTML(message)}</h3>
                <p class="empty-description">
                    Versuche, andere Suchbegriffe zu verwenden oder filtere nach einer anderen Kategorie.
                </p>
            </div>
        `;
    }
}

// ===========================================
// DIRECTORY MODAL HELPERS
// ===========================================

/**
 * Generates HTML for directory modal tabs (text-only)
 * @param {Array} categories - Array of category objects
 * @param {string} activeCategoryId - ID of the active category
 * @returns {string} - HTML string for tabs
 */
export function createDirectoryModalTabsHTML(categories, activeCategoryId = 'all') {
    if (!Array.isArray(categories) || categories.length === 0) {
        return '';
    }

    const allCategories = [
        { id: 'all', name: 'Alle' },
        ...categories
    ];

    return allCategories.map(category => {
        if (!category || !category.id) return '';

        const isActive = category.id === activeCategoryId;
        const activeClass = isActive ? 'active' : '';

        return `
            <button class="dir-tab ${activeClass}" data-category="${escapeAttr(category.id)}">
                ${escapeHTML(category.name || category.id)}
            </button>
        `;
    }).join('');
}

/**
 * Generates HTML for directory modal list items (text-only)
 * @param {Array} toolsArray - Array of tool objects
 * @returns {string} - HTML string for list items
 */
export function createDirectoryModalListHTML(toolsArray) {
    if (!Array.isArray(toolsArray) || toolsArray.length === 0) {
        return `
            <div class="dir-empty">
                <p>Keine Tools in dieser Kategorie gefunden.</p>
            </div>
        `;
    }

    return toolsArray.map(tool => {
        if (!tool || !tool.id) return '';

        const { id, title, category, description, is_free } = tool;

        return `
            <div class="dir-item" data-tool-id="${escapeAttr(id)}">
                <div class="dir-item-content">
                    <h4 class="dir-item-title">${escapeHTML(title || '')}</h4>
                    <div class="dir-item-meta">
                        <span class="dir-item-category">${escapeHTML(category || 'Unkategorisiert')}</span>
                        ${is_free ? '<span class="dir-item-free">Kostenlos</span>' : ''}
                    </div>
                    <p class="dir-item-description">${truncateText(description || '', 80)}</p>
                </div>
                <button class="dir-jump" data-tool-id="${escapeAttr(id)}">
                    Zum Tool
                </button>
            </div>
        `;
    }).join('');
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Gets cached DOM element or queries and caches it
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null} - DOM element or null
 */
function getCachedElement(selector) {
    if (!selector || typeof selector !== 'string') return null;
    if (DOM_CACHE.has(selector)) {
        const element = DOM_CACHE.get(selector);
        if (element && document.contains(element)) {
            return element;
        }
        DOM_CACHE.delete(selector);
    }

    try {
        const element = document.querySelector(selector);
        if (element) {
            DOM_CACHE.set(selector, element);
        }
        return element;
    } catch (e) {
        // invalid selector
        return null;
    }
}

/**
 * Escapes HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHTML(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') text = String(text);
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Generates stars HTML based on rating
 * @param {number} rating - Rating from 0-5
 * @returns {string} - HTML stars
 */
function generateStarsHTML(rating) {
    const safeRating = Math.min(5, Math.max(0, Number(rating) || 0));
    const fullStars = Math.floor(safeRating);
    const halfStar = (safeRating - fullStars) >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    let starsHTML = '';

    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star" aria-hidden="true"></i>';
    }

    if (halfStar) {
        starsHTML += '<i class="fas fa-star-half-alt" aria-hidden="true"></i>';
    }

    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star" aria-hidden="true"></i>';
    }

    return starsHTML;
}

/**
 * Gets medal class based on position
 * @param {number} position - Ranking position
 * @returns {string} - CSS class
 */
function getMedalClass(position) {
    switch (position) {
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
    switch (position) {
        case 1: return '<i class="fas fa-medal" aria-hidden="true"></i>';
        case 2: return '<i class="fas fa-medal" aria-hidden="true"></i>';
        case 3: return '<i class="fas fa-medal" aria-hidden="true"></i>';
        default: return escapeHTML(String(position));
    }
}

/**
 * Truncates text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncateText(text, maxLength = 100) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') text = String(text);
    if (text.length <= maxLength) return escapeHTML(text);

    return escapeHTML(text.substring(0, maxLength)) + '...';
}

/**
 * Abbreviates large numbers (e.g., 1500 -> 1.5k)
 * @param {number} num - Number to abbreviate
 * @returns {string} - Abbreviated number
 */
function abbreviateNumber(num) {
    const number = Number(num) || 0;

    if (number >= 1000000) {
        return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (number >= 1000) {
        return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return String(number);
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

    if (diffDays < 7) {
        if (diffDays === 0) return 'Heute';
        if (diffDays === 1) return 'Gestern';
        return `Vor ${diffDays} Tagen`;
    }

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
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        date = new Date();
    }

    return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===========================================
// CLEANUP FUNCTION
// ===========================================

/**
 * Cleans up DOM cache and event listeners
 */
export function cleanup() {
    DOM_CACHE.clear();
    activeModals.clear();

    document.body.classList.remove('modal-open');
}

// ===========================================
// EXPORTS
// ===========================================

export default {
    createToolCard,
    generateToolCardsHTML,
    renderToolGrid,
    showSkeletonLoader,
    hideSkeletonLoader,
    createRankingHTML,
    renderRanking,
    createCategoryFiltersHTML,
    renderCategoryFilters,
    renderMobileFilterDropdown,
    syncFilterDropdown,
    updateHeroStats,
    openModal,
    closeModal,
    closeAllModals,
    populateModal,
    createToolDetailHTML,
    updateCompareButton,
    updateFavoriteButton,
    showLoadingSpinner,
    hideLoadingSpinner,
    showEmptyState,
    createDirectoryModalTabsHTML,
    createDirectoryModalListHTML,
    cleanup
};