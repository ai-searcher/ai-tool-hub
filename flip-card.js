/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM - REBUILD V2.0 (MOBILE-FIRST, iOS-SAFE)
   - Front markup bleibt exakt wie app.js es liefert
   - Back wird aus window.appState.tools gebaut
   - Flip: stable 3D (iOS) + hard hide front when flipped
   - One open at a time, tap outside closes
   - "Mehr Infos" toggles Details panel on back
   ══════════════════════════════════════════════════════════ */

'use strict';

console.log('🚀 flip-card.js (V2) loading...');

const QC = {
  gridId: 'tool-grid',
  cardSel: '.card-square',
  initAttr: 'data-qcflip',
  openClass: 'qc-flipped',
  detailsClass: 'qc-details'
};

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

function getToolsArray() {
  const tools = window.appState && Array.isArray(window.appState.tools) ? window.appState.tools : null;
  return tools || null;
}

function getToolById(toolId) {
  const tools = getToolsArray();
  if (!tools) return null;
  const id = String(toolId || '');
  return tools.find(t => String(t.id) === id) || null;
}

function getCategoryName(cat) {
  const names = { text:'Text', image:'Bild', code:'Code', audio:'Audio', video:'Video', data:'Daten', other:'Sonstiges' };
  return names[cat] || names.other;
}

function getPriceLabel(tool) {
  if (typeof tool.is_free === 'boolean') return tool.is_free ? 'Kostenlos' : 'Paid';
  if (tool.price != null && String(tool.price).trim() !== '') return String(tool.price);
  const badges = Array.isArray(tool.badges) ? tool.badges : [];
  const joined = badges.map(b => String(b).toLowerCase());
  if (joined.some(x => x.includes('free') || x.includes('kostenlos'))) return 'Kostenlos';
  return 'Unbekannt';
}

function closeAll(except = null) {
  document.querySelectorAll(`${QC.cardSel}.${QC.openClass}`).forEach(c => {
    if (except && c === except) return;
    c.classList.remove(QC.openClass);
    c.classList.remove(QC.detailsClass);
    c.setAttribute('aria-expanded', 'false');
  });
}

/* -------------------- back markup -------------------- */
function buildMeter(rating) {
  const r = clamp(rating || 0, 0, 5);
  const percent = Math.round((r / 5) * 100);
  return `
    <div class="qc-meter" aria-label="Bewertung ${escapeHtml(r.toFixed(1))} von 5">
      <div class="qc-meter-row">
        <span class="qc-meter-label">Bewertung</span>
        <span class="qc-meter-value">${escapeHtml(r.toFixed(1))}</span>
      </div>
      <div class="qc-meter-bar" role="progressbar" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${escapeHtml(r.toFixed(1))}">
        <div class="qc-meter-fill" style="width:${percent}%"></div>
        <div class="qc-meter-glow" style="width:${percent}%"></div>
      </div>
    </div>
  `;
}

