/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM - MOBILE SAFE (V1.0 MINIMAL)
   - keeps FRONT markup (badge/title/marquee) as-is
   - iOS-safe 3D rotateY flip
   - MINIMAL back content
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 flip-card.js loading (mobile-safe)...');

/* -------------------- helpers -------------------- */
function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
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

function getToolById(toolId) {
  const id = String(toolId || '');
  const tools = window.appState && Array.isArray(window.appState.tools) ? window.appState.tools : null;
  if (!tools) return null;
  return tools.find(t => String(t.id) === id) || null;
}

function closeAllFlips(exceptCard = null) {
  document.querySelectorAll('.card-square.is-flipped').forEach(c => {
    if (exceptCard && c === exceptCard) return;
    c.classList.remove('is-flipped');
    c.setAttribute('aria-expanded', 'false');
  });
}

/* -------------------- MINIMAL back face markup -------------------- */
function createBackFace(tool) {
  const catName = getCategoryName(tool.category);
  const rating = tool.rating ? `${tool.rating.toFixed(1)}/5` : '—';
  const link = tool.link ? String(tool.link) : '#';
  const safeLink = escapeHtml(link);

  return `
    <div class="card-face card-face-back" role="group" aria-label="Tool Details">
      
      <!-- Close Button -->
      <button class="qc-close" type="button" aria-label="Schließen">×</button>
      
      <!-- Content -->
      <div class="qc-back-center">
        
        <!-- Title -->
        <h3 class="qc-back-title">${escapeHtml(tool.title)}</h3>
        
        <!-- Kategorie Badge -->
        <span class="qc-back-badge">${escapeHtml(catName)}</span>
        
        <!-- Rating -->
        <div class="qc-back-rating">
          <span class="qc-rating-icon">⭐</span>
          <span class="qc-rating-text">${rating}</span>
        </div>
        
        <!-- Button -->
        <a class="qc-btn-main" href="${safeLink}" target="_blank" rel="noopener noreferrer nofollow">
          Tool öffnen →
        </a>
        
      </div>
      
    </div>
  `;
}

/* -------------------- prepare card -------------------- */
function prepareCard(card) {
  if (!card || card.dataset.flipInitialized === 'true') return;

  const toolId = card.dataset.toolId;
  if (!toolId) return;

  const tool = getToolById(toolId);
  if (!tool) return;

  const frontHtml = card.innerHTML;

  card.innerHTML = `
    <div class="card-face card-face-front">
      ${frontHtml}
    </div>
    ${createBackFace(tool)}
  `;

  const overlay = card.querySelector('.card-face-front .card-overlay-link');
  if (overlay) {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.tabIndex = -1;
    overlay.style.pointerEvents = 'none';
  }

  card.dataset.flipInitialized = 'true';
  card.setAttribute('aria-expanded', 'false');
  card.setAttribute('role', 'button');
  card.tabIndex = 0;
}

/* -------------------- interactions -------------------- */
function isInteractiveTarget(el) {
  if (!el) return false;
  return Boolean(
    el.closest('a, button, input, textarea, select, [role="button"]')
  );
}

function openFlip(card) {
  if (!card) return;
  prepareCard(card);
  closeAllFlips(card);
  card.classList.add('is-flipped');
  card.setAttribute('aria-expanded', 'true');
}

function toggleFlip(card) {
  if (!card) return;
  prepareCard(card);

  const willOpen = !card.classList.contains('is-flipped');
  if (willOpen) openFlip(card);
  else {
    card.classList.remove('is-flipped');
    card.setAttribute('aria-expanded', 'false');
  }
}

function onGridPointerUp(e) {
  const card = e.target.closest('.card-square');
  if (!card) return;

  if (e.target.closest('.qc-btn-main')) return;

  if (e.target.closest('.qc-close')) {
    e.preventDefault();
    e.stopPropagation();
    card.classList.remove('is-flipped');
    card.setAttribute('aria-expanded', 'false');
    return;
  }

  if (card.classList.contains('is-flipped') && isInteractiveTarget(e.target)) return;

  e.preventDefault();
  e.stopPropagation();
  toggleFlip(card);
}

function onGridKeyDown(e) {
  const card = e.target.closest('.card-square');
  if (!card) return;

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleFlip(card);
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeAllFlips();
  }
}

function onDocumentPointerUp(e) {
  const inCard = e.target.closest('.card-square');
  if (!inCard) closeAllFlips();
}

/* -------------------- init / re-init -------------------- */
function initFlip() {
  const grid = document.getElementById('tool-grid');
  if (!grid) {
    setTimeout(initFlip, 250);
    return;
  }

  grid.querySelectorAll('.card-square').forEach(prepareCard);

  if (grid._qcFlipBound) {
    grid.removeEventListener('pointerup', grid._qcFlipPointerUp, true);
    grid.removeEventListener('keydown', grid._qcFlipKeyDown, true);
    document.removeEventListener('pointerup', grid._qcDocPointerUp, true);
    grid._qcFlipBound = false;
  }

  grid._qcFlipPointerUp = onGridPointerUp;
  grid._qcFlipKeyDown = onGridKeyDown;
  grid._qcDocPointerUp = onDocumentPointerUp;

  grid.addEventListener('pointerup', onGridPointerUp, true);
  grid.addEventListener('keydown', onGridKeyDown, true);
  document.addEventListener('pointerup', onDocumentPointerUp, true);

  grid._qcFlipBound = true;

  if (!grid._qcFlipObserver) {
    grid._qcFlipObserver = new MutationObserver(() => {
      grid.querySelectorAll('.card-square').forEach(prepareCard);
    });
    grid._qcFlipObserver.observe(grid, { childList: true, subtree: true });
  }

  console.log('✅ Flip-System ready (mobile-safe minimal)');
}

/* -------------------- start -------------------- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(initFlip));
} else {
  requestAnimationFrame(initFlip);
}
window.addEventListener('quantumready', () => requestAnimationFrame(initFlip));
