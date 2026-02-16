/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM - MOBILE SAFE (V1.1)
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
     'Daten',
    other: 'Sonstiges'
  };
  return names[cat] || names.other;
}

function getToolById(toolId) {
  const id = String(toolId || '');
  const tools = window.appState && Array.isArray(window.appState.tools) 
    ? window.appState.tools 
    : null;
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
  if (typeof tool.is_free === 'boolean') 
    return tool.is_free ? 'Kostenlos' : 'Paid';
  if (tool.price != null && String(tool.price).trim() !== '') 
    return String(tool.price);
  
  const badges = Array.isArray(tool.badges) ? tool.badges : [];
  const joined = badges.map(b => String(b).toLowerCase());
  if (joined.some(x => x.includes('free') || x.includes('kostenlos'))) 
    return 'Kostenlos';
  
  return 'Unbekannt';
}

function buildBackMarquee(tool) {
  const tags = Array.isArray(tool.tags) 
    ? tool.tags.filter(Boolean).slice(0, 4).map(String) 
    : [];
  
  if (tags.length) return tags.join(' • ');
  
  const desc = tool.description ? String(tool.description) : '';
  const clean = desc.replace(/\s+/g, ' ').trim();
  return clean 
    ? clean.slice(0, 44) + (clean.length > 44 ? '…' : '') 
    : 'Mehr entdecken • Quantum Hub';
}

/* -------------------- back face markup -------------------- */
function buildRatingPill(rating) {
  const r = clamp(rating || 0, 0, 5);
  return `
    <div class="qc-pill">
      <div class="qc-pill-label">Rating</div>
      <div class="qc-pill-value">${r.toFixed(1)} ★</div>
    </div>
  `;
}

function buildPricePill(priceLabel) {
  return `
    <div class="qc-pill">
      <div class="qc-pill-label">Preis</div>
      <div class="qc-pill-value">${escapeHtml(priceLabel)}</div>
    </div>
  `;
}

function buildBackFace(tool) {
  if (!tool) return '';

  const catName = getCategoryName(tool.category);
  const priceLabel = getPriceLabel(tool);
  const rating = clamp(tool.rating || 0, 0, 5);
  const desc = tool.description ? String(tool.description) : '';
  const provider = tool.provider ? escapeHtml(String(tool.provider)) : '';
  const link = tool.link ? String(tool.link) : '#';

  const tags = Array.isArray(tool.tags) 
    ? tool.tags.filter(Boolean).slice(0, 6).map(String) 
    : [];

  const marqueeText = buildBackMarquee(tool);

  return `
    <div class="card-face card-face-back" data-nosnippet>
      
      <!-- Close Button -->
      <button class="qc-close" data-qc-action="close" aria-label="Schließen">×</button>

      <!-- Top Pills -->
      <div class="qc-top-pills">
        ${buildRatingPill(rating)}
        ${buildPricePill(priceLabel)}
      </div>

      <!-- Category Badge -->
      <div class="qc-back-badges">
        <span class="qc-back-category badge badge-${tool.category || 'other'}">
          ${escapeHtml(catName)}
        </span>
      </div>

      <!-- Center Content -->
      <div class="qc-center">
        
        <!-- Title -->
        <h3 class="qc-back-title">${escapeHtml(tool.title || 'Tool')}</h3>

        <!-- Subtitle/Description -->
        <p class="qc-back-sub">
          ${escapeHtml(desc ? desc.replace(/\s+/g, ' ').trim() : 'Details & Bewertung im Quantum Hub')}
        </p>

        <!-- Main CTA -->
        <a 
          href="${escapeHtml(link)}" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="qc-hero-btn"
        >
          <span class="qc-hero-text">Jetzt öffnen</span>
          <span class="qc-hero-chev">→</span>
        </a>

        <!-- Details Section (initially hidden) -->
        <div class="qc-details">
          
          ${provider ? `<div class="qc-provider">Von <strong>${provider}</strong></div>` : ''}

          ${tags.length > 0 ? `
            <div class="qc-tags">
              ${tags.map(t => `<span class="qc-tag">${escapeHtml(t)}</span>`).join('')}
            </div>
          ` : ''}

          <!-- Neural Rating -->
          <div class="qc-rating">
            <div class="qc-rating-top">
              <span class="qc-rating-label">AI Score</span>
              <span class="qc-rating-value">${rating.toFixed(1)}</span>
            </div>
            <div class="qc-rating-meter">
              <div class="qc-rating-fill" style="width: ${(rating / 5) * 100}%"></div>
              <div class="qc-rating-glow" style="width: ${(rating / 5) * 100}%"></div>
            </div>
            <div class="qc-rating-hint">Basierend auf ${Math.floor(rating * 42)} Bewertungen</div>
          </div>

          <!-- Actions -->
          <div class="qc-actions">
            <a 
              href="${escapeHtml(link)}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="qc-btn qc-btn-primary"
            >
              Tool öffnen
            </a>
            <button 
              class="qc-btn qc-btn-ghost" 
              data-qc-action="share"
            >
              Teilen
            </button>
          </div>

        </div>

      </div>

      <!-- Bottom Marquee -->
      <div class="qc-bottom-pill">${escapeHtml(marqueeText)}</div>

    </div>
  `;
}

