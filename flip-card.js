/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM V2.2 - MINIMAL EDITION
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 flip-card.js V2.2 loading...');

const QC = {
  gridId: 'tool-grid',
  cardSel: '.card-square',
  initAttr: 'data-qcflip',
  openClass: 'qc-flipped'
};

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function getToolById(toolId) {
  const tools = window.appState?.tools;
  if (!Array.isArray(tools)) return null;
  return tools.find(t => String(t.id) === String(toolId)) || null;
}

function getCategoryName(cat) {
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
}

function getPriceLabel(tool) {
  if (typeof tool.is_free === 'boolean') return tool.is_free ? 'Kostenlos' : 'Paid';
  if (tool.price) return String(tool.price);
  return 'Unbekannt';
}

function closeAll() {
  document.querySelectorAll(`${QC.cardSel}.${QC.openClass}`).forEach(c => {
    c.classList.remove(QC.openClass);
  });
}

function buildBackContent(tool) {
  const category = getCategoryName(tool.category);
  const price = getPriceLabel(tool);
  const rating = tool.rating ? `${tool.rating.toFixed(1)}/5 ⭐` : 'Keine Bewertung';
  const url = escapeHtml(tool.url || '#');
  
  return `
    <button class="qc-close-x" aria-label="Schließen">×</button>
    <div class="qc-back-content">
      <h3 class="qc-back-title">${escapeHtml(tool.name)}</h3>
      <div class="qc-back-info">
        <div class="qc-info-item">
          <span class="qc-info-icon">📁</span>
          <span>${category}</span>
        </div>
        <div class="qc-info-item">
          <span class="qc-info-icon">💰</span>
          <span>${price}</span>
        </div>
        <div class="qc-info-item">
          <span class="qc-info-icon">⭐</span>
          <span>${rating}</span>
        </div>
      </div>
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="qc-back-btn">
        Tool öffnen →
      </a>
    </div>
  `;
}

function initCard(card) {
  if (card.getAttribute(QC.initAttr) === '1') return;
  
  const toolId = card.dataset.toolId || card.dataset.id;
  if (!toolId) return;
  
  const tool = getToolById(toolId);
  if (!tool) return;
  
  card.setAttribute(QC.initAttr, '1');
  
  const originalContent = card.innerHTML;
  
  card.innerHTML = `
    <div class="qc-face qc-front">
      ${originalContent}
    </div>
    <div class="qc-face qc-back">
      ${buildBackContent(tool)}
    </div>
  `;
  
  const closeBtn = card.querySelector('.qc-close-x');
  
  card.addEventListener('click', (e) => {
    if (!card.classList.contains(QC.openClass)) {
      e.preventDefault();
      e.stopPropagation();
      closeAll();
      card.classList.add(QC.openClass);
    }
  });
  
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove(QC.openClass);
    });
  }
  
  card.querySelector('.qc-back').addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
}

function setup() {
  const grid = document.getElementById(QC.gridId);
  if (!grid) return;
  
  const cards = grid.querySelectorAll(QC.cardSel);
  cards.forEach(card => initCard(card));
  
  document.addEventListener('click', (e) => {
    const clickedCard = e.target.closest(QC.cardSel);
    const clickedBack = e.target.closest('.qc-back');
    if (!clickedCard && !clickedBack) {
      closeAll();
    }
  });
  
  console.log('✅ FlipCard ready:', cards.length, 'cards');
}

init();
