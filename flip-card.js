/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM - MINIMAL VERSION
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 flip-card.js minimal loading...');

// Hilfsfunktionen
function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  text = String(text);
  return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
}

// Kategorie-Anzeigename
function getCategoryName(cat) {
  const names = { text: 'Text', image: 'Bild', code: 'Code', audio: 'Audio', video: 'Video', data: 'Daten', other: 'Sonstiges' };
  return names[cat] || names.other;
}

// Rückseite erzeugen (nur Kerninfos)
function createBackFace(tool) {
  const catName = getCategoryName(tool.category);
  const shortDesc = truncateText(tool.description, 60);
  const rating = (tool.rating || 0).toFixed(1);

  return `
    <div class="card-face card-face-back">
      <div class="card-back-category">${escapeHtml(catName)}</div>
      <h3 class="card-back-title">${escapeHtml(tool.title)}</h3>
      <div class="card-back-rating">${rating}</div>
      <p class="card-back-description">${escapeHtml(shortDesc)}</p>
      <a href="#" class="card-back-button-link" onclick="event.preventDefault(); event.stopPropagation();">Mehr Infos</a>
    </div>
  `;
}

// Karte für Flip vorbereiten
function prepareCard(card) {
  if (card.dataset.flipInitialized === 'true') return;

  const toolId = card.dataset.toolId;
  if (!toolId) return;

  let tool = null;
  if (window.appState && window.appState.tools) {
    tool = window.appState.tools.find(t => String(t.id) === toolId);
  }
  if (!tool) return;

  // Vorhandenen Inhalt in Frontface packen, Rückseite anhängen
  const frontContent = card.innerHTML;
  card.innerHTML = `
    <div class="card-face card-face-front">
      ${frontContent}
    </div>
    ${createBackFace(tool)}
  `;
  card.dataset.flipInitialized = 'true';
}

// Klick-Handler
function onCardClick(e) {
  if (e.target.closest('.card-back-button-link')) return; // Button ignoriert den Flip

  const card = e.target.closest('.card-square');
  if (!card) return;

  e.preventDefault();
  e.stopPropagation();

  if (card.dataset.flipInitialized !== 'true') {
    prepareCard(card);
  }

  card.classList.toggle('is-flipped');
}

// Initialisierung
function initFlip() {
  const grid = document.getElementById('tool-grid');
  if (!grid) {
    setTimeout(initFlip, 300);
    return;
  }

  // Event-Listener
  if (grid._flipHandler) {
    grid.removeEventListener('click', grid._flipHandler);
  }
  grid._flipHandler = onCardClick;
  grid.addEventListener('click', onCardClick);

  // Bereits vorhandene Karten vorbereiten
  document.querySelectorAll('.card-square').forEach(card => {
    if (card.dataset.flipInitialized !== 'true') {
      prepareCard(card);
    }
  });

  console.log('✅ Flip-System minimal bereit');
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(initFlip));
} else {
  requestAnimationFrame(initFlip);
}

window.addEventListener('quantumready', initFlip);