/* -------------------- init & events -------------------- */
function injectBackFaces() {
  const cards = document.querySelectorAll('.card-square[data-tool-id]');
  let injected = 0;

  cards.forEach(card => {
    if (card.querySelector('.card-face-back')) return;

    const toolId = card.getAttribute('data-tool-id');
    const tool = getToolById(toolId);
    if (!tool) return;

    const backHtml = buildBackFace(tool);
    if (!backHtml) return;

    card.insertAdjacentHTML('beforeend', backHtml);
    card.setAttribute('data-flip-initialized', 'true');
    injected++;
  });

  console.log(`✅ Injected ${injected} back faces`);
}

function attachFlipListeners() {
  document.addEventListener('click', e => {
    const card = e.target.closest('.card-square[data-tool-id]');

    // Close button
    if (e.target.closest('[data-qc-action="close"]')) {
      e.preventDefault();
      e.stopPropagation();
      if (card) {
        card.classList.remove('is-flipped');
        card.classList.remove('qc-details-open');
      }
      return;
    }

    // Share button
    if (e.target.closest('[data-qc-action="share"]')) {
      e.preventDefault();
      e.stopPropagation();
      const toolId = card?.getAttribute('data-tool-id');
      const tool = getToolById(toolId);
      if (tool && navigator.share) {
        navigator.share({
          title: tool.title,
          text: tool.description,
          url: tool.link
        }).catch(() => {});
      }
      return;
    }

    // Main CTA (Mehr Infos) - toggles details
    if (e.target.closest('.qc-hero-btn:not([href])')) {
      e.preventDefault();
      e.stopPropagation();
      if (card) {
        card.classList.toggle('qc-details-open');
      }
      return;
    }

    // Card click to flip
    if (card) {
      const isLink = e.target.closest('a[href], button');
      if (isLink) return;

      const isFlipped = card.classList.contains('is-flipped');
      
      if (!isFlipped) {
        closeAllFlips();
        card.classList.add('is-flipped');
        card.setAttribute('aria-expanded', 'true');
      } else {
        card.classList.remove('is-flipped');
        card.classList.remove('qc-details-open');
        card.setAttribute('aria-expanded', 'false');
      }
      
      return;
    }

    // Click outside - close all
    if (!e.target.closest('.card-square')) {
      closeAllFlips();
    }
  });
}

/* -------------------- boot -------------------- */
function boot() {
  injectBackFaces();
  attachFlipListeners();
  console.log('✅ Flip card system ready!');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Re-inject on tool updates
if (window.addEventListener) {
  window.addEventListener('toolsrendered', () => {
    console.log('🔄 Tools re-rendered, re-injecting back faces...');
    setTimeout(injectBackFaces, 100);
  });
}
