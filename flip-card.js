/**
 * ═══════════════════════════════════════════════════════════
 * FLIP CARD SYSTEM - Standalone JavaScript
 * Version: 1.0
 * Nutzung: <script src="flip-card.js"></script>
 * ══════════════════════════════════════════════════════════
 */

class FlipCard {
  constructor() {
    this.cards = new Set();
    this.init();
  }

  init() {
    console.log('🔄 FlipCard System initialized');
    this.attachEventListeners();
  }

  /**
   * Event Listeners für alle Cards
   */
  attachEventListeners() {
    const grid = document.querySelector('.tool-grid-squares, .tool-grid');
    if (!grid) {
      console.warn('FlipCard: Grid not found');
      return;
    }

    // Click Handler
    grid.addEventListener('click', this.handleClick.bind(this), true);

    // Close Button Handler
    grid.addEventListener('click', this.handleClose.bind(this), true);

    console.log('✅ FlipCard event listeners attached');
  }

  /**
   * Handle Card Click (Flip)
   */
  handleClick(e) {
    const card = e.target.closest('.card-square');
    if (!card) return;

    // Ignoriere Clicks auf Close Button
    if (e.target.closest('.card-back-close')) {
      return;
    }

    // Verhindere Event-Bubbling
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Toggle Flip
    this.toggleFlip(card);
  }

  /**
   * Handle Close Button Click
   */
  handleClose(e) {
    const closeBtn = e.target.closest('.card-back-close');
    if (!closeBtn) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const card = closeBtn.closest('.card-square');
    if (card) {
      this.flipBack(card);
    }
  }

  /**
   * Toggle Flip State
   */
  toggleFlip(card) {
    const isFlipped = card.classList.contains('is-flipped');

    if (isFlipped) {
      this.flipBack(card);
    } else {
      this.flipFront(card);
    }

    // Track Card
    this.cards.add(card);

    // Log
    const toolName = this.getToolName(card);
    console.log(`🔄 Flip ${isFlipped ? 'back' : 'front'}: ${toolName}`);
  }

  /**
   * Flip to Front (Rückseite zeigen)
   */
  flipFront(card) {
    card.classList.add('is-flipped');
  }

  /**
   * Flip to Back (Vorderseite zeigen)
   */
  flipBack(card) {
    card.classList.remove('is-flipped');
  }

  /**
   * Get Tool Name from Card
   */
  getToolName(card) {
    return card.dataset.toolName ||
           card.getAttribute('data-tool-name') ||
           card.querySelector('.square-title-large')?.textContent ||
           'Unknown';
  }

  /**
   * Flip alle Cards zurück
   */
  flipAllBack() {
    this.cards.forEach(card => this.flipBack(card));
    console.log('🔄 All cards flipped back');
  }

  /**
   * Get alle geflippten Cards
   */
  getFlippedCards() {
    return Array.from(this.cards).filter(card => 
      card.classList.contains('is-flipped')
    );
  }
}

// Auto-Initialize
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.flipCard = new FlipCard();
  });
}

/**
 * ═══════════════════════════════════════════════════════════
 * END FLIP CARD SYSTEM
 * ══════════════════════════════════════════════════════════
 */
