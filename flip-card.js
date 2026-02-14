/**
 * ═══════════════════════════════════════════════════════════
 * FLIP CARD SYSTEM - Ultra-Simple Version
 * 1 Click = 1 Flip - Garantiert!
 * ══════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  console.log('🔄 FlipCard Ultra-Simple loading...');

  // Warte bis DOM ready
  function init() {
    const grid = document.querySelector('#tool-grid');
    if (!grid) {
      console.warn('⚠️ Grid not found, retrying...');
      setTimeout(init, 100);
      return;
    }

    // Bereite Cards vor
    prepareCards();

    // Event Delegation auf Grid
    grid.addEventListener('click', handleGridClick, false);

    console.log('✅ FlipCard ready - 1 click = 1 flip');
  }

  /**
   * Bereite alle Cards vor
   */
  function prepareCards() {
    const cards = document.querySelectorAll('.card-square');
    let count = 0;

    cards.forEach(card => {
      // Prüfe ob Back-Face existiert
      if (!card.querySelector('.card-face-back')) {
        createBackFace(card);
        count++;
      }
    });

    console.log(`✅ ${count} back-faces created`);
  }

  /**
   * Erstelle Rückseite
   */
  function createBackFace(card) {
    const toolName = card.dataset.toolName || 
                     card.querySelector('.square-title-large')?.textContent || 
                     'Tool';

    const backFace = document.createElement('div');
    backFace.className = 'card-face card-face-back';
    backFace.innerHTML = `
      <button class="card-back-close" aria-label="Schließen">×</button>
      <div class="card-back-placeholder">
        <strong>${toolName}</strong><br>
        Mehr Details kommen bald...
      </div>
    `;
    
    card.appendChild(backFace);
  }

  /**
   * Handle Grid Click (Event Delegation)
   */
  function handleGridClick(e) {
    // Check if Close Button
    const closeBtn = e.target.closest('.card-back-close');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = closeBtn.closest('.card-square');
      if (card) {
        flipCard(card, false); // Force close
      }
      return;
    }

    // Check if Card
    const card = e.target.closest('.card-square');
    if (!card) return;

    // Ignore if clicking on overlay link
    if (e.target.closest('.card-overlay-link')) {
      return; // Let overlay link work
    }

    // Prevent default & stop propagation
    e.preventDefault();
    e.stopPropagation();

    // Toggle Flip
    flipCard(card);
  }

  /**
   * Flip Card (Simple Toggle)
   */
  function flipCard(card, toggle = true) {
    if (toggle) {
      card.classList.toggle('is-flipped');
    } else {
      card.classList.remove('is-flipped');
    }

    const isFlipped = card.classList.contains('is-flipped');
    const toolName = card.dataset.toolName || 'Tool';
    
    console.log(`🔄 ${isFlipped ? 'Flipped' : 'Unflipped'}: ${toolName}`);
  }

  // ESC to close all
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.card-square.is-flipped').forEach(card => {
        card.classList.remove('is-flipped');
      });
      console.log('🔄 All cards closed (ESC)');
    }
  });

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

/**
 * ═══════════════════════════════════════════════════════════
 * END FLIP CARD SYSTEM
 * ══════════════════════════════════════════════════════════
 */
