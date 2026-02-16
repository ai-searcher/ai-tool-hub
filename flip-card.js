/* ═══════════════════════════════════════════════════════════
   FLIP CARD SYSTEM - MINIMAL
   ══════════════════════════════════════════════════════════ */

'use strict';
console.log('🚀 flip-card.js loading...');

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
  const tools = window.appState?.tools;
  if (!Array.isArray(tools)) return null;
  return tools.find(t => String(t.id) === id) || null;
}

function buildBackFace(tool) {
  if (!tool) return '';

  const catName = getCategoryName(tool.category);
  const desc = tool.description ? String(tool.description) : '';
  const link = tool.link ? String(tool.link) : '#';

  return `
    <div class="card-face card-face-back">
      <button class="qc-close" data-qc-action="close">×</button>
      
      <div class="qc-center">
        <span class="qc-back-category badge badge-${tool.category || 'other'}">
          ${escapeHtml(catName)}
        </span>
        
        <h3 class="qc-back-title">${escapeHtml(tool.title || 'Tool')}</h3>
        
        <p class="qc-back-sub">
          ${escapeHtml(desc ? desc.replace(/\s+/g, ' ').trim().slice(0, 120) : 'Weitere Details')}
        </p>
        
        <a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="qc-hero-btn">
          <span>Tool öffnen</span>
          <span>→</span>
        </a>
      </div>
    </div>
  `;
}

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
      }
      return;
    }

    // Card click to flip
    if (card) {
      const isLink = e.target.closest('a[href]');
      if (isLink && !card.classList.contains('is-flipped')) return;

      e.preventDefault();
      e.stopPropagation();

      // Close all others first
      document.querySelectorAll('.card-square.is-flipped').forEach(c => {
        if (c !== card) c.classList.remove('is-flipped');
      });

      // Toggle this one
      card.classList.toggle('is-flipped');
      return;
    }

    // Click outside - close all
    if (!e.target.closest('.card-square')) {
      document.querySelectorAll('.card-square.is-flipped').forEach(c => {
        c.classList.remove('is-flipped');
      });
    }
  });
}

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
