// =========================================
// QUANTUM AI HUB — ULTIMATE NETWORK FLOW
// Version 4.0 - Always-On Neural Network
// Mobile First • Full Performance • Permanent Network
// =========================================

'use strict';

class UltimateNetworkFlow {

  constructor() {
    // ✅ Verwende bestehendes Canvas
    this.canvas = document.getElementById('connection-canvas') || 
                  document.querySelector('.connection-canvas') ||
                  this.createFallbackCanvas();

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
    this.isInitialized = false;

    // Performance
    this.isMobile = this.detectMobile();
    this.targetFPS = 60; // Volle Power!
    this.frameInterval = 1000 / this.targetFPS;

    // Configuration - Optimiert für Mobile & Desktop
    this.config = {
      // Connection Settings
      maxConnectionsPerTool: this.isMobile ? 3 : 4,
      maxDistance: this.isMobile ? 450 : 600,
      minDistance: 120, // Zu nah = nicht verbinden

      // Visual Settings
      lineWidth: this.isMobile ? 1.5 : 2,
      glowWidth: this.isMobile ? 3 : 4,
      baseOpacity: 0.12, // Dezent aber sichtbar
      glowOpacity: 0.06,

      // Animation
      pulseSpeed: 0.0012,
      pulseAmplitude: 0.08,
      flowSpeed: 0.00015, // Langsamer Flow-Effekt

      // Smart Connection
      categoryWeights: {
        same: 4,      // Stark bevorzugt
        related: 2.5,
        different: 0.3
      },

      // Layout
      avoidOverlap: true,
      curveIntensity: this.isMobile ? 0.25 : 0.35
    };

    // Farben - Dein Design
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

    console.log('✅ UltimateNetworkFlow v4.0 initialized');
    console.log(`📱 Mobile: ${this.isMobile}, Target FPS: ${this.targetFPS}`);
    this.isInitialized = true;
  }

  // =========================================
  // MOBILE DETECTION
  // =========================================

  detectMobile() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    // Touch-fähig
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Screen Size
    const isSmallScreen = window.innerWidth < 768;

