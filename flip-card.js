/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM V10.0 - WITH COLOR FLOW INTEGRATION
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 flip-card.js v10.0 loading...');

// Helper: Get category name
function getCategoryName(category) {
  const names = {
    text: 'Text',
    image: 'Bild',
    code: 'Code',
    audio: 'Audio',
    video: 'Video',
     'Daten',
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

// Helper: Escape HTML
function escapeHtml(text) {
  if (text == null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// Helper: Truncate text
function truncateText(text, maxLength) {
  if (!text) return '';
  text = String(text);
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Create COMPACT back face HTML
function createBackFaceHTML(tool) {
  const categoryName = getCategoryName(tool.category);
  const categoryColor = getCategoryColor(tool.category);
  const shortDescription = truncateText(tool.description, 60);
  const rating = (tool.rating || 0).toFixed(1);

  return `
    <div class="card-back-category" style="background: ${categoryColor}20; color: ${categoryColor}; border: 1px solid ${categoryColor}40;">
      ${escapeHtml(categoryName)}
    </div>

    <h3 class="card-back-title">${escapeHtml(tool.title)}</h3>

    <div class="card-back-rating">${rating}</div>

    <p class="card-back-description">${escapeHtml(shortDescription)}</p>

    <a href="${escapeHtml(tool.link)}" 
       target="_blank" 
       rel="noopener noreferrer" 
       class="card-back-button-link"
       onclick="event.stopPropagation();">
      Tool öffnen
    </a>
  `;
}

// Initialize card for flipping
function initializeFlipCard(card) {
  if (card.dataset.flipInitialized === 'true') return;
  
  const toolId = card.dataset.toolId;
  if (!toolId) {
    console.warn('❌ No toolId found');
    return;
  }

  // Get tool data
  let tool = null;
  try {
    if (window.appState && window.appState.tools) {
      tool = window.appState.tools.find(t => String(t.id) === String(toolId));
    }
  } catch (err) {
    console.error('❌ Error finding tool:', err);
    return;
  }

  if (!tool) {
    console.warn('❌ Tool not found for ID:', toolId);
    return;
  }

  // Wrap existing content in front face + add back face
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
  console.log('✅ Card initialized:', tool.title);
}

// ═══════════════════════════════════════════════════════════
// COLOR FLOW INTEGRATION
// ══════════════════════════════════════════════════════════

function toggleColorFlow(paused) {
  // Prüfe ob Color Flow System existiert
  if (window.pauseColorFlow && typeof window.pauseColorFlow === 'function') {
    window.pauseColorFlow(paused);
    console.log(paused ? '⏸️ Color Flow paused' : '▶️ Color Flow resumed');
  }
  
  // Alternative: Opacity reduzieren
  const canvas = document.querySelector('.connection-canvas, #connection-canvas, #grid-network-canvas');
  if (canvas) {
    canvas.style.opacity = paused ? '0.15' : '1';
    canvas.style.transition = 'opacity 0.4s ease';
  }
}

// Handle card click (toggle flip)
function handleCardClick(e) {
  // Ignore clicks on "Tool öffnen" link
  if (e.target.closest('.card-back-button-link')) {
    console.log('🚫 Link click ignored (opens tool)');
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
  
  // Pause/Resume Color Flow
  const anyFlipped = document.querySelector('.card-square.is-flipped');
  toggleColorFlow(!!anyFlipped);
  
  console.log('🔄 Card flipped:', card.dataset.toolName);
}

// Initialize flip system
function initFlipSystem() {
  const toolGrid = document.getElementById('tool-grid');
  if (!toolGrid) {
    console.warn('⚠️ Tool grid not found, retrying...');
    setTimeout(initFlipSystem, 300);
    return;
  }

  console.log('🎯 Initializing flip system...');

  // Remove old listeners
  if (toolGrid._flipClickHandler) {
    toolGrid.removeEventListener('click', toolGrid._flipClickHandler);
    toolGrid.removeEventListener('touchend', toolGrid._flipClickHandler);
  }

  // Add new listeners
  toolGrid._flipClickHandler = handleCardClick;
  toolGrid.addEventListener('click', handleCardClick);
  toolGrid.addEventListener('touchend', handleCardClick, { passive: false });

  console.log('✅ Flip system initialized!');
}

// ESC closes flipped cards + resumes Color Flow
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const flippedCards = document.querySelectorAll('.card-square.is-flipped');
    if (flippedCards.length > 0) {
      flippedCards.forEach(card => card.classList.remove('is-flipped'));
      toggleColorFlow(false); // Resume Color Flow
    }
  }
});

// Wait for DOM + app ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(initFlipSystem);
  });
} else {
  requestAnimationFrame(initFlipSystem);
}

window.addEventListener('quantumready', () => {
  setTimeout(initFlipSystem, 300);
});

console.log('✅ flip-card.js v10.0 loaded!');