function backHTML(tool) {
  const catName = getCategoryName(tool.category);
  const provider = tool.provider ? String(tool.provider) : '';
  const desc = tool.description ? String(tool.description).replace(/\s+/g,' ').trim() : '';
  const link = tool.link ? String(tool.link) : '#';
  const tags = Array.isArray(tool.tags) ? tool.tags.slice(0, 10) : [];
  const badges = Array.isArray(tool.badges) ? tool.badges.slice(0, 6) : [];
  const price = getPriceLabel(tool);

  return `
    <div class="qc-back-inner" role="group" aria-label="Tool Details">
      <button class="qc-x" type="button" data-qc="close" aria-label="Schließen">×</button>

      <div class="qc-head">
        <span class="qc-cat square-category-badge" data-cat="${escapeHtml(tool.category || 'other')}">${escapeHtml(catName)}</span>
        <div class="qc-meta">
          <span class="qc-meta-item">Preis: <strong>${escapeHtml(price)}</strong></span>
          ${provider ? `<span class="qc-meta-item">Provider: <strong>${escapeHtml(provider)}</strong></span>` : ''}
        </div>
      </div>

      <div class="qc-main">
        <h3 class="qc-title square-title-large">${escapeHtml(tool.title)}</h3>
        <p class="qc-desc">${escapeHtml(desc || 'Details & Bewertung im Quantum Hub')}</p>

        <button class="qc-more" type="button" data-qc="more">
          Mehr Infos
        </button>

        <div class="qc-details">
          ${buildMeter(tool.rating)}

          ${badges.length ? `
            <div class="qc-block">
              <div class="qc-block-title">Highlights</div>
              <div class="qc-badges">
                ${badges.map(b => `<div class="qc-badge">${escapeHtml(b)}</div>`).join('')}
              </div>
            </div>
          ` : ''}

          ${tags.length ? `
            <div class="qc-block">
              <div class="qc-block-title">Tags</div>
              <div class="qc-tags">
                ${tags.map(t => `<span class="qc-tag">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          <div class="qc-actions">
            <a class="qc-btn qc-primary" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer nofollow">Tool öffnen</a>
            <button class="qc-btn qc-ghost" type="button" data-qc="back">Zurück</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* -------------------- prepare card -------------------- */
function prepareCard(card) {
  if (!card) return false;
  if (card.getAttribute(QC.initAttr) === '1') return true;

  const toolId = card.dataset.toolId;
  if (!toolId) return false;

  const tool = getToolById(toolId);
  if (!tool) {
    // tools not ready yet -> retry once shortly
    setTimeout(() => {
      if (card && card.getAttribute(QC.initAttr) !== '1') prepareCard(card);
    }, 200);
    return false;
  }

  const front = card.innerHTML;

  card.innerHTML = `
    <div class="qc-face qc-front">
      ${front}
    </div>
    <div class="qc-face qc-back">
      ${backHTML(tool)}
    </div>
  `;

  // prevent overlay link hijacking taps (front)
  const overlay = card.querySelector('.qc-front .card-overlay-link');
  if (overlay) {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.tabIndex = -1;
    overlay.style.pointerEvents = 'none';
  }

  card.setAttribute(QC.initAttr, '1');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-expanded', 'false');
  card.tabIndex = 0;
  return true;
}

/* -------------------- interactions -------------------- */
function openCard(card) {
  if (!card) return;
  if (!prepareCard(card)) return;
  closeAll(card);
  card.classList.add(QC.openClass);
  card.setAttribute('aria-expanded', 'true');
}

function toggleCard(card) {
  if (!card) return;
  if (!prepareCard(card)) return;

  const willOpen = !card.classList.contains(QC.openClass);
  if (willOpen) openCard(card);
  else {
    card.classList.remove(QC.openClass);
    card.classList.remove(QC.detailsClass);
    card.setAttribute('aria-expanded', 'false');
  }
}

function onGridPointerUp(e) {
  const card = e.target.closest(QC.cardSel);
  if (!card) return;

  // back controls
  const qc = e.target.closest('[data-qc]');
  if (qc) {
    const action = qc.getAttribute('data-qc');

    if (action === 'close' || action === 'back') {
      e.preventDefault(); e.stopPropagation();
      card.classList.remove(QC.openClass);
      card.classList.remove(QC.detailsClass);
      card.setAttribute('aria-expanded', 'false');
      return;
    }

    if (action === 'more') {
      e.preventDefault(); e.stopPropagation();
      card.classList.toggle(QC.detailsClass);
      return;
    }
  }

  // allow real link click
  if (e.target.closest('a')) return;

  e.preventDefault();
  e.stopPropagation();
  toggleCard(card);
}

function onGridKeyDown(e) {
  const card = e.target.closest(QC.cardSel);
  if (!card) return;

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleCard(card);
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeAll();
  }
}

function onDocPointerUp(e) {
  if (!e.target.closest(QC.cardSel)) closeAll();
}

/* -------------------- init -------------------- */
function initFlipV2() {
  const grid = document.getElementById(QC.gridId);
  if (!grid) {
    setTimeout(initFlipV2, 250);
    return;
  }

  // prepare current cards
  grid.querySelectorAll(QC.cardSel).forEach(prepareCard);

  // remove old handlers (idempotent)
  if (grid._qcV2Bound) {
    grid.removeEventListener('pointerup', grid._qcV2PointerUp, true);
    grid.removeEventListener('keydown', grid._qcV2KeyDown, true);
    document.removeEventListener('pointerup', grid._qcV2DocUp, true);
    grid._qcV2Bound = false;
  }

  grid._qcV2PointerUp = onGridPointerUp;
  grid._qcV2KeyDown = onGridKeyDown;
  grid._qcV2DocUp = onDocPointerUp;

  grid.addEventListener('pointerup', onGridPointerUp, true);
  grid.addEventListener('keydown', onGridKeyDown, true);
  document.addEventListener('pointerup', onDocPointerUp, true);

  grid._qcV2Bound = true;

  // observer for rerenders
  if (!grid._qcV2Obs) {
    grid._qcV2Obs = new MutationObserver(() => {
      grid.querySelectorAll(QC.cardSel).forEach(prepareCard);
    });
    grid._qcV2Obs.observe(grid, { childList: true, subtree: true });
  }

  console.log('✅ flip-card V2 ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(initFlipV2));
} else {
  requestAnimationFrame(initFlipV2);
}
window.addEventListener('quantumready', () => requestAnimationFrame(initFlipV2));