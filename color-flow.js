// =========================================
// QUANTUM AI HUB — GRID-ATTACHED NETWORK FLOW
// Version 5.0 - Fixed to Grid • Scrolls Together
// Linien sind Teil des Grids und scrollen MIT!
// =========================================

'use strict';

class GridAttachedNetworkFlow {

  constructor() {
    // ✅ Verwende bestehendes Canvas ODER erstelle im Grid
    this.canvas = this.findOrCreateCanvas();

    if (!this.canvas) {
      console.warn('⚠️ Canvas nicht verfügbar');
      return;
    }

    this.ctx = this.canvas.getContext('2d', { 
      alpha: true, 
      desynchronized: true,
      willReadFrequently: false 
    });

    // State
    this.tools = [];
    this.connections = [];
    this.animationFrame = null;
    this.lastUpdate = 0;
    this.scrollContainer = null;

    // Performance
    this.isMobile = this.detectMobile();
    this.targetFPS = 60;

    // Configuration
    this.config = {
      maxConnectionsPerTool: this.isMobile ? 3 : 4,
      maxDistance: this.isMobile ? 450 : 600,
      minDistance: 120,

      lineWidth: this.isMobile ? 1.5 : 2,
      glowWidth: this.isMobile ? 3 : 4,
      baseOpacity: 0.15,
      glowOpacity: 0.08,

      pulseSpeed: 0.0012,
      pulseAmplitude: 0.08,

      categoryWeights: {
        same: 4,
        related: 2.5,
        different: 0.3
      },

      curveIntensity: this.isMobile ? 0.25 : 0.35
    };

    // Farben
    this.colors = {
      text: { base: '#00D4FF', glow: 'rgba(0, 212, 255, 0.3)' },
      image: { base: '#E040FB', glow: 'rgba(224, 64, 251, 0.3)' },
      code: { base: '#7C4DFF', glow: 'rgba(124, 77, 255, 0.3)' },
      audio: { base: '#FF6B9D', glow: 'rgba(255, 107, 157, 0.3)' },
      video: { base: '#448AFF', glow: 'rgba(68, 138, 255, 0.3)' },
      data: { base: '#1DE9B6', glow: 'rgba(29, 233, 182, 0.3)' },
      other: { base: '#B0BEC5', glow: 'rgba(176, 190, 197, 0.3)' }
    };

    // Kategorie-Beziehungen
    this.relatedCategories = {
      text: ['code', 'data'],
      image: ['video'],
      code: ['text', 'data'],
      audio: ['video'],
      video: ['image', 'audio'],
      data: ['text', 'code']
    };

    // Setup
    this.setupCanvas();
    this.observeTools();
    this.start();

    console.log('✅ GridAttachedNetworkFlow v5.0 initialized');
    console.log(`📱 Mobile: ${this.isMobile}`);
  }

  // =========================================
  // CANVAS SETUP - ATTACHED TO GRID
  // =========================================

  findOrCreateCanvas() {
    // Versuche bestehendes Canvas zu finden
    let canvas = document.getElementById('connection-canvas') || 
                 document.querySelector('.connection-canvas');

    if (canvas) {
      console.log('✅ Canvas gefunden, repositioniere...');
      this.repositionCanvas(canvas);
      return canvas;
    }

    // Erstelle neues Canvas im Grid-Container
    console.log('⚠️ Canvas nicht gefunden, erstelle neues...');
    return this.createCanvasInGrid();
  }

  repositionCanvas(canvas) {
    // Finde Grid-Container
    const grid = document.getElementById('tool-grid') || 
                 document.querySelector('.tool-grid-squares');

    if (!grid) return;

    const container = grid.parentElement;

    // Canvas direkt VOR das Grid setzen (als Sibling)
    if (canvas.parentElement !== container) {
      container.insertBefore(canvas, grid);
    }

    // Stelle sicher, dass Canvas die richtigen Styles hat
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0'; // Unter den Karten
  }

  createCanvasInGrid() {
    const grid = document.getElementById('tool-grid') || 
                 document.querySelector('.tool-grid-squares');

    if (!grid) {
      console.error('❌ Grid nicht gefunden!');
      return null;
    }

    const container = grid.parentElement;

    // Erstelle Canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'connection-canvas';
    canvas.className = 'connection-canvas';

    // Styles für absolute Positionierung
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';

    // Container muss position: relative haben
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    // Canvas VOR dem Grid einfügen
    container.insertBefore(canvas, grid);

    console.log('✅ Canvas im Grid erstellt');
    return canvas;
  }

