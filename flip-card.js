/**
 * ═══════════════════════════════════════════════════════════
 * FLIP CARD SYSTEM - GLITCH-FREE VERSION
 * Version: 2.0 - Robust & Smooth
 * ══════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  console.log('🔄 FlipCard v2.0 loading...');

  let isInitialized = false;

  function init() {
    if (isInitialized) return;
    
    const grid = document.querySelector('#tool-grid');
    if (!grid) {
      setTimeout(init, 100);
      return;
    }

    // Prepare all cards once
    prepareAllCards();

    // Single event listener on grid (Event Delegation)
    grid.addEventListener('click', handleClick, false);

    // ESC to close all
    document.addEventListener('keydown', handleKeydown);

    isInitialized = true;
    console.log('✅ FlipCard v2.0 ready');
  }

  /**
   * Prepare all cards with back faces
   */
  function prepareAllCards() {
    const cards = document.querySelectorAll('.card-square');
    let prepared = 0;

    cards.forEach(card => {
      if (!card.dataset.flipReady) {
        prepareCard(card);
        prepared++;
      }
    });

    console.log(`✅ ${prepared} cards prepared`);
  }

  /**
   * Prepare single card
   */
  function prepareCard(card) {
    // Mark as prepared
    card.dataset.flipReady = 'true';

    // Get tool info
    const toolName = card.dataset.toolName || 
                     card.querySelector('.square-title-large')?.textContent || 
                     'Tool';
    
    const toolUrl = card.dataset.href || '';

    // Wrap existing content in front face
    const existingContent = card.innerHTML;
    const frontFace = document.createElement('div');
    frontFace.className = 'card-face card-face-front';
    frontFace.innerHTML = existingContent;

    // Create back face
    const backFace = document.createElement('div');
    backFace.className = 'card-face card-face-back';
    backFace.innerHTML = `
      <button class="card-back-close" aria-label="Schließen" type="button">×</button>
      <div class="card-back-content">
        <h3>${escapeHtml(toolName)}</h3>
        <p>Mehr Informationen kommen bald...</p>
        ${toolUrl ? `<a href="${escapeHtml(toolUrl)}" target="_blank" rel="noopener noreferrer" class="card-back-link" style="color: var(--primary); text-decoration: underline;">Tool öffnen →</a>` : ''}
      </div>
    `;

    // Clear and rebuild
    card.innerHTML = '';
    card.appendChild(frontFace);
    card.appendChild(backFace);
  }

  /**
   * Handle clicks
   */
  function handleClick(e) {
    // Close button clicked?
    const closeBtn = e.target.closest('.card-back-close');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = closeBtn.closest('.card-square');
      if (card) {
        card.classList.remove('is-flipped');
        console.log('🔄 Card closed');
      }
      return;
    }

    // Link in back face clicked? Let it through
    if (e.target.closest('.card-back-link')) {
      return; // Don't prevent default
    }

    // Card clicked?
    const card = e.target.closest('.card-square');
    if (!card || !card.dataset.flipReady) return;

    // Don't flip if already flipped (unless clicking close)
    if (card.classList.contains('is-flipped')) {
      return;
    }

    // Prevent default & flip
    e.preventDefault();
    e.stopPropagation();

    // Close all other flipped cards
    document.querySelectorAll('.card-square.is-flipped').forEach(other => {
      if (other !== card) {
        other.classList.remove('is-flipped');
      }
    });

    // Flip this card
    card.classList.add('is-flipped');
    console.log('🔄 Card flipped:', card.dataset.toolName || 'Unknown');
  }

  /**
   * Handle keyboard
   */
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      const flipped = document.querySelectorAll('.card-square.is-flipped');
      if (flipped.length > 0) {
        flipped.forEach(card => card.classList.remove('is-flipped'));
        console.log('🔄 All cards closed (ESC)');
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

  // Auto-start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-prepare cards after search/filter
  const observer = new MutationObserver(() => {
    prepareAllCards();
  });

  setTimeout(() => {
    const grid = document.querySelector('#tool-grid');
    if (grid) {
      observer.observe(grid, { childList: true });
    }
  }, 1000);

})();
