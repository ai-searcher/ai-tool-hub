/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM - MOBILE SAFE (V1.1)
   - keeps FRONT markup (badge/title/marquee) as-is (from style.css)
   - iOS-safe 3D rotateY flip (via .qc-flip-inner)
   - disables front overlay-link click stealing
   - one card open at a time + tap outside to close
   - "Mehr Infos" toggles premium back details (no flip break)
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 flip-card.js loading (mobile-safe v1.1 / inner-wrapper)...');

/* -------------------- helpers -------------------- */
function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function clamp(n, min, max) {
  n = Number(n);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
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
    c.classList.remove('qc-details-open');
    c.setAttribute('aria-expanded', 'false');
  });
}

function getPriceLabel(tool) {
  if (typeof tool.is_free === 'boolean') return tool.is_free ? 'Kostenlos' : 'Paid';
  if (tool.price != null && String(tool.price).trim() !== '') return String(tool.price);

  const badges = Array.isArray(tool.badges) ? tool.badges : [];
  const joined = badges.map(b => String(b).toLowerCase());
  if (joined.some(x => x.includes('free') || x.includes('kostenlos'))) return 'Kostenlos';
  return 'Unbekannt';
}

function buildBackMarquee(tool) {
  const tags = Array.isArray(tool.tags) ? tool.tags.filter(Boolean).slice(0, 4).map(String) : [];
  if (tags.length) return tags.join(' • ');
  const desc = tool.description ? String(tool.description) : '';
  const clean = desc.replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, 44) + (clean.length > 44 ? '…' : '') : 'Mehr entdecken • Quantum Hub';
}

/* -------------------- back face markup -------------------- */
function buildRatingPill(rating) {
  const r = clamp(rating || 0, 0, 5);
  return `
    <div class="qc-pill qc-pill-rating" aria-label="Bewertung ${escapeHtml(r.toFixed(1))}">
      <span class="qc-pill-label">bewertung</span>
      <span class="qc-pill-value">${escapeHtml(r.toFixed(1))}</span>
    </div>
  `;
}

function buildPricePill(priceLabel) {
  return `
    <div class="qc-pill qc-pill-price" aria-label="Preis ${escapeHtml(priceLabel)}">
      <span class="qc-pill-label">preis</span>
      <span class="qc-pill-value">${escapeHtml(priceLabel)}</span>
    </div>
  `;
}

function buildRatingMeter(rating) {
  const r = clamp(rating || 0, 0, 5);
  const percent = Math.round((r / 5) * 100);
  const label = `${r.toFixed(1)} / 5.0`;

  return `
    <div class="qc-rating" aria-label="Bewertung ${escapeHtml(label)}">
      <div class="qc-rating-top">
        <span class="qc-rating-label">Rating</span>
        <span class="qc-rating-value">${escapeHtml(r.toFixed(1))}</span>
      </div>

      <div class="qc-rating-meter" role="progressbar"
           aria-valuemin="0" aria-valuemax="5" aria-valuenow="${escapeHtml(r.toFixed(1))}">
        <div class="qc-rating-fill" style="width:${percent}%"></div>
        <div class="qc-rating-glow" style="width:${percent}%"></div>
      </div>

      <div class="qc-rating-hint">${escapeHtml(label)}</div>
    </div>
  `;
}

function createBackFace(tool) {
  const catName = getCategoryName(tool.category);
  const provider = tool.provider ? String(tool.provider) : '';
  const desc = tool.description ? String(tool.description) : '';
  const tags = Array.isArray(tool.tags) ? tool.tags.slice(0, 8) : [];
  const badges = Array.isArray(tool.badges) ? tool.badges.slice(0, 4) : [];

  const link = tool.link ? String(tool.link) : '#';
  const safeLink = escapeHtml(link);

  const priceLabel = getPriceLabel(tool);
  const bottomMarquee = buildBackMarquee(tool);

  return `
    <div class="card-face card-face-back" role="group" aria-label="Tool Details">
      <button class="qc-close" type="button" aria-label="Schließen">×</button>

      <div class="qc-top-pills">
        ${buildRatingPill(tool.rating)}
        ${buildPricePill(priceLabel)}
      </div>

      <div class="qc-back-badges">
        <span class="square-category-badge qc-back-category" data-cat="${escapeHtml(tool.category || 'other')}">
          ${escapeHtml(catName)}
        </span>
      </div>

      <div class="qc-center">
        <h3 class="square-title-large qc-back-title">${escapeHtml(tool.title)}</h3>

        <p class="qc-back-sub">
          ${escapeHtml(desc ? desc.replace(/\s+/g, ' ').trim() : 'Details & Bewertung im Quantum Hub')}
        </p>

        <button class="qc-hero-btn" type="button" data-action="details-toggle" aria-label="Mehr Infos anzeigen">
          <span class="qc-hero-chev">›››</span>
          <span class="qc-hero-text">Mehr Infos</span>
          <span class="qc-hero-chev">‹‹‹</span>
        </button>

        <div class="qc-details" aria-label="Detailbereich">
          ${buildRatingMeter(tool.rating)}
          ${provider ? `<div class="qc-provider">Provider: <strong>${escapeHtml(provider)}</strong></div>` : ''}

          ${badges.length ? `
            <div class="qc-badges">
              ${badges.map(b => `<div class="qc-badge-item">${escapeHtml(b)}</div>`).join('')}
            </div>
          ` : ''}

          ${tags.length ? `
            <div class="qc-tags" aria-label="Tags">
              ${tags.map(t => `<span class="qc-tag">${escapeHtml(t)}</span>`).join('')}
            </div>
          ` : ''}

          <div class="qc-actions">
            <a class="qc-btn qc-btn-primary" href="${safeLink}" target="_blank" rel="noopener noreferrer nofollow">
              Tool öffnen
            </a>
            <button class="qc-btn qc-btn-ghost" type="button" data-action="flip-close">
              Zurück
            </button>
          </div>
        </div>
      </div>

      <div class="qc-bottom-pill" aria-label="Kurzinfo">
        ${escapeHtml(bottomMarquee)}
      </div>
    </div>
  `;
}

