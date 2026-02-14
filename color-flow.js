// =========================================
// QUANTUM AI HUB — GRID-SYNCHRONIZED NETWORK
// Version 6.0 - Exact Grid Size • Strong Glow
// Canvas = Grid-Größe • Stärkere Linien • Perfekt synchronisiert
// =========================================

'use strict';

class GridSynchronizedNetwork {

  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.gridElement = null;

    // State
    this.tools = [];
    this.connections = [];
    this.animationFrame = null;
    this.resizeObserver = null;

    // Performance
    this.isMobile = this.detectMobile();
    this.targetFPS = 60;

    // Configuration - STÄRKERE LINIEN!
    this.config = {
      maxConnectionsPerTool: this.isMobile ? 3 : 4,
      maxDistance: this.isMobile ? 450 : 600,
      minDistance: 120,

      // Stärkere visuelle Präsenz
      lineWidth: this.isMobile ? 2 : 2.5,
      glowWidth: this.isMobile ? 5 : 6,
      baseOpacity: 0.28,        // Deutlich sichtbarer!
      glowOpacity: 0.15,         // Starker Glow!

      pulseSpeed: 0.0015,
      pulseAmplitude: 0.12,      // Stärkeres Pulsieren

      categoryWeights: {
        same: 4,
        related: 2.5,
        different: 0.3
      },

      curveIntensity: this.isMobile ? 0.25 : 0.35
    };

    // Farben - kräftiger!
    this.colors = {
      text: { base: '#00D4FF', glow: 'rgba(0, 212, 255, 0.5)' },
      image: { base: '#E040FB', glow: 'rgba(224, 64, 251, 0.5)' },
      code: { base: '#7C4DFF', glow: 'rgba(124, 77, 255, 0.5)' },
      audio: { base: '#FF6B9D', glow: 'rgba(255, 107, 157, 0.5)' },
      video: { base: '#448AFF', glow: 'rgba(68, 138, 255, 0.5)' },
      data: { base: '#1DE9B6', glow: 'rgba(29, 233, 182, 0.5)' },
      other: { base: '#B0BEC5', glow: 'rgba(176, 190, 197, 0.5)' }
    };

    this.relatedCategories = {
      text: ['code', 'data'],
      image: ['video'],
      code: ['text', 'data'],
      audio: ['video'],
      video: ['image', 'audio'],
      data: ['text', 'code']
    };

