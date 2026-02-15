/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM - PREMIUM (Overlay-Link kompatibel)
   - fängt .card-overlay-link ab: Tap = Flip (statt sofort öffnen)
   - "Tool öffnen" nur auf Rückseite (CTA)
   - Close (×) klappt sicher zu
   - Rating als Neural-Progressbar (ohne ⭐)
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 flip-card.js premium loading...');

/* ---------- Helpers ---------- */
function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function clamp01(n) {
  n = Number(n);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
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

function truncateText(text, maxLen) {
  if (!text) return '';
  const s = String(text).trim();
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}

function getToolById(toolId) {
  const idStr = String(toolId);
  const tools =
    (window.appState && Array.isArray(window.appState.tools) && window.appState.tools) ||
    (window.__TOOLS__ && Array.isArray(window.__TOOLS__) && window.__TOOLS__) ||
    [];

  return tools.find(t => String(t.id) === idStr) || null;
}

/* ---------- Back Face Template ---------- */
function createBackFace(tool) {
  const catName = getCategoryName(tool.category);
  const desc = truncateText(tool.description, 140);

  const rating = Number(tool.rating || 0);
  const ratingClamped = Math.max(0, Math.min(5, rating));
  const pct = Math.round(clamp01(ratingClamped / 5) * 100);

  const link = tool.link ? String(tool.link) : '#';

  return `
    <div class="card-face card-face-back" aria-hidden="true">
      <button class="card-back-close" type="button" data-flip-close aria-label="Schließen">×</button>

      <div class="card-back-category">${escapeHtml(catName)}</div>

      <h3 class="card-back-title">${escapeHtml(tool.title)}</h3>

      <div class="card-back-rating">
        <div class="card-back-rating-row">
          <div class="card-back-rating-label">Rating</div>
          <div class="card-back-rating-value">${ratingClamped.toFixed(1)}</div>
        </div>

        <div class="card-back-rating-bar" role="progressbar"
             aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="card-back-rating-fill" style="width:${pct}%;"></div>
        </div>
      </div>

      <p class="card-back-description">${escapeHtml(desc)}</p>

      <div class="card-back-actions">
        <a class="card-back-cta primary" href="${escapeHtml(link)}"
           target="_blank" rel="noopener noreferrer"
           data-action="open"
           onclick="event.stopPropagation();">
          Tool öffnen
        </a>

        <button class="card-back-cta ghost" type="button"
                data-action="more"
                onclick="event.stopPropagation();">
          Mehr Infos
        </button>
      </div>
    </div>
  `;
}

/* ---------- Prepare card (wrap front + add back) ---------- */
function prepareCard(card) {
  if (!card || card.dataset.flipInitialized === 'true') return;

  const toolId = card.dataset.toolId;
  if (!toolId) return;

  const tool = getToolById(toolId);
  if (!tool) return;

  // IMPORTANT:
  // Wir nehmen den aktuellen Inhalt (Front) wie er ist (inkl. Badge/Title/Marquee aus style.css)
  const frontContent = card.innerHTML;

  card.innerHTML = `
    <div class="card-face card-face-front" aria-hidden="false">
      ${frontContent}
    </div>
    ${createBackFace(tool)}
  `;

  card.dataset.flipInitialized = 'true';
}

/* ---------- Flip controls ---------- */
function flipOpen(card) {
  if (!card) return;
  if (card.dataset.flipInitialized !== 'true') prepareCard(card);

  card.classList.add('is-flipped');

  // a11y
  const front = card.querySelector('.card-face-front');
  const back = card.querySelector('.card-face-back');
  if (front) front.setAttribute('aria-hidden', 'true');
  if (back) back.setAttribute('aria-hidden', 'false');
}

function flipClose(card) {
  if (!card) return;

  card.classList.remove('is-flipped');

  const front = card.querySelector('.card-face-front');
  const back = card.querySelector('.card-face-back');
  if (front) front.setAttribute('aria-hidden', 'false');
  if (back) back.setAttribute('aria-hidden', 'true');
}

/* ---------- Click handler (Overlay-Link fix!) ---------- */
function onGridClick(e) {
  const target = e.target;

  const card = target.closest('.card-square');
  if (!card) return;

  // Close button
  if (target.closest('[data-flip-close]')) {
    e.preventDefault();
    e.stopPropagation();
    flipClose(card);
    return;
  }

  // Backside action buttons:
  // - open: darf navigieren (wir stoppen nur propagation, nicht default)
  // - more: nur placeholder (kein flip)
  const actionEl = target.closest('[data-action]');
  if (actionEl) {
    const action = actionEl.getAttribute('data-action');
    if (action === 'more') {
      e.preventDefault();
      e.stopPropagation();
      // TODO: hier später Modal/Details
      console.log('ℹ️ Mehr Infos (placeholder):', card.dataset.toolId);
    }
    return;
  }

  // DER WICHTIGE FIX:
  // Wenn der Tap auf dem Full-Overlay-Link passiert, flippen wir statt zu navigieren.
  const overlayLink = target.closest('.card-overlay-link');
  if (overlayLink) {
    e.preventDefault();
    e.stopPropagation();
    if (!card.classList.contains('is-flipped')) flipOpen(card);
    else flipClose(card);
    return;
  }

  // Normaler Tap irgendwo auf der Karte:
  e.preventDefault();
  e.stopPropagation();
  if (!card.classList.contains('is-flipped')) flipOpen(card);
  else flipClose(card);
}

/* ---------- Init ---------- */
function initFlip() {
  const grid = document.getElementById('tool-grid');
  if (!grid) {
    setTimeout(initFlip, 250);
    return;
  }

  // Remove old handler if present
  if (grid._flipHandler) grid.removeEventListener('click', grid._flipHandler);
  grid._flipHandler = onGridClick;
  grid.addEventListener('click', onGridClick, { passive: false });

  // Prepare existing cards
  document.querySelectorAll('.card-square').forEach(card => {
    if (card.dataset.flipInitialized !== 'true') prepareCard(card);
  });

  console.log('✅ Flip-System premium bereit (Overlay-Link fix aktiv)');
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(initFlip));
} else {
  requestAnimationFrame(initFlip);
}

// Re-init when app signals ready
window.addEventListener('quantumready', initFlip);