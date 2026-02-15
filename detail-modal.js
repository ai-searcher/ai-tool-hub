/* ═══════════════════════════════════════════════════════════
   DETAIL MODAL SYSTEM - Erweiterte Tool-Ansicht
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 detail-modal.js loading...');

// Create modal HTML structure
function createModalHTML() {
  const modalHTML = `
    <div id="tool-detail-modal" class="tool-modal" style="display: none;">
      <div class="tool-modal-overlay" onclick="window.closeToolDetailModal()"></div>
      <div class="tool-modal-content">
        <button class="tool-modal-close" onclick="window.closeToolDetailModal()" aria-label="Schließen">
          ×
        </button>
        <div id="tool-modal-body" class="tool-modal-body">
          <!-- Content wird dynamisch eingefügt -->
        </div>
      </div>
    </div>
  `;

  // Append to body
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer.firstElementChild);

  console.log('✅ Modal HTML created');
}

// Generate modal content
function generateModalContent(tool) {
  const tags = Array.isArray(tool.tags) ? tool.tags : [];
  const rating = (tool.rating || 0).toFixed(1);
  const priceTag = tool.is_free ? 'Kostenlos' : 'Premium';
  const priceColor = tool.is_free ? '#00FF9D' : '#FFB800';

  return `
    <div class="modal-header">
      <h2 class="modal-title">${escapeHtml(tool.title)}</h2>
      <div class="modal-meta">
        <span class="modal-category">${escapeHtml(tool.category || 'Other')}</span>
        <span class="modal-price" style="color: ${priceColor};">${priceTag}</span>
      </div>
    </div>

    <div class="modal-rating">
      <span class="modal-rating-value">${rating}</span>
      <span class="modal-rating-stars">${'⭐'.repeat(Math.round(tool.rating || 0))}</span>
      <span class="modal-rating-text">/5.0</span>
    </div>

    <div class="modal-description">
      <h3>Beschreibung</h3>
      <p>${escapeHtml(tool.description || 'Keine Beschreibung verfügbar')}</p>
    </div>

    ${tags.length > 0 ? `
      <div class="modal-tags">
        <h3>Tags</h3>
        <div class="modal-tags-list">
          ${tags.map(tag => `<span class="modal-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      </div>
    ` : ''}

    <div class="modal-actions">
      <a href="${escapeHtml(tool.link)}" 
         target="_blank" 
         rel="noopener noreferrer" 
         class="modal-button-primary">
        Tool öffnen →
      </a>
      <button onclick="window.closeToolDetailModal()" class="modal-button-secondary">
        Schließen
      </button>
    </div>
  `;
}

// Escape HTML helper
function escapeHtml(text) {
  if (text == null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// Open modal
window.openToolDetailModal = function(toolId) {
  console.log('🔓 Opening modal for tool ID:', toolId);

  // Get tool data
  let tool = null;
  try {
    if (window.appState && window.appState.tools) {
      tool = window.appState.tools.find(t => t.id === toolId || String(t.id) === String(toolId));
    }
  } catch (err) {
    console.error('❌ Error finding tool:', err);
    return;
  }

  if (!tool) {
    console.error('❌ Tool not found for ID:', toolId);
    return;
  }

  const modal = document.getElementById('tool-detail-modal');
  const modalBody = document.getElementById('tool-modal-body');

  if (!modal || !modalBody) {
    console.error('❌ Modal elements not found');
    return;
  }

  // Insert content
  modalBody.innerHTML = generateModalContent(tool);

  // Show modal
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  console.log('✅ Modal opened:', tool.title);
};

// Close modal
window.closeToolDetailModal = function() {
  const modal = document.getElementById('tool-detail-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    console.log('🔒 Modal closed');
  }
};

// ESC closes modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeToolDetailModal();
  }
});

// Initialize modal on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createModalHTML);
} else {
  createModalHTML();
}

console.log('✅ detail-modal.js loaded!');