    // Init
    this.init();
  }

  // =========================================
  // INITIALIZATION
  // =========================================

  init() {
    // Warte auf Grid-Element
    const checkGrid = () => {
      this.gridElement = document.getElementById('tool-grid') || 
                         document.querySelector('.tool-grid-squares');

      if (!this.gridElement) {
        setTimeout(checkGrid, 100);
        return;
      }

      this.setupCanvas();
      this.observeGrid();
      this.observeTools();
      this.start();

      console.log('✅ GridSynchronizedNetwork v6.0 initialized');
      console.log(`📱 Mobile: ${this.isMobile}`);
      console.log(`📐 Grid Size: ${this.gridElement.offsetWidth}x${this.gridElement.offsetHeight}`);
    };

    checkGrid();
  }

  detectMobile() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
    return hasTouch || isSmallScreen || isMobileUA;
  }

  // =========================================
  // CANVAS SETUP - EXAKTE GRID-GRÖSSE
  // =========================================

  setupCanvas() {
    if (!this.gridElement) return;

    // Erstelle Canvas wenn nicht vorhanden
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'grid-network-canvas';
      this.canvas.className = 'connection-canvas';

      // Canvas direkt VOR das Grid setzen (als Sibling)
      this.gridElement.parentElement.insertBefore(this.canvas, this.gridElement);

      this.ctx = this.canvas.getContext('2d', { 
        alpha: true, 
        desynchronized: true,
        willReadFrequently: false 
      });
    }

    // WICHTIG: Canvas hat EXAKT die gleiche Größe wie das Grid!
    const gridRect = this.gridElement.getBoundingClientRect();
    const gridStyles = window.getComputedStyle(this.gridElement);

    // Grid-Position relativ zum Parent
    const parent = this.gridElement.parentElement;
    const parentRect = parent.getBoundingClientRect();

    const dpr = this.isMobile 
      ? Math.min(window.devicePixelRatio || 1, 2)
      : Math.min(window.devicePixelRatio || 1, 2.5);

    // Canvas EXAKT über dem Grid positionieren
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = (gridRect.left - parentRect.left) + 'px';
    this.canvas.style.top = (gridRect.top - parentRect.top) + 'px';
    this.canvas.style.width = gridRect.width + 'px';
    this.canvas.style.height = gridRect.height + 'px';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '0';

    // Canvas-Größe mit DPR
    this.canvas.width = gridRect.width * dpr;
    this.canvas.height = gridRect.height * dpr;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = this.isMobile ? 'medium' : 'high';

    // Parent braucht position: relative
    if (window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    console.log(`📐 Canvas: ${gridRect.width}x${gridRect.height}px`);
  }

  // =========================================
  // GRID SIZE OBSERVER
  // =========================================

  observeGrid() {
    if (!this.gridElement) return;

    // ResizeObserver für Grid-Größenänderungen
    this.resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === this.gridElement) {
          // Grid hat sich geändert → Canvas neu positionieren
          this.setupCanvas();
          this.scanTools();
        }
      }
    });

    this.resizeObserver.observe(this.gridElement);

    // Window Resize
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.setupCanvas();
        this.scanTools();
      }, 150);
    }, { passive: true });

    // Scroll Handler
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        this.setupCanvas(); // Position aktualisieren
      }, 50);
    }, { passive: true });
  }

  // =========================================
  // TOOL OBSERVATION
  // =========================================

  observeTools() {
    let debounceTimer = null;

    const scan = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this.scanTools(), 150);
    };

    // Initial scan
    setTimeout(() => this.scanTools(), 200);

    // Mutation Observer
    const observer = new MutationObserver(() => scan());

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  scanTools() {
    if (!this.canvas || !this.gridElement) return;

    const elements = document.querySelectorAll('.card-square');

    if (elements.length === 0) {
      this.tools = [];
      this.connections = [];
      return;
    }

    // Canvas-Position relativ zum Viewport
    const canvasRect = this.canvas.getBoundingClientRect();

    this.tools = Array.from(elements).map(el => {
      const rect = el.getBoundingClientRect();

      // Position RELATIV zum Canvas
      return {
        element: el,
        category: el.dataset.category || 'other',
        name: el.dataset.toolName || 
              el.querySelector('.square-title-large')?.textContent || 
              'Unknown',
        center: {
          x: (rect.left + rect.width / 2) - canvasRect.left,
          y: (rect.top + rect.height / 2) - canvasRect.top
        },
        rect: rect
      };
    });

    this.buildNetwork();
  }

  // =========================================
  // NETWORK BUILDING
  // =========================================

  buildNetwork() {
    this.connections = [];

    if (this.tools.length < 2) return;

    const usedPairs = new Set();

    this.tools.forEach((tool) => {
      const candidates = this.findBestConnections(tool);

      candidates.slice(0, this.config.maxConnectionsPerTool).forEach(candidate => {
        const pair1 = `${tool.name}-${candidate.tool.name}`;
        const pair2 = `${candidate.tool.name}-${tool.name}`;

        if (usedPairs.has(pair1) || usedPairs.has(pair2)) return;

        usedPairs.add(pair1);
        usedPairs.add(pair2);

        const path = this.calculatePath(tool, candidate.tool);
        const colors = this.colors[tool.category] || this.colors.other;

        this.connections.push({
          from: tool,
          to: candidate.tool,
          path: path,
          color: colors.base,
          glowColor: colors.glow,
          score: candidate.score,
          animationOffset: Math.random() * Math.PI * 2
        });
      });
    });

    console.log(`🕸️ Netzwerk: ${this.connections.length} Verbindungen (${this.tools.length} Tools)`);
  }

  findBestConnections(tool) {
    const candidates = [];

    this.tools.forEach(otherTool => {
      if (tool === otherTool) return;

      const distance = this.getDistance(tool.center, otherTool.center);

      if (distance > this.config.maxDistance || distance < this.config.minDistance) return;

      let score = 1000 - distance;

      if (tool.category === otherTool.category) {
        score += 400 * this.config.categoryWeights.same;
      } else if (this.isRelatedCategory(tool.category, otherTool.category)) {
        score += 200 * this.config.categoryWeights.related;
      } else {
        score += 50 * this.config.categoryWeights.different;
      }

      const distanceRatio = distance / this.config.maxDistance;
      score *= (1 - distanceRatio * 0.4);

      candidates.push({ tool: otherTool, score, distance });
    });

    return candidates.sort((a, b) => b.score - a.score);
  }

  isRelatedCategory(cat1, cat2) {
    return this.relatedCategories[cat1]?.includes(cat2) || false;
  }

  getDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // =========================================
  // PATH CALCULATION
  // =========================================

  calculatePath(fromTool, toTool) {
    const start = fromTool.center;
    const end = toTool.center;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 200) {
      return [start, end];
    }

    const curveAmount = distance * this.config.curveIntensity;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    const perpX = -dy / distance;
    const perpY = dx / distance;

    const offsetVariation = (Math.random() - 0.5) * 0.4 + 1;

    const controlPoint = {
      x: midX + perpX * curveAmount * offsetVariation,
      y: midY + perpY * curveAmount * offsetVariation
    };

    return this.bezierToPoints(start, controlPoint, end, 25);
  }

  bezierToPoints(p0, p1, p2, steps = 25) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      points.push({
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
      });
    }
    return points;
  }

  // =========================================
  // ANIMATION LOOP
  // =========================================

  start() {
    const animate = (timestamp) => {
      this.draw(timestamp);
      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  draw(timestamp) {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.connections.length === 0) return;

    this.connections.forEach(conn => {
      this.drawConnection(ctx, conn, timestamp);
    });
  }

  drawConnection(ctx, conn, timestamp) {
    if (!conn.path || conn.path.length < 2) return;

    // Stärkeres Pulsieren
    const pulse = Math.sin(timestamp * this.config.pulseSpeed + conn.animationOffset) * 0.5 + 0.5;
    const pulseMultiplier = 1 + pulse * this.config.pulseAmplitude;

    const opacity = this.config.baseOpacity * pulseMultiplier;
    const glowOpacity = this.config.glowOpacity * pulseMultiplier;

    // Starker Glow Layer
    ctx.beginPath();
    ctx.moveTo(conn.path[0].x, conn.path[0].y);
    for (let i = 1; i < conn.path.length; i++) {
      ctx.lineTo(conn.path[i].x, conn.path[i].y);
    }
    ctx.strokeStyle = conn.glowColor.replace(/[\d\.]+\)$/, `${glowOpacity})`);
    ctx.lineWidth = this.config.glowWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Main Line (kräftig!)
    ctx.beginPath();
    ctx.moveTo(conn.path[0].x, conn.path[0].y);
    for (let i = 1; i < conn.path.length; i++) {
      ctx.lineTo(conn.path[i].x, conn.path[i].y);
    }

    const r = parseInt(conn.color.slice(1, 3), 16);
    const g = parseInt(conn.color.slice(3, 5), 16);
    const b = parseInt(conn.color.slice(5, 7), 16);

    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.lineWidth = this.config.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // =========================================
  // PUBLIC API
  // =========================================

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    console.log('🔴 GridSynchronizedNetwork destroyed');
  }

  refresh() {
    this.scanTools();
  }

  setOpacity(value) {
    this.config.baseOpacity = Math.max(0, Math.min(1, value));
    this.config.glowOpacity = value * 0.5;
  }

  setMaxConnections(value) {
    this.config.maxConnectionsPerTool = Math.max(1, Math.min(10, value));
    this.buildNetwork();
  }

  getStats() {
    return {
      tools: this.tools.length,
      connections: this.connections.length,
      isMobile: this.isMobile,
      canvasSize: this.canvas ? `${this.canvas.width}x${this.canvas.height}` : 'N/A',
      gridSize: this.gridElement ? `${this.gridElement.offsetWidth}x${this.gridElement.offsetHeight}` : 'N/A'
    };
  }
}

// =========================================
// AUTO-INITIALIZE
// =========================================

window.addEventListener('quantum:ready', () => {
  console.log('🕸️ GridSynchronizedNetwork: Received quantum:ready event');

  if (window.colorFlow) {
    console.log('⚠️ ColorFlow already exists');
    return;
  }

  setTimeout(() => {
    try {
      window.colorFlow = new GridSynchronizedNetwork();
    } catch (error) {
      console.error('❌ GridSynchronizedNetwork initialization failed:', error);
    }
  }, 300);
});

// Debug
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.debugColorFlow = () => {
    if (!window.colorFlow) return;
    const stats = window.colorFlow.getStats();
    console.table(stats);
  };
  console.log('🛠️ Debug: window.debugColorFlow() verfügbar');
}