  detectMobile() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
    return hasTouch || isSmallScreen || isMobileUA;
  }

  setupCanvas() {
    const dpr = this.isMobile 
      ? Math.min(window.devicePixelRatio || 1, 2)
      : Math.min(window.devicePixelRatio || 1, 2.5);

    // Canvas füllt den PARENT Container aus (nicht das ganze Viewport!)
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = this.isMobile ? 'medium' : 'high';
  }

  // =========================================
  // TOOL OBSERVATION
  // =========================================

  observeTools() {
    let debounceTimer = null;
    let isScanning = false;

    const scan = () => {
      if (isScanning) return;
      isScanning = true;

      requestAnimationFrame(() => {
        const elements = document.querySelectorAll('.card-square');

        if (elements.length === 0) {
          this.tools = [];
          this.connections = [];
          isScanning = false;
          return;
        }

        // WICHTIG: Positionen relativ zum Canvas-Parent berechnen!
        const canvasParent = this.canvas.parentElement;
        const canvasRect = canvasParent ? canvasParent.getBoundingClientRect() : { left: 0, top: 0 };

        this.tools = Array.from(elements).map(el => {
          const rect = el.getBoundingClientRect();

          // Position RELATIV zum Canvas berechnen
          return {
            element: el,
            category: el.dataset.category || 'other',
            name: el.dataset.toolName || 
                  el.querySelector('.square-title-large')?.textContent || 
                  'Unknown',
            center: {
              x: rect.left + rect.width / 2 - canvasRect.left,
              y: rect.top + rect.height / 2 - canvasRect.top
            },
            rect: rect
          };
        });

        this.buildIntelligentNetwork();
        isScanning = false;
      });
    };

    setTimeout(scan, 150);

    // Mutation Observer
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scan, 200);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Resize Handler
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.setupCanvas();
        scan();
      }, 150);
    }, { passive: true });

    // Scroll Handler - WICHTIG: Positionen NEU berechnen!
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scan(); // Positionen aktualisieren
      }, 50); // Schneller als vorher, damit es smooth bleibt
    }, { passive: true });
  }

  // =========================================
  // INTELLIGENT NETWORK BUILDING
  // =========================================

  buildIntelligentNetwork() {
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

    console.log(`🕸️ Netzwerk: ${this.connections.length} Verbindungen`);
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
    const animate = (currentTime) => {
      this.draw(currentTime);
      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  draw(timestamp) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.connections.length === 0) return;

    this.connections.forEach(conn => {
      this.drawConnection(ctx, conn, timestamp);
    });
  }

  drawConnection(ctx, conn, timestamp) {
    if (!conn.path || conn.path.length < 2) return;

    const pulse = Math.sin(timestamp * this.config.pulseSpeed + conn.animationOffset) * 0.5 + 0.5;
    const pulseMultiplier = 1 + pulse * this.config.pulseAmplitude;

    const opacity = this.config.baseOpacity * pulseMultiplier;
    const glowOpacity = this.config.glowOpacity * pulseMultiplier;

    // Glow Layer
    if (!this.isMobile || glowOpacity > 0.03) {
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
    }

    // Main Line
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
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    console.log('🔴 GridAttachedNetworkFlow destroyed');
  }

  refresh() {
    this.buildIntelligentNetwork();
  }

  setOpacity(value) {
    this.config.baseOpacity = Math.max(0, Math.min(1, value));
    this.config.glowOpacity = value * 0.5;
  }

  setMaxConnections(value) {
    this.config.maxConnectionsPerTool = Math.max(1, Math.min(10, value));
    this.buildIntelligentNetwork();
  }

  getStats() {
    return {
      tools: this.tools.length,
      connections: this.connections.length,
      isMobile: this.isMobile,
      canvasPosition: this.canvas.style.position
    };
  }
}

// =========================================
// AUTO-INITIALIZE
// =========================================

window.addEventListener('quantum:ready', () => {
  console.log('🕸️ GridAttachedFlow: Received quantum:ready event');

  if (window.colorFlow) {
    console.log('⚠️ ColorFlow already exists');
    return;
  }

  setTimeout(() => {
    try {
      window.colorFlow = new GridAttachedNetworkFlow();
      console.log('✅ GridAttachedFlow ready');
      console.log('📌 Canvas Position:', window.colorFlow.canvas.style.position);
    } catch (error) {
      console.error('❌ GridAttachedFlow initialization failed:', error);
    }
  }, 200);
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
