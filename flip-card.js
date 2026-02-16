/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM V3.0 - PROFESSIONAL EDITION
   - Saubere Kurzinfos auf Rückseite
   - Perfekte Performance
   - iOS/Safari optimiert
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 flip-card.js V3.0 loading...');

const FlipCard = {
  gridId: 'tool-grid',
  cardSelector: '.card-square',
  initAttr: 'data-qcflip',
  flippedClass: 'qc-flipped',
  
  init() {
    console.log('⚡ FlipCard.init()');
    
    // Warte auf DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  },
  
  setup() {
    const grid = document.getElementById(this.gridId);
    if (!grid) {
      console.warn('⚠️ Grid nicht gefunden:', this.gridId);
      return;
    }
    
    console.log('✅ Grid gefunden, initialisiere Cards...');
    
    // Alle Cards finden
    const cards = grid.querySelectorAll(this.cardSelector);
    console.log(`📦 ${cards.length} Cards gefunden`);
    
    cards.forEach(card => this.initCard(card));
    
    // Click outside to close
    document.addEventListener('click', (e) => this.handleOutsideClick(e));
    
    console.log('✅ FlipCard Setup komplett');
  },
  
  initCard(card) {
    // Bereits initialisiert?
    if (card.getAttribute(this.initAttr) === '1') return;
    
    const toolId = card.dataset.toolId || card.dataset.id;
    if (!toolId) {
      console.warn('⚠️ Card ohne ID:', card);
      return;
    }
    
    // Markiere als initialisiert
    card.setAttribute(this.initAttr, '1');
    
    // Tool-Daten holen
    const tool = this.getToolById(toolId);
    if (!tool) {
      console.warn('⚠️ Tool nicht gefunden:', toolId);
      return;
    }
    
    // Erstelle Faces
    this.createFaces(card, tool);
    
    console.log('✅ Card initialisiert:', tool.name);
  },
  
  createFaces(card, tool) {
    // Speichere original Content
    const originalContent = card.innerHTML;
    
    // Erstelle Face-Struktur
    card.innerHTML = `
      <div class="qc-face qc-front">
        ${originalContent}
      </div>
      <div class="qc-face qc-back">
        ${this.buildBackContent(tool)}
      </div>
    `;
    
    // Event Listeners
    const backFace = card.querySelector('.qc-back');
    const closeBtn = backFace.querySelector('.qc-close');
    
    // Click auf Card öffnet
    card.addEventListener('click', (e) => {
      // Nur wenn NICHT bereits geflippt
      if (!card.classList.contains(this.flippedClass)) {
        e.preventDefault();
        e.stopPropagation();
        this.flipCard(card);
      }
    });
    
    // Close Button
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeCard(card);
      });
    }
    
    // Verhindere dass Clicks auf Back die Card schließen
    backFace.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  },
  
  buildBackContent(tool) {
    const desc = this.escapeHtml(tool.description || 'Keine Beschreibung verfügbar');
    const category = this.getCategoryName(tool.category);
    const price = this.getPriceLabel(tool);
    const rating = tool.rating || 0;
    const tags = Array.isArray(tool.tags) ? tool.tags : [];
    const badges = Array.isArray(tool.badges) ? tool.badges : [];
    const url = this.escapeHtml(tool.url || '#');
    
    // Keywords aus Badges + Tags kombinieren
    const keywords = [...new Set([...badges, ...tags])].slice(0, 6);
    
    return `
      <div class="qc-back-inner">
        
        <!-- Header -->
        <div class="qc-header">
          <h3 class="qc-tool-name">${this.escapeHtml(tool.name)}</h3>
          <button class="qc-close" aria-label="Schließen">×</button>
        </div>
        
        <!-- Content -->
        <div class="qc-content">
          
          <!-- Kategorie -->
          <div class="qc-info-section">
            <p class="qc-info-label">Kategorie</p>
            <p class="qc-info-value">${category}</p>
          </div>
          
          <!-- Beschreibung -->
          <div class="qc-info-section">
            <p class="qc-info-label">Beschreibung</p>
            <p class="qc-info-value">${desc}</p>
          </div>
          
          <!-- Preis -->
          <div class="qc-info-section">
            <p class="qc-info-label">Preis</p>
            <p class="qc-info-value">${price}</p>
          </div>
          
          ${rating > 0 ? `
          <!-- Rating -->
          <div class="qc-info-section">
            <p class="qc-info-label">Bewertung</p>
            <div class="qc-rating">
              <div class="qc-rating-stars">${this.buildStars(rating)}</div>
              <span class="qc-rating-value">${rating.toFixed(1)}/5</span>
            </div>
          </div>
          ` : ''}
          
          ${keywords.length > 0 ? `
          <!-- Keywords -->
          <div class="qc-info-section">
            <p class="qc-info-label">Keywords</p>
            <div class="qc-tags">
              ${keywords.map(kw => `<span class="qc-tag">${this.escapeHtml(kw)}</span>`).join('')}
            </div>
          </div>
          ` : ''}
          
        </div>
        
        <!-- Actions -->
        <div class="qc-actions">
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="qc-btn qc-btn-primary">
            🔗 Öffnen
          </a>
          <button class="qc-btn qc-btn-secondary qc-close">
            ← Zurück
          </button>
        </div>
        
      </div>
    `;
  },
  
  buildStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    
    let html = '';
    html += '★'.repeat(fullStars);
    if (hasHalf) html += '⯨';
    html += '☆'.repeat(emptyStars);
    
    return html;
  },
  
  flipCard(card) {
    // Schließe alle anderen
    this.closeAllCards();
    
    // Öffne diese Card
    card.classList.add(this.flippedClass);
    card.setAttribute('aria-expanded', 'true');
    
    console.log('🔄 Card geflippt');
  },
  
  closeCard(card) {
    card.classList.remove(this.flippedClass);
    card.setAttribute('aria-expanded', 'false');
    
    console.log('↩️ Card geschlossen');
  },
  
  closeAllCards() {
    document.querySelectorAll(`${this.cardSelector}.${this.flippedClass}`).forEach(c => {
      this.closeCard(c);
    });
  },
  
  handleOutsideClick(e) {
    const clickedCard = e.target.closest(this.cardSelector);
    const clickedBack = e.target.closest('.qc-back');
    
    // Wenn außerhalb geklickt UND nicht auf eine Back-Seite
    if (!clickedCard && !clickedBack) {
      this.closeAllCards();
    }
  },
  
  // Helper Functions
  getToolById(id) {
    const tools = window.appState?.tools;
    if (!Array.isArray(tools)) return null;
    return tools.find(t => String(t.id) === String(id)) || null;
  },
  
  getCategoryName(cat) {
    const names = {
      text: 'Text',
      image: 'Bild',
      code: 'Code',
      audio: 'Audio',
      video: 'Video',
       'Daten',
      other: 'Sonstiges'
    };
    return names[cat] || names.other;
  },
  
  getPriceLabel(tool) {
    if (typeof tool.is_free === 'boolean') {
      return tool.is_free ? 'Kostenlos' : 'Kostenpflichtig';
    }
    if (tool.price) return String(tool.price);
    return 'Unbekannt';
  },
  
  escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
};

// Auto-Init
FlipCard.init();
