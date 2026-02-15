/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM - MOBILE FIXED
   ══════════════════════════════════════════════════════════ */

'use strict';

// Helper: Get category name
function getCategoryName(category) {
  const names = {
    text: 'Text & Chat',
    image: 'Bilder & Design',
    code: 'Code & Dev',
    audio: 'Audio & Voice',
    video: 'Video & Film',
     'Daten & Analytics',
    other: 'Sonstiges'
  };
  return names[category] || names.other;
}

// Helper: Get category color
function getCategoryColor(category) {
  const colors = {
    text: '#00D4FF',
    image: '#E040FB',
    code: '#7C4DFF',
    audio: '#FF6B9D',
    video: '#448AFF',
     '#1DE9B6',
    other: '#B0BEC5'
  };
  return colors[category] || colors.other;
}

// Helper: Generate rating bar
function generateRatingBar(rating) {
  const percentage = (rating / 5) * 100;
  const color = rating >= 4 ? '#00FF9D' : rating >= 3 ? '#FFB800' : '#FF4466';
  
  return `
    <div class="rating-bar-container">
      <div class="rating-bar-bg">
        <div class="rating-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
      </div>
    </div>
  `;
}

// Helper: Escape HTML
function escapeHtml(text) {
  if (text == null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// Create back face HTML
function createBackFaceHTML(tool) {
  const categoryName = getCategoryName(tool.category);
  const categoryColor = getCategoryColor(tool.category);
  const ratingBar = generateRatingBar(tool.rating || 0);
  const priceTag = tool.is_free ? 'Kostenlos' : 'Premium';
  const priceColor = tool.is_free ? '#00FF9D' : '#FFB800';
  const tags = Array.isArray(tool.tags) ? tool.tags.slice(0, 3) : [];

  return `
    <button class="card-back-close" aria-label="Schließen" type="button">×</button>
    
    <div class="card-voting" data-tool-id="${tool.id}">
      <button class="vote-btn vote-btn-up" 
              data-vote="up" 
              aria-label="Upvote"
              type="button">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5L12 19M12 5L6 11M12 5L18 11"/>
        </svg>
      </button>
      <button class="vote-btn vote-btn-down" 
              data-vote="down" 
              aria-label="Downvote"
              type="button">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 19L12 5M12 19L18 13M12 19L6 13"/>
        </svg>
      </button>
    </div>

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
         class="card-back-button">
        Tool öffnen →
      </a>
    ` : ''}
  `;
}

// Initialize card for flipping
function initializeFlipCard(card) {
  if (card.dataset.flipInitialized === 'true') return;
  
  const toolId = card.dataset.toolId;
  if (!toolId) return;

  // Get tool data
  let tool = null;
  try {
    if (window.appState && window.appState.tools) {
      tool = window.appState.tools.find(t => String(t.id) === String(toolId));
    }
  } catch (err) {
    console.warn('Could not find tool data for flip', toolId);
    return;
  }

  if (!tool) return;

  // Wrap existing content in front face
  const existingContent = card.innerHTML;
  card.innerHTML = `
    <div class="card-face card-face-front">
      ${existingContent}
    </div>
    <div class="card-face card-face-back">
      ${createBackFaceHTML(tool)}
    </div>
  `;

  card.dataset.flipInitialized = 'true';
}

// Handle card click
function handleCardClick(e) {
  // Ignore if clicking on interactive elements
  if (e.target.closest('.card-back-close, .card-back-button, .vote-btn, .card-voting')) {
    return;
  }

  const card = e.target.closest('.card-square');
  if (!card) return;

  e.preventDefault();
  e.stopPropagation();

  // Initialize if needed
  if (card.dataset.flipInitialized !== 'true') {
    initializeFlipCard(card);
  }

  // Toggle flip
  card.classList.toggle('is-flipped');
  
  console.log('🔄 Card flipped:', card.dataset.toolName, card.classList.contains('is-flipped'));
}

// Handle close button
function handleCloseClick(e) {
  const closeBtn = e.target.closest('.card-back-close');
  if (!closeBtn) return;

  e.preventDefault();
  e.stopPropagation();

  const card = closeBtn.closest('.card-square');
  if (card) {
    card.classList.remove('is-flipped');
    console.log('❌ Card closed:', card.dataset.toolName);
  }
}

// Initialize flip system
function initFlipSystem() {
  const toolGrid = document.getElementById('tool-grid');
  if (!toolGrid) {
    console.warn('Tool grid not found, retrying...');
    setTimeout(initFlipSystem, 500);
    return;
  }

  // Remove old listeners
  if (toolGrid._flipClickHandler) {
    toolGrid.removeEventListener('click', toolGrid._flipClickHandler);
    toolGrid.removeEventListener('touchend', toolGrid._flipClickHandler);
  }

  // Add new listeners
  toolGrid._flipClickHandler = handleCardClick;
  toolGrid.addEventListener('click', handleCardClick);
  toolGrid.addEventListener('touchend', handleCardClick, { passive: false });

  // Close button handler
  document.addEventListener('click', handleCloseClick);
  document.addEventListener('touchend', handleCloseClick, { passive: false });

  console.log('✅ Flip system initialized');
}

// Wait for app to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initFlipSystem, 1000);
  });
} else {
  setTimeout(initFlipSystem, 1000);
}

// Re-initialize on quantum ready
window.addEventListener('quantumready', () => {
  setTimeout(initFlipSystem, 500);
});

console.log('📄 flip-card.js loaded');