/* -------------------- prepare card -------------------- */
function prepareCard(card) {
  // true = vorbereitet/ok, false = nicht möglich (noch keine Tools)
  if (!card) return false;
  if (card.dataset.flipInitialized === 'true') return true;

  const toolId = card.dataset.toolId;
  if (!toolId) return false;

  const tool = getToolById(toolId);

  // Wenn Tools noch nicht geladen sind: retry, aber NICHT flippen
  if (!tool) {
    setTimeout(() => {
      if (card && card.dataset.flipInitialized !== 'true') prepareCard(card);
    }, 200);
    return false;
  }

  // Front-Markup exakt behalten
  const frontHtml = card.innerHTML;

  // ✅ NEW: inner wrapper, damit style.css Transforms/States nicht den Flip killen
  card.innerHTML = `
    <div class="qc-flip-inner">
      <div class="card-face card-face-front">
        ${frontHtml}
      </div>
      ${createBackFace(tool)}
    </div>
  `;

  // Overlay-Link auf der Front darf taps nicht stehlen
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

  return true;
}

/* -------------------- interactions -------------------- */
function isInteractiveTarget(el) {
  if (!el) return false;
  return Boolean(el.closest('a, button, input, textarea, select, [role="button"]'));
}

function openFlip(card) {
  if (!card) return;
  if (!prepareCard(card)) return;

  closeAllFlips(card);
  card.classList.add('is-flipped');
  card.setAttribute('aria-expanded', 'true');
}

function toggleFlip(card) {
  if (!card) return;
  if (!prepareCard(card)) return;

  const willOpen = !card.classList.contains('is-flipped');
  if (willOpen) openFlip(card);
  else {
    card.classList.remove('is-flipped');
    card.classList.remove('qc-details-open');
    card.setAttribute('aria-expanded', 'false');
  }
}

function onGridPointerUp(e) {
  const card = e.target.closest('.card-square');
  if (!card) return;

  // CTA inside details: allow navigation
  if (e.target.closest('.qc-btn-primary')) return;

  // Close actions
  if (e.target.closest('.qc-close') || e.target.closest('[data-action="flip-close"]')) {
    e.preventDefault();
    e.stopPropagation();
    card.classList.remove('is-flipped');
    card.classList.remove('qc-details-open');
    card.setAttribute('aria-expanded', 'false');
    return;
  }

  // Details toggle (no flip)
  if (e.target.closest('[data-action="details-toggle"]')) {
    e.preventDefault();
    e.stopPropagation();
    card.classList.toggle('qc-details-open');
    return;
  }

  // If user tapped interactive elements in back, do not flip
  if (card.classList.contains('is-flipped') && isInteractiveTarget(e.target)) return;

  // Otherwise toggle flip
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

  // Prepare all current cards
  grid.querySelectorAll('.card-square').forEach(prepareCard);

  // Remove old handlers if exist
  if (grid._qcFlipBound) {
    grid.removeEventListener('pointerup', grid._qcFlipPointerUp, true);
    grid.removeEventListener('keydown', grid._qcFlipKeyDown, true);
    document.removeEventListener('pointerup', grid._qcDocPointerUp, true);
    grid._qcFlipBound = false;
  }

  // Bind in CAPTURE phase
  grid._qcFlipPointerUp = onGridPointerUp;
  grid._qcFlipKeyDown = onGridKeyDown;
  grid._qcDocPointerUp = onDocumentPointerUp;

  grid.addEventListener('pointerup', onGridPointerUp, true);
  grid.addEventListener('keydown', onGridKeyDown, true);
  document.addEventListener('pointerup', onDocumentPointerUp, true);

  grid._qcFlipBound = true;

  // MutationObserver: re-prepare new nodes
  if (!grid._qcFlipObserver) {
    grid._qcFlipObserver = new MutationObserver(() => {
      grid.querySelectorAll('.card-square').forEach(prepareCard);
    });
    grid._qcFlipObserver.observe(grid, { childList: true, subtree: true });
  }

  console.log('✅ Flip-System ready (mobile-safe v1.1 / inner-wrapper)');
}

/* -------------------- start -------------------- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(initFlip));
} else {
  requestAnimationFrame(initFlip);
}
window.addEventListener('quantumready', () => requestAnimationFrame(initFlip));