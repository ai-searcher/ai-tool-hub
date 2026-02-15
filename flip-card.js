/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM - STABLE VERSION (App.js compatible)
   - One card open at a time
   - Keeps Analytics click handler working (no stopPropagation on front click)
   - Adds :has() fallback class: .tool-grid-squares.has-flip
   - Backdrop click + ESC closes
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 flip-card.js loading (stable)...');

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  const s = String(text);
  return s.length > maxLength ? s.slice(0, maxLength) + '…' : s;
}

function getCategoryName(cat) {
  const names = {
    text: 'Text',
    image: 'Bild',
    code: 'Code',
    audio: 'Audio',
    video: 'Video',
    data: 'Daten',
    other: 'Sonstiges'
  };
  return names[(cat || '').toLowerCase()] || names.other;
}

function getGrid() {
  return document.getElementById('tool-grid');
}

function getAllCards(gridEl) {
  return Array.from((gridEl || document).querySelectorAll('.card-square'));
}

function getOpenCard(gridEl) {
  return (gridEl || document).querySelector('.card-square.is-flipped');
}

function setHasFlip(gridEl, on) {
  if (!gridEl) return;
  // Fallback für Browser ohne :has()
  gridEl.classList.toggle('has-flip', !!on);
}

/* ─────────────────────────────────────────────────────────────
   Backface Markup (minimal but clean)
   ───────────────────────────────────────────────────────────── */

function createBackFace(tool) {
  const catName = getCategoryName(tool.category);
  const shortDesc = truncateText(tool.description || '', 90);
  const rating = Number(tool.rating || 0);
  const ratingText = Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
  const link = tool.link ? String(tool.link) : '#';

  // Kein inline onclick – wir handeln per Event-Delegation
  return `
    <div class="card-face card-face-back" role="region" aria-label="Details">
      <div class="card-back-header">
        <div class="card-back-category">${escapeHtml(catName)}</div>
        <button class="card-back-close" type="button" aria-label="Schließen">×</button>
      </div>

      <h3 class="card-back-title">${escapeHtml(tool.title || 'Tool')}</h3>

      <div class="card-back-rating" aria-label="Bewertung ${escapeHtml(ratingText)}">
        <span class="card-back-rating-value">${escapeHtml(ratingText)}</span>
      </div>

      <p class="card-back-description">${escapeHtml(shortDesc)}</p>

      <div class="card-back-actions">
        <a class="card-back-button-primary" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
          Tool öffnen
        </a>
        <button class="card-back-button-secondary card-back-more" type="button">
          Mehr Infos
        </button>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────
   Card Preparation (wrap existing front content)
   ───────────────────────────────────────────────────────────── */

function findToolByCard(card) {
  const toolId = card?.dataset?.toolId;
  if (!toolId) return null;

  const tools = window.appState?.tools;
  if (!Array.isArray(tools)) return null;

  return tools.find(t => String(t?.id) === String(toolId)) || null;
}

function prepareCard(card) {
  if (!card || card.dataset.flipInitialized === 'true') return false;

  const tool = findToolByCard(card);
  if (!tool) return false;

  // Front content sichern (dein style.css positioniert badge/title/marquee darin)
  const frontContent = card.innerHTML;

  card.innerHTML = `
    <div class="card-face card-face-front">
      ${frontContent}
    </div>
    ${createBackFace(tool)}
  `;

  card.dataset.flipInitialized = 'true';
  return true;
}

/* ─────────────────────────────────────────────────────────────
   Open/Close logic (one at a time)
   ───────────────────────────────────────────────────────────── */

function closeCard(card, gridEl) {
  if (!card) return;
  card.classList.remove('is-flipped');

  // Wenn keine Karte mehr offen: fallback class entfernen
  const stillOpen = !!getOpenCard(gridEl);
  setHasFlip(gridEl, stillOpen);
}

function openCard(card, gridEl) {
  if (!card) return;

  // andere schließen
  getAllCards(gridEl).forEach(c => {
    if (c !== card && c.classList.contains('is-flipped')) c.classList.remove('is-flipped');
  });

  // vorbereiten falls nötig
  if (card.dataset.flipInitialized !== 'true') prepareCard(card);

  card.classList.add('is-flipped');
  setHasFlip(gridEl, true);
}

/* ─────────────────────────────────────────────────────────────
   Event Delegation on Grid
   ───────────────────────────────────────────────────────────── */

function onGridClick(e) {
  const grid = getGrid();
  if (!grid) return;

  // 1) Close button in backface
  const closeBtn = e.target.closest('.card-back-close');
  if (closeBtn) {
    e.preventDefault();
    const card = e.target.closest('.card-square');
    closeCard(card, grid);
    return;
  }

  // 2) "Mehr Infos" Button (nur Demo) – hier könntest du Modal öffnen etc.
  const moreBtn = e.target.closest('.card-back-more');
  if (moreBtn) {
    e.preventDefault();
    // Wichtig: NICHT stopPropagation nötig, weil wir schon hier sind
    console.log('ℹ️ Mehr Infos clicked');
    return;
  }

  // 3) Click auf Link in Backface: nicht flippen
  const backLink = e.target.closest('.card-face-back a');
  if (backLink) {
    // Link soll funktionieren (neues Tab etc.)
    return;
  }

  // 4) Card bestimmen
  const card = e.target.closest('.card-square');
  if (!card) {
    // Backdrop click: wenn ins Grid aber nicht auf Card → close open card
    const open = getOpenCard(grid);
    if (open) closeCard(open, grid);
    return;
  }

  // 5) Wenn click im Backface (aber nicht Link/Button): close (intuitiv)
  if (e.target.closest('.card-face-back')) {
    closeCard(card, grid);
    return;
  }

  // 6) Frontface click: flip öffnen
  // Wichtig: KEIN stopPropagation -> app.js Analytics darf laufen
  // Kein preventDefault nötig (div click)
  openCard(card, grid);
}

function onKeyDown(e) {
  if (e.key !== 'Escape') return;
  const grid = getGrid();
  if (!grid) return;

  const open = getOpenCard(grid);
  if (open) closeCard(open, grid);
}

/* ─────────────────────────────────────────────────────────────
   Init
   ───────────────────────────────────────────────────────────── */

let _bound = false;

function initFlip() {
  const grid = getGrid();
  if (!grid) return;

  // Nur einmal binden
  if (!_bound) {
    grid.addEventListener('click', onGridClick);
    document.addEventListener('keydown', onKeyDown);
    _bound = true;
  }

  // Karten vorbereiten (nur wenn appState schon da ist)
  const toolsReady = Array.isArray(window.appState?.tools) && window.appState.tools.length > 0;
  if (!toolsReady) {
    // App ist noch nicht bereit → später via quantumready erneut
    return;
  }

  getAllCards(grid).forEach(card => {
    if (card.dataset.flipInitialized !== 'true') prepareCard(card);
  });

  console.log('✅ Flip-System bereit (stable)');
}

// Start (defer + DOM ready)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(initFlip));
} else {
  requestAnimationFrame(initFlip);
}

// Wenn app.js fertig ist
window.addEventListener('quantumready', () => requestAnimationFrame(initFlip));