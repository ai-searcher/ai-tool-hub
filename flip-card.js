/**
 * ═══════════════════════════════════════════════════════════
 * FLIP CARD SYSTEM - Mobile-Optimized JavaScript
 * Version: 2.0 PERFORMANCE
 * Ultra-smooth für alle Geräte
 * ══════════════════════════════════════════════════════════
 */

class FlipCard {
  constructor() {
    this.cards = new Set();
    this.isFlipping = false;
    this.touchStartTime = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.FLIP_DURATION = 500; // ms (sync mit CSS)
    this.TOUCH_THRESHOLD = 10; // px - Bewegung tolerieren
    this.DOUBLE_TAP_DELAY = 300; // ms
    
    this.init();
  }

  init() {
    console.log('🔄 FlipCard System v2.0 initialized');
    
    // Warte bis DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.attachEventListeners();
    this.prepareCards();
    console.log('✅ FlipCard ready');
  }

  /**
   * Bereite alle Cards vor (verhindert FOUC)
   */
  prepareCards() {
    const cards = document.querySelectorAll('.card-square');
    cards.forEach(card => {
      card.classList.add('flip-ready');
      
      // Erstelle Back-Face falls nicht vorhanden
      if (!card.querySelector('.card-face-back')) {
        this.createBackFace(card);
      }
    });
  }

  /**
   * Erstelle Rückseite dynamisch
   */
  createBackFace(card) {
    const backFace = document.createElement('div');
    backFace.className = 'card-face card-face-back';
    backFace.innerHTML = `
      <button class="card-back-close" aria-label="Schließen">×</button>
      <div class="card-back-placeholder">
        Mehr Details kommen bald...
      </div>
    `;
    card.appendChild(backFace);
  }

  /**
   * Event Listeners - Touch & Click optimiert
   */
  attachEventListeners() {
    const grid = document.querySelector('.tool-grid-squares, .tool-grid');
    if (!grid) {
      console.warn('FlipCard: Grid not found');
      return;
    }

    // Touch Events (Mobile)
    grid.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    grid.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    
    // Click Events (Desktop + Mobile Fallback)
    grid.addEventListener('click', this.handleClick.bind(this), { capture: true });

    // Close Button
    grid.addEventListener('click', this.handleClose.bind(this), { capture: true });

    // ESC Key (schließe alle)
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    console.log('✅ FlipCard event listeners attached (Touch + Click)');
  }

  /**
   * Touch Start Handler
   */
  handleTouchStart(e) {
    const card = e.target.closest('.card-square');
    if (!card) return;

    const touch = e.touches[0];
    this.touchStartTime = Date.now();
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  /**
   * Touch End Handler (verhindert Scroll-Flip)
   */
  handleTouchEnd(e) {
    const card = e.target.closest('.card-square');
    if (!card) return;

    // Ignoriere Close Button
    if (e.target.closest('.card-back-close')) {
      return;
    }

    // Prüfe ob es ein Tap war (kein Scroll)
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);
    const duration = Date.now() - this.touchStartTime;

    // Nur flippen wenn < 10px Bewegung und < 300ms
    if (deltaX < this.TOUCH_THRESHOLD && 
        deltaY < this.TOUCH_THRESHOLD && 
        duration < this.DOUBLE_TAP_DELAY) {
      
      e.preventDefault();
      e.stopPropagation();
      
      // Use RAF for smooth animation
      requestAnimationFrame(() => {
        this.toggleFlip(card);
      });
    }
  }

  /**
   * Click Handler (Desktop + Fallback)
   */
  handleClick(e) {
    const card = e.target.closest('.card-square');
    if (!card) return;

    // Ignoriere Close Button
    if (e.target.closest('.card-back-close')) {
      return;
    }

    // Ignoriere wenn gerade flippt
    if (this.isFlipping || card.classList.contains('is-flipping')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Verhindere Event-Bubbling
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Use RAF for smooth animation
    requestAnimationFrame(() => {
      this.toggleFlip(card);
    });
  }

  /**
   * Close Button Handler
   */
  handleClose(e) {
    const closeBtn = e.target.closest('.card-back-close');
    if (!closeBtn) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const card = closeBtn.closest('.card-square');
    if (card) {
      requestAnimationFrame(() => {
        this.flipBack(card);
      });
    }
  }

  /**
   * Keyboard Handler (ESC = alle schließen)
   */
  handleKeydown(e) {
    if (e.key === 'Escape') {
      this.flipAllBack();
    }
  }

  /**
   * Toggle Flip State (mit Lock)
   */
  toggleFlip(card) {
    // Verhindere doppelte Flips
    if (this.isFlipping || card.classList.contains('is-flipping')) {
      return;
    }

    const isFlipped = card.classList.contains('is-flipped');

    // Lock
    this.isFlipping = true;
    card.classList.add('is-flipping');

    // Flip
    if (isFlipped) {
      this.flipBack(card);
    } else {
      this.flipFront(card);
    }

    // Track
    this.cards.add(card);

    // Unlock nach Animation
    setTimeout(() => {
      this.isFlipping = false;
      card.classList.remove('is-flipping');
    }, this.FLIP_DURATION);

    // Log
    const toolName = this.getToolName(card);
    console.log(`🔄 Flip ${isFlipped ? 'back' : 'front'}: ${toolName}`);
  }

  /**
   * Flip to Front (Rückseite zeigen)
   */
  flipFront(card) {
    // Force reflow für smooth animation
    card.offsetHeight;
    
    requestAnimationFrame(() => {
      card.classList.add('is-flipped');
    });
  }

  /**
   * Flip to Back (Vorderseite zeigen)
   */
  flipBack(card) {
    // Force reflow
    card.offsetHeight;
    
    requestAnimationFrame(() => {
      card.classList.remove('is-flipped');
    });
  }

  /**
   * Get Tool Name
   */
  getToolName(card) {
    return card.dataset.toolName ||
           card.getAttribute('data-tool-name') ||
           card.querySelector('.square-title-large')?.textContent ||
           'Unknown';
  }

  /**
   * Flip alle zurück
   */
  flipAllBack() {
    let count = 0;
    this.cards.forEach(card => {
      if (card.classList.contains('is-flipped')) {
        setTimeout(() => {
          this.flipBack(card);
        }, count * 50); // Stagger für smooth effect
        count++;
      }
    });
    
    if (count > 0) {
      console.log(`🔄 Flipped ${count} cards back`);
    }
  }

  /**
   * Get alle geflippten Cards
   */
  getFlippedCards() {
    return Array.from(this.cards).filter(card => 
      card.classList.contains('is-flipped')
    );
  }

  /**
   * Cleanup (falls benötigt)
   */
  destroy() {
    this.cards.clear();
    console.log('🗑️ FlipCard destroyed');
  }
}

// Auto-Initialize mit Error Handling
if (typeof window !== 'undefined') {
  // Mehrere Initialisierungs-Strategien
  const initFlipCard = () => {
    try {
      window.flipCard = new FlipCard();
    } catch (error) {
      console.error('❌ FlipCard initialization failed:', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlipCard);
  } else {
    initFlipCard();
  }

  // Fallback nach 2 Sekunden falls DOMContentLoaded missed
  setTimeout(() => {
    if (!window.flipCard) {
      console.warn('⚠️ FlipCard fallback initialization');
      initFlipCard();
    }
  }, 2000);
}

/**
 * ═══════════════════════════════════════════════════════════
 * END FLIP CARD SYSTEM
 * ══════════════════════════════════════════════════════════
 */