    // User Agent Check
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());

    return hasTouch || isSmallScreen || isMobileUA;
  }

  // =========================================
  // CANVAS MANAGEMENT
  // =========================================

  createFallbackCanvas() {
    const canvas = document.createElement('canvas');
    canvas.id = 'connection-canvas';
    canvas.className = 'connection-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);
    return canvas;
  }

  setupCanvas() {
    // Adaptive DPR für Performance
    const dpr = this.isMobile 
      ? Math.min(window.devicePixelRatio || 1, 2)  // Mobile: max 2x
      : Math.min(window.devicePixelRatio || 1, 2.5); // Desktop: max 2.5x

    const rect = document.documentElement.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Optimierungen
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

        // Update tool positions
        this.tools = Array.from(elements).map(el => {
          const rect = el.getBoundingClientRect();
          return {
            element: el,
            category: el.dataset.category || 'other',
            name: el.dataset.toolName || 
                  el.querySelector('.square-title-large')?.textContent || 
                  'Unknown',
            center: {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            },
            rect: rect
          };
        });

        // Berechne Netzwerk
        this.buildIntelligentNetwork();

        isScanning = false;
      });
    };

    // Initial scan mit Verzögerung
    setTimeout(scan, 150);

    // Mutation Observer für DOM Changes
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scan, 200);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Resize Handler (throttled)
    let resizeTimer = null;
    let isResizing = false;

    window.addEventListener('resize', () => {
      if (isResizing) return;

      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        isResizing = true;
        this.setupCanvas();
        scan();
        setTimeout(() => { isResizing = false; }, 100);
      }, 150);
    }, { passive: true });

    // Scroll Handler (nur wenn nötig)
    let scrollTimer = null;
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
      // Nur bei größeren Scroll-Änderungen neu scannen
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) > 100) {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          scan();
          lastScrollY = currentScrollY;
        }, 150);
      }
    }, { passive: true });
  }

  // =========================================
  // INTELLIGENT NETWORK BUILDING
  // =========================================

  buildIntelligentNetwork() {
    this.connections = [];

    if (this.tools.length < 2) return;

    const usedPairs = new Set();

    // Für jedes Tool die besten Verbindungen finden
    this.tools.forEach((tool, index) => {
      const candidates = this.findBestConnections(tool);

      candidates.slice(0, this.config.maxConnectionsPerTool).forEach(candidate => {
        // Erstelle eindeutigen Pair-Key (bidirektional)
        const pair1 = `${tool.name}-${candidate.tool.name}`;
        const pair2 = `${candidate.tool.name}-${tool.name}`;

        if (usedPairs.has(pair1) || usedPairs.has(pair2)) return;

        usedPairs.add(pair1);
        usedPairs.add(pair2);

        // Erstelle Verbindung
        const path = this.calculatePath(tool, candidate.tool);
        const colors = this.colors[tool.category] || this.colors.other;

        this.connections.push({
          from: tool,
          to: candidate.tool,
          path: path,
          color: colors.base,
          glowColor: colors.glow,
          score: candidate.score,
          animationOffset: Math.random() * Math.PI * 2, // Für Pulsieren
          flowOffset: Math.random() * Math.PI * 2        // Für Flow-Effekt
        });
      });
    });

    console.log(`🕸️ Netzwerk erstellt: ${this.connections.length} Verbindungen`);
  }

  findBestConnections(tool) {
    const candidates = [];

    this.tools.forEach(otherTool => {
      if (tool === otherTool) return;

      const distance = this.getDistance(tool.center, otherTool.center);

      // Zu weit oder zu nah = ignorieren
      if (distance > this.config.maxDistance || distance < this.config.minDistance) return;

      // Score berechnen
      let score = 1000 - distance;

      // Kategorie-Boost
      if (tool.category === otherTool.category) {
        score += 400 * this.config.categoryWeights.same;
      } else if (this.isRelatedCategory(tool.category, otherTool.category)) {
        score += 200 * this.config.categoryWeights.related;
      } else {
        score += 50 * this.config.categoryWeights.different;
      }

      // Distanz-Penalty (Nähe bevorzugen)
      const distanceRatio = distance / this.config.maxDistance;
      score *= (1 - distanceRatio * 0.4);

      candidates.push({ 
        tool: otherTool, 
        score, 
        distance 
      });
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

    // Gerade Linie für kurze Distanzen
    if (distance < 200) {
      return [start, end];
    }

    // Bézierkurve für längere Distanzen
    const curveAmount = distance * this.config.curveIntensity;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    // Perpendicular offset
    const perpX = -dy / distance;
    const perpY = dx / distance;

    // Variabler Offset für organisches Aussehen
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
  // ANIMATION LOOP - FULL PERFORMANCE
  // =========================================

  start() {
    let lastFrameTime = performance.now();

    const animate = (currentTime) => {
      // Frame-Timing (aber keine künstliche Drosselung!)
      const deltaTime = currentTime - lastFrameTime;

      // Optional: Bei sehr langsamen Geräten begrenzen
      if (deltaTime >= this.frameInterval - 1) {
        lastFrameTime = currentTime - (deltaTime % this.frameInterval);
        this.draw(currentTime);
      }

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  draw(timestamp) {
    const ctx = this.ctx;

    // Clear
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.connections.length === 0) return;

    // Zeichne alle Verbindungen
    this.connections.forEach(conn => {
      this.drawConnection(ctx, conn, timestamp);
    });
  }

  drawConnection(ctx, conn, timestamp) {
    if (!conn.path || conn.path.length < 2) return;

    // Pulse-Effekt (subtil)
    const pulse = Math.sin(timestamp * this.config.pulseSpeed + conn.animationOffset) * 0.5 + 0.5;
    const pulseMultiplier = 1 + pulse * this.config.pulseAmplitude;

    const opacity = this.config.baseOpacity * pulseMultiplier;
    const glowOpacity = this.config.glowOpacity * pulseMultiplier;

    // Glow Layer (optional, wenn Performance OK)
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
    console.log('🔴 UltimateNetworkFlow destroyed');
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
      targetFPS: this.targetFPS,
      config: this.config
    };
  }
}

// =========================================
// AUTO-INITIALIZE
// =========================================

window.addEventListener('quantum:ready', () => {
  console.log('🕸️ NetworkFlow: Received quantum:ready event');

  if (window.colorFlow) {
    console.log('⚠️ ColorFlow already exists');
    return;
  }

  setTimeout(() => {
    try {
      window.colorFlow = new UltimateNetworkFlow();
      console.log('✅ NetworkFlow ready:', window.colorFlow.getStats());
    } catch (error) {
      console.error('❌ NetworkFlow initialization failed:', error);
    }
  }, 200);
});

// Debug & Performance Monitor
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.debugColorFlow = () => {
    if (!window.colorFlow) return;
    const stats = window.colorFlow.getStats();
    console.table(stats);
    console.log('Connections:', window.colorFlow.connections.map(c => 
      `${c.from.name} → ${c.to.name} (${Math.round(c.score)})`
    ));
  };

  // FPS Monitor
  let frames = 0;
  let lastFPSUpdate = performance.now();

  setInterval(() => {
    const now = performance.now();
    const fps = Math.round(frames * 1000 / (now - lastFPSUpdate));
    console.log(`📊 FPS: ${fps}`);
    frames = 0;
    lastFPSUpdate = now;
  }, 2000);

  window.addEventListener('quantum:ready', () => {
    setInterval(() => { frames++; }, 16);
  });

  console.log('🛠️ Debug: window.debugColorFlow() verfügbar');
}
