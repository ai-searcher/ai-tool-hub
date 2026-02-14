/**
 * ═══════════════════════════════════════════════════════════
 * FLIP CARD SYSTEM - WITH PROGRESS BAR RATING
 * Version: 3.1 - Waits for quantum:ready event
 * ══════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  console.log('🔄 FlipCard v3.1 loading (quantum:ready sync)...');

  let isInitialized = false;
  let toolsData = [];

  function init() {
    if (isInitialized) {
      console.log('⚠️ FlipCard: Already initialized, skipping');
      return;
    }
    
    const grid = document.querySelector('#tool-grid');
    if (!grid) {
      console.warn('⚠️ FlipCard: Grid not found, retrying...');
      setTimeout(init, 100);
      return;
    }

    // Get tools data from app state
    if (window.appState && window.appState.tools) {
      toolsData = window.appState.tools;
      console.log(`📦 FlipCard: Loaded ${toolsData.length} tools data`);
    } else {
      console.warn('⚠️ FlipCard: No appState.tools found!');
    }

    // Prepare all cards
    prepareAllCards();

    // Event listener
    grid.addEventListener('click', handleClick, false);
    document.addEventListener('keydown', handleKeydown);

    isInitialized = true;
    console.log('✅ FlipCard v3.1 ready');
  }

  /**
   * Prepare all cards with rich back faces
   */
  function prepareAllCards() {
    const cards = document.querySelectorAll('.card-square');
    let prepared = 0;

    console.log(`🔍 FlipCard: Found ${cards.length} cards`);

    cards.forEach(card => {
      if (!card.dataset.flipReady) {
        prepareCard(card);
        prepared++;
      }
    });

    console.log(`✅ FlipCard: ${prepared} cards prepared with progress bar rating`);
  }

  /**
   * Prepare single card with real data
   */
  function prepareCard(card) {
    card.dataset.flipReady = 'true';

    // Get tool ID
    const toolId = parseInt(card.dataset.toolId);
    
    // Find tool data
    const toolData = toolsData.find(t => t.id === toolId) || {
      title: card.dataset.toolName || 'Tool',
      description: 'Keine Beschreibung verfügbar',
      category: card.dataset.category || 'other',
      rating: 0,
      is_free: true,
      link: card.dataset.href || '',
      tags: []
    };

    console.log(`🔧 FlipCard: Preparing "${toolData.title}"`);

    // Wrap existing content
    const existingContent = card.innerHTML;
    const frontFace = document.createElement('div');
    frontFace.className = 'card-face card-face-front';
    frontFace.innerHTML = existingContent;

    // Create rich back face
    const backFace = document.createElement('div');
    backFace.className = 'card-face card-face-back';
    backFace.innerHTML = createBackFaceHTML(toolData);

    // Rebuild card
    card.innerHTML = '';
    card.appendChild(frontFace);
    card.appendChild(backFace);
  }

  /**
   * Create rich back face HTML
   */
  function createBackFaceHTML(tool) {
    const categoryName = getCategoryName(tool.category);
    const categoryColor = getCategoryColor(tool.category);
    const ratingBar = generateRatingBar(tool.rating || 0);
    const priceTag = tool.is_free ? 'Kostenlos' : 'Premium';
    const priceColor = tool.is_free ? '#00FF9D' : '#FFB800';
    const tags = Array.isArray(tool.tags) ? tool.tags.slice(0, 3) : [];

    return `
      <button class="card-back-close" aria-label="Schließen" type="button">×</button>
      
      <div class="card-back-header">
        <div class="card-back-category" style="background: ${categoryColor}20; color: ${categoryColor}; border: 1px solid ${categoryColor}40;">
          ${escapeHtml(categoryName)}
        </div>
        <div class="card-back-price" style="color: ${priceColor};">
          ${priceTag}
        </div>
      </div>

      <h3 class="card-back-title">${escapeHtml(tool.title)}</h3>

      <div class="card-back-rating">
        <span class="card-back-rating-value">${(tool.rating || 0).toFixed(1)}</span>
        ${ratingBar}
        <span class="card-back-rating-text">/5.0</span>
      </div>

      <p class="card-back-description">${escapeHtml(tool.description || 'Keine Beschreibung verfügbar')}</p>

      ${tags.length > 0 ? `
        <div class="card-back-tags">
          ${tags.map(tag => `<span class="card-back-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}

      ${tool.link ? `
        <a href="${escapeHtml(tool.link)}" 
           target="_blank" 
           rel="noopener noreferrer" 
           class="card-back-button"
           onclick="event.stopPropagation();">
          Tool öffnen →
        </a>
      ` : ''}
    `;
  }

  /**
   * Generate modern rating bar (Progress Bar)
   */
  function generateRatingBar(rating) {
    const percentage = (rating / 5) * 100;
    let color = '#00FF9D'; // Green for good
    
    if (rating < 3) {
      color = '#FF6B9D'; // Pink for bad
    } else if (rating < 4) {
      color = '#FFB800'; // Yellow for ok
    }
    
    return `
      <div class="rating-bar-container">
        <div class="rating-bar-bg">
          <div class="rating-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }

  /**
   * Get category display name
   */
  function getCategoryName(category) {
    const names = {
      text: 'Text AI',
      image: 'Bild AI',
      code: 'Code',
      audio: 'Audio',
      video: 'Video',
       data: 'Daten',
      other: 'Andere'
    };
    return names[category] || 'Andere';
  }

  /**
   * Get category color
   */
  function getCategoryColor(category) {
    const colors = {
      text: '#00D4FF',
      image: '#E040FB',
      code: '#7C4DFF',
      audio: '#FF6B9D',
      video: '#448AFF',
       data: '#1DE9B6',
      other: '#B0BEC5'
    };
    return colors[category] || '#B0BEC5';
  }

  /**
   * Handle clicks
   */
  function handleClick(e) {
    // Close button
    const closeBtn = e.target.closest('.card-back-close');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = closeBtn.closest('.card-square');
      if (card) {
        card.classList.remove('is-flipped');
        console.log('🔄 FlipCard: Card closed');
      }
      return;
    }

    // Link in back - let it work
    if (e.target.closest('.card-back-button')) {
      return;
    }

    // Card click
    const card = e.target.closest('.card-square');
    if (!card || !card.dataset.flipReady) return;

    if (card.classList.contains('is-flipped')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Close others
    document.querySelectorAll('.card-square.is-flipped').forEach(other => {
      if (other !== card) other.classList.remove('is-flipped');
    });

    // Flip
    card.classList.add('is-flipped');
    console.log('🔄 FlipCard: Card flipped:', card.dataset.toolName || 'Unknown');
  }

  /**
   * Handle keyboard
   */
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      const flipped = document.querySelectorAll('.card-square.is-flipped');
      if (flipped.length > 0) {
        flipped.forEach(card => card.classList.remove('is-flipped'));
        console.log('🔄 FlipCard: All cards closed (ESC)');
      }
    }
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION - Wait for quantum:ready event from app.js
  // ═══════════════════════════════════════════════════════════

  let readyReceived = false;

  // Listen for app.js ready signal
  window.addEventListener('quantum:ready', () => {
    console.log('🎯 FlipCard: Received quantum:ready event');
    readyReceived = true;
    setTimeout(init, 300);
  });

  // Fallback: If event doesn't fire within 3 seconds
  setTimeout(() => {
    if (!readyReceived && !isInitialized) {
      console.warn('⚠️ FlipCard: quantum:ready not received, starting anyway...');
      init();
    }
  }, 3000);

  // ═══════════════════════════════════════════════════════════
  // MUTATION OBSERVER - Re-prepare cards after grid changes
  // ═══════════════════════════════════════════════════════════

  const observer = new MutationObserver((mutations) => {
    console.log('🔄 FlipCard: Grid mutation detected, re-preparing...');
    if (window.appState && window.appState.tools) {
      toolsData = window.appState.tools;
    }
    prepareAllCards();
  });

  // Start observer
  const startObserver = () => {
    const grid = document.querySelector('#tool-grid');
    if (grid) {
      observer.observe(grid, { childList: true, subtree: true });
      console.log('✅ FlipCard: Mutation observer started');
    } else {
      setTimeout(startObserver, 200);
    }
  };

  // Start observer after short delay
  setTimeout(startObserver, 1000);

})();

/**
 * ═══════════════════════════════════════════════════════════
 * END FLIP CARD SYSTEM v3.1
 * ══════════════════════════════════════════════════════════
 */
