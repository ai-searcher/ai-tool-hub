/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM - MINIMAL VERSION (PREMIUM BACKFACE)
   - Wraps existing card content into a front face
   - Creates a premium back face (neural rating bar, CTAs, close button)
   - Works with cards rendered dynamically (re-init on "quantumready")
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 flip-card.js premium loading...');

// ---------- helpers ----------
function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  const s = String(text);
  return s.length > maxLength ? s.substring(0, maxLength) + '…' : s;
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
  return names[cat] || names.other;
}

// ---------- back face ----------
function createBackFace(tool) {
  const catName = getCategoryName(tool.category);
  const shortDesc = truncateText(tool.description, 90);

  // rating 0..5 => 0..100%
  const ratingValue = Number(tool.rating || 0);
  const ratingPct = Math.max(0, Math.min(100, (ratingValue / 5) * 100));

  // tool link (safety)
  const toolLink = tool && tool.link ? String(tool.link) : '#';

  return `
    <div class="card-face card-face-back" role="region" aria-label="Tool Details">
      
      <button class="card-back-close" type="button" aria-label="Schließen">×</button>

      <div class="card-back-top">
        <div class="card-back-category">${escapeHtml(catName)}</div>
      </div>

      <h3 class="card-back-title">${escapeHtml(tool.title)}</h3>

      <div class="card-back-rating">
        <div class="card-back-rating-row">
          <span class="card-back-rating-label">Bewertung</span>
          <span class="card-back-rating-value">${Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : '0.0'}</span>
        </div>
        <div class="card-back-rating-bar" aria-hidden="true">
          <div class="card-back-rating-fill" style="width:${ratingPct}%"></div>
        </div>
      </div>

      <p class="card-back-description">${escapeHtml(shortDesc)}</p>

      <div class="card-back-actions">
        <a class="card-back-cta primary"
           href="${escapeHtml(toolLink)}"
           target="_blank"
           rel="noopener noreferrer"
           onclick="event.stopPropagation();">
          Tool öffnen
        </a>

        <button class="card-back-cta ghost"
                type="button"
                data-action="more-info"
                onclick="event.stopPropagation();">
          Mehr Infos
        </button>
      </div>
    </div>
  `;
}

// ---------- card preparation ----------
function getToolForCard(card) {
  const toolId = card && card.dataset ? card.dataset.toolId : null;
  if (!toolId) return null;

  // expected: window.appState.tools = [...]
  const tools = window.appState && Array.isArray(window.appState.tools) ? window.appState.tools : null;
  if (!tools) return null;

  return tools.find(t => String(t.id) === String(toolId)) || null;
}

function prepareCard(card) {
  if (!card || !(card instanceof Element)) return;
  if (card.dataset.flipInitialized === 'true') return;

  const tool = getToolForCard(card);
  if (!tool) return;

  // If already wrapped somehow, bail out
  if (card.querySelector && card.querySelector('.card-face-front')) {
    card.dataset.flipInitialized = 'true';
    return;
  }

  const frontContent = card.innerHTML;

  card.innerHTML = `
    <div class="card-face card-face-front">
      ${frontContent}
    </div>
    ${createBackFace(tool)}
  `;

  card.dataset.flipInitialized = 'true';
}

// ---------- click handling ----------
function closeAllFlips(exceptCard) {
  document.querySelectorAll('.card-square.is-flipped').forEach(c => {
    if (exceptCard && c === exceptCard) return;
    c.classList.remove('is-flipped');
  });
}

function onGridClick(e) {
  const card = e.target.closest('.card-square');
  if (!card) return;

  // Close button
  if (e.target.closest('.card-back-close')) {
    e.preventDefault();
    e.stopPropagation();
    card.classList.remove('is-flipped');
    return;
  }

  // Allow normal link behavior on the "Tool öffnen" CTA
  const openCta = e.target.closest('a.card-back-cta.primary');
  if (openCta) return;

  // "Mehr Infos" (placeholder action, does nothing for now)
  if (e.target.closest('[data-action="more-info"]')) {
    e.preventDefault();
    e.stopPropagation();
    // optional: you can hook your own modal/drawer here
    return;
  }

  // If you have an overlay link on the FRONT, prevent it from navigating on tap
  // (flip should be the primary action)
  if (e.target.closest('a')) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Prepare (first time) then flip
  if (card.dataset.flipInitialized !== 'true') {
    prepareCard(card);
  }

  // Close other flipped cards to keep UI clean on mobile
  if (!card.classList.contains('is-flipped')) {
    closeAllFlips(card);
  }

  e.preventDefault();
  e.stopPropagation();
  card.classList.toggle('is-flipped');
}

function onDocKeyDown(e) {
  if (e.key !== 'Escape') return;
  const flipped = document.querySelector('.card-square.is-flipped');
  if (flipped) flipped.classList.remove('is-flipped');
}

function onDocPointerDown(e) {
  // Tap outside to close (only when a card is flipped)
  const flipped = document.querySelector('.card-square.is-flipped');
  if (!flipped) return;

  const insideCard = e.target.closest('.card-square');
  if (!insideCard) {
    flipped.classList.remove('is-flipped');
  }
}

// ---------- init / re-init ----------
function initFlip() {
  const grid = document.getElementById('tool-grid');
  if (!grid) {
    setTimeout(initFlip, 250);
    return;
  }

  // Attach handler once
  if (!grid._flipBound) {
    grid.addEventListener('click', onGridClick, { passive: false });
    grid._flipBound = true;
  }

  // Prepare existing cards
  document.querySelectorAll('.card-square').forEach(card => {
    if (card.dataset.flipInitialized !== 'true') {
      prepareCard(card);
    }
  });

  // Global close behaviors (attach once)
  if (!document._flipGlobalBound) {
    document.addEventListener('keydown', onDocKeyDown);
    document.addEventListener('pointerdown', onDocPointerDown, { passive: true });
    document._flipGlobalBound = true;
  }

  console.log('✅ Flip-System premium bereit');
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(initFlip));
} else {
  requestAnimationFrame(initFlip);
}

// Re-init after app finished rendering tools
window.addEventListener('quantumready', () => requestAnimationFrame(initFlip));