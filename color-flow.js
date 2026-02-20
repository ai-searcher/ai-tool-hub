// =========================================
// COLOR-FLOW.JS – GPU-beschleunigte organische Kurven (Ultra-Version)
// Nutzt GPU.WebGLRendererUltra für maximale Performance
// - Originale Optik: Bézier-Kurven, fließende Krümmung, variabler Puls, Glow, Sterne, Ripples
// - Fallback auf 2D, wenn WebGL nicht verfügbar
// =========================================

(function() {
  'use strict';

  class GridSynchronizedNetworkUltimate {
    constructor() {
      this.canvas = null;
      this.ctx = null;                // 2D Fallback
      this.glRenderer = null;          // GPU-Renderer (Ultra)
      this.useWebGL = false;
      this.gridElement = null;
      this.containerElement = null;
      this.cards = [];
      this.connections = [];
      this.animationFrame = null;
      this.resizeObserver = null;
      this.hoveredCard = null;
      this.canvasWidth = 0;
      this.canvasHeight = 0;
      this.glowTime = 0;

      this.stars = [];
      this.starFieldActive = true;
      this.glitchFrame = 0;
      this.glitchIntensity = 0;
      this.ripples = [];

      this.targetFPS = 60;
      this.frameInterval = 1000 / this.targetFPS;
      this.then = 0;

      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

      this.gradientCache = new Map(); // nur für 2D

      this.connectionTypes = {
        primary: {
          style: 'solid',
          lineWidth: 2.5,
          dashPattern: [],
          glowIntensity: 1.0,
          flowSpeed: 1.0,
          priority: 4
        },
        secondary: {
          style: 'dashed',
          lineWidth: 1.8,
          dashPattern: [8, 4],
          glowIntensity: 0.8,
          flowSpeed: 0.7,
          priority: 2
        },
        bridge: {
          style: 'dotted',
          lineWidth: 1.5,
          dashPattern: [2, 6],
          glowIntensity: 0.6,
          flowSpeed: 0.5,
          priority: 1
        },
        cluster: {
          style: 'curved',
          lineWidth: 2.0,
          dashPattern: [],
          glowIntensity: 0.9,
          flowSpeed: 0.8,
          curve: true,
          priority: 3
        }
      };

      this.setupAdaptiveSettings();
      this.activeConnections = new Map();
      this.setupRippleListener();

      this.useScheduler = window.Performance && window.Performance.AnimationScheduler;
      if (this.useScheduler) {
        const schedulerFPS = Math.min(this.targetFPS, 30);
        this.animScheduler = new window.Performance.AnimationScheduler(schedulerFPS);
        console.log('🎬 Using AnimationScheduler with', schedulerFPS, 'fps');
      } else {
        this.animScheduler = null;
      }

      this.init();
    }

    setupAdaptiveSettings() {
      if (this.isMobile) {
        this.settings = {
          qualityMultiplier: 1.0,
          baseLineWidth: 2.0,
          glowWidth: 12,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: true,
          maxPrimaryConnections: 2,
          maxSecondaryConnections: 1,
          maxBridgeConnections: 2,
          hoverSpeed: 0.30,
          baseOpacity: 0.45,
          glowOpacity: 0.55,
          useSimplifiedRendering: false,
          minClusterSize: 2,
          maxDistance: 400,
          enableWaves: false,
          enableGlitch: false,
          enableStars: true,
          enableRipples: true,
          enableCategoryStyles: true,
          enableVariableWidth: false,
          starCount: 50,
          curveOffsetFactor: 0.2,
          curveRandomness: 0.3,
          tessellationSegments: 15
        };
      } else if (this.isTablet) {
        this.settings = {
          qualityMultiplier: 1.2,
          baseLineWidth: 2.5,
          glowWidth: 14,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: true,
          maxPrimaryConnections: 3,
          maxSecondaryConnections: 2,
          maxBridgeConnections: 3,
          hoverSpeed: 0.25,
          baseOpacity: 0.40,
          glowOpacity: 0.50,
          useSimplifiedRendering: false,
          minClusterSize: 2,
          maxDistance: 450,
          enableWaves: false,
          enableGlitch: true,
          enableStars: true,
          enableRipples: true,
          enableCategoryStyles: true,
          enableVariableWidth: true,
          starCount: 100,
          glitchProbability: 0.01,
          curveOffsetFactor: 0.25,
          curveRandomness: 0.4,
          tessellationSegments: 20
        };
      } else {
        this.settings = {
          qualityMultiplier: 1.5,
          baseLineWidth: 3.0,
          glowWidth: 18,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: true,
          maxPrimaryConnections: 4,
          maxSecondaryConnections: 3,
          maxBridgeConnections: 4,
          hoverSpeed: 0.25,
          baseOpacity: 0.45,
          glowOpacity: 0.50,
          useSimplifiedRendering: false,
          minClusterSize: 2,
          maxDistance: 500,
          enableWaves: false,
          enableGlitch: true,
          enableStars: true,
          enableRipples: true,
          enableCategoryStyles: true,
          enableVariableWidth: true,
          starCount: 200,
          glitchProbability: 0.02,
          curveOffsetFactor: 0.3,
          curveRandomness: 0.5,
          tessellationSegments: 25
        };
      }

      this.categoryColors = {
        text: { r: 0, g: 243, b: 255 },
        image: { r: 236, g: 72, b: 153 },
        code: { r: 139, g: 92, b: 246 },
        video: { r: 239, g: 68, b: 68 },
        audio: { r: 34, g: 197, b: 94 },
        data: { r: 251, g: 191, b: 36 },
        other: { r: 148, g: 163, b: 184 }
      };
    }

    setupRippleListener() {
      document.addEventListener('click', (e) => {
        const card = e.target.closest('.card-square');
        if (!card) return;
        const gridRect = this.gridElement?.getBoundingClientRect();
        if (!gridRect) return;
        const cardRect = card.getBoundingClientRect();
        const x = cardRect.left + cardRect.width/2 - gridRect.left;
        const y = cardRect.top + cardRect.height/2 - gridRect.top;
        if (this.settings.enableRipples) {
          this.ripples.push({
            x, y,
            radius: 10,
            maxRadius: Math.max(this.canvasWidth, this.canvasHeight) * 0.8,
            alpha: 0.8,
            growth: 2,
            active: true
          });
        }
      });
    }

    init() {
      console.log('🚀 GridSynchronizedNetwork v15.0 – GPU Ultra');

      window.addEventListener('quantum:ready', () => {
        setTimeout(() => this.setup(), 50);
      });

      if (document.readyState === 'complete') {
        setTimeout(() => this.setup(), 100);
      }

      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.handleResize(), 300);
      });
    }

    setup() {
      this.gridElement = document.getElementById('tool-grid');
      if (!this.gridElement) {
        setTimeout(() => this.setup(), 500);
        return;
      }

      this.containerElement = this.gridElement.parentElement;
      if (!this.containerElement) {
        console.error('❌ Container not found!');
        return;
      }

      this.setupCanvas();
      this.scanTools();
      this.generateStars();

      if (this.cards.length === 0) {
        setTimeout(() => this.refresh(), 500);
        return;
      }

      this.generateIntelligentConnections();
      if (this.connections.length === 0) {
        this.generateFallbackConnections();
      }

      this.setupInputDetection();
      this.startAnimation();
      this.setupResizeObserver();

      console.log(`✅ Initialized: ${this.connections.length} connections`);
    }

    setupCanvas() {
      if (!this.gridElement) return;
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'connection-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
        this.canvas.style.willChange = 'transform';
        this.containerElement.insertBefore(this.canvas, this.gridElement);
      }

      const gridRect = this.gridElement.getBoundingClientRect();
      const parentRect = this.containerElement.getBoundingClientRect();

      this.canvasWidth = gridRect.width;
      this.canvasHeight = gridRect.height;

      this.canvas.style.left = (gridRect.left - parentRect.left) + 'px';
      this.canvas.style.top = (gridRect.top - parentRect.top) + 'px';
      this.canvas.style.width = this.canvasWidth + 'px';
      this.canvas.style.height = this.canvasHeight + 'px';

      // GPU-Renderer initialisieren
      if (window.GPU && window.GPU.WebGLRendererUltra) {
        try {
          this.glRenderer = new window.GPU.WebGLRendererUltra(this.canvas, {
            pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
          });
          this.useWebGL = true;
          console.log('🎨 GPU Ultra aktiv');
          this.glRenderer.resize(this.canvasWidth, this.canvasHeight);
        } catch (e) {
          console.warn('WebGL Ultra nicht verfügbar, Fallback auf 2D', e);
          this.useWebGL = false;
        }
      } else {
        this.useWebGL = false;
      }

      // 2D-Fallback
      if (!this.useWebGL) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const hdRatio = dpr * this.settings.qualityMultiplier;
        this.canvas.width = this.canvasWidth * hdRatio;
        this.canvas.height = this.canvasHeight * hdRatio;
        this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });
        if (this.ctx) {
          this.ctx.scale(hdRatio, hdRatio);
          this.ctx.imageSmoothingEnabled = true;
          this.ctx.imageSmoothingQuality = 'high';
        }
        console.log('🎨 2D Fallback');
      }
    }

    generateStars() {
      this.stars = [];
      for (let i = 0; i < this.settings.starCount; i++) {
        this.stars.push({
          x: Math.random() * this.canvasWidth,
          y: Math.random() * this.canvasHeight,
          radius: Math.random() * 1.5 + 0.5,
          brightness: Math.random() * 0.5 + 0.3,
          speed: Math.random() * 0.05 + 0.02,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    scanTools() {
      if (!this.gridElement) return;
      const cardElements = this.gridElement.querySelectorAll('.card-square, .stack-card');
      this.cards = [];

      cardElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const gridRect = this.gridElement.getBoundingClientRect();
        const category = el.getAttribute('data-category') || 'other';

        this.cards.push({
          element: el,
          category: category,
          x: rect.left - gridRect.left + rect.width / 2,
          y: rect.top - gridRect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
          index: index,
          cluster: null,
          degree: 0
        });
      });
    }

    setupInputDetection() {
      const isTouchDevice = 'ontouchstart' in window;
      this.cards.forEach((card) => {
        if (isTouchDevice) {
          card.element.addEventListener('touchstart', () => { this.hoveredCard = card; }, { passive: true });
          card.element.addEventListener('touchend', () => {
            setTimeout(() => { if (this.hoveredCard === card) this.hoveredCard = null; }, 400);
          }, { passive: true });
        } else {
          card.element.addEventListener('mouseenter', () => { this.hoveredCard = card; });
          card.element.addEventListener('mouseleave', () => { if (this.hoveredCard === card) this.hoveredCard = null; });
        }
      });
    }

    refresh() {
      if (!this.gridElement) return;
      this.scanTools();
      this.generateIntelligentConnections();
      if (this.connections.length === 0) this.generateFallbackConnections();
      this.setupCanvas();
      this.generateStars();
    }

    // --- Verbindungslogik (unverändert) ---
    generateIntelligentConnections() { /* ... (wie in v13.6) */ }
    generateFallbackConnections() { /* ... */ }
    detectClusters() { /* ... */ }
    getClusterCenter(cards) { /* ... */ }
    generatePrimaryConnections(clusters) { /* ... */ }
    generateSecondaryConnections(clusters) { /* ... */ }
    generateBridgeConnections(clusters) { /* ... */ }
    generateClusterConnections(clusters) { /* ... */ }
    optimizeConnections() { /* ... */ }
    getDistance(card1, card2) { /* ... */ }
    connectionExists(card1, card2) { /* ... */ }
    addConnection(from, to, type, weight) { /* ... */ }
    isConnectionActive(connection) { /* ... */ }
    lerp(start, end, t) { return start + (end - start) * t; }
    updateActiveStates() { /* ... */ }
    lerpColor(color1, color2, t) { return { r: Math.round(color1.r + (color2.r - color1.r) * t), g: ..., b: ... }; }

    // ========= GPU-Hilfsfunktion: Tesselliert eine Verbindung in Punkte + Farben =========
    _tessellateConnection(conn, activeState, time, forGlow = false) {
      const config = conn.config;
      let fromColor = this.categoryColors[conn.from.category] || this.categoryColors.other;
      let toColor = this.categoryColors[conn.to.category] || this.categoryColors.other;

      let weight = conn.weight || 1;
      if (this.settings.enableVariableWidth) {
        const degree = (conn.from.degree + conn.to.degree) / 2;
        weight *= (0.8 + degree * 0.1);
      }

      // Linienbreite berechnen (wie in 2D)
      const baseWidth = (this.settings.baseLineWidth * config.lineWidth / 2.5) * weight;
      const lineWidth = forGlow ? baseWidth * 3 : baseWidth;

      let baseOpacity;
      if (forGlow) {
        baseOpacity = this.settings.glowOpacity * activeState * weight * config.glowIntensity;
      } else {
        baseOpacity = this.settings.baseOpacity * activeState * weight;
      }

      if (this.settings.enableGlitch && Math.random() < this.settings.glitchProbability) {
        [fromColor, toColor] = [toColor, fromColor];
      }

      const from = conn.from;
      const to = conn.to;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return null;

      // Kontrollpunkt (gleiche Formel wie in drawCurvedLine)
      const baseOffset = dist * this.settings.curveOffsetFactor;
      const seed = conn.glowOffset;
      const rand1 = Math.sin(seed) * 0.5 + 0.5;
      const rand2 = Math.cos(seed) * 0.5 + 0.5;
      const offsetFactor = 0.8 + rand1 * this.settings.curveRandomness * 2;
      const angleVar = (rand2 - 0.5) * Math.PI * 0.5;
      const offset = baseOffset * offsetFactor;
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const cos = Math.cos(angleVar);
      const sin = Math.sin(angleVar);
      const rotatedX = perpX * cos - perpY * sin;
      const rotatedY = perpX * sin + perpY * cos;
      const cpX = midX + rotatedX * offset;
      const cpY = midY + rotatedY * offset;

      // Tessellation: Punkte entlang der Kurve
      const segments = this.settings.tessellationSegments;
      const points = [];
      const colors = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = (1-t)*(1-t)*from.x + 2*(1-t)*t*cpX + t*t*to.x;
        const y = (1-t)*(1-t)*from.y + 2*(1-t)*t*cpY + t*t*to.y;
        points.push(x, y);

        const r = Math.round(fromColor.r + (toColor.r - fromColor.r) * t);
        const g = Math.round(fromColor.g + (toColor.g - fromColor.g) * t);
        const b = Math.round(fromColor.b + (toColor.b - fromColor.b) * t);
        colors.push(r/255, g/255, b/255, baseOpacity);
      }

      return { points, colors, thickness: lineWidth };
    }

    // ========= 2D-Zeichenmethoden =========
    getGradient(from, to, fromColor, toColor, baseOpacity) { /* ... (wie in v13.6) */ }
    drawCurvedLine2D(from, to, strokeStyle, lineWidth, connection) { /* ... */ }
    drawConnection2D(from, to, connection, activeState, time) { /* ... */ }
    drawStars2D() { /* ... */ }
    drawRipples2D() { /* ... */ }

    // ========= Hauptanimationsschleife =========
    animate(now) {
      if (!this.ctx && !this.glRenderer) return;

      this.glowTime = now;
      this.updateActiveStates();

      if (this.useWebGL && this.glRenderer) {
        // WebGL-Rendering
        this.glRenderer.clear();

        // Sterne
        if (this.settings.enableStars) {
          const starPoints = this.stars.map(star => {
            const brightness = star.brightness + Math.sin(this.glowTime * star.speed + star.phase) * 0.1;
            return {
              x: star.x, y: star.y,
              r: 255, g: 255, b: 255,
              a: Math.max(0.2, brightness),
              size: star.radius * 2
            };
          });
          this.glRenderer.drawPoints(starPoints);
        }

        // Kurven sammeln (normale + Glow)
        const curves = [];
        this.connections.forEach(conn => {
          const activeState = this.activeConnections.get(conn) || 1;
          // Normale Kurve
          const normal = this._tessellateConnection(conn, activeState, now, false);
          if (normal) curves.push(normal);

          // Glow-Kurve (falls nicht simplified)
          if (!this.settings.useSimplifiedRendering || activeState > 0.5) {
            const glow = this._tessellateConnection(conn, activeState, now, true);
            if (glow) curves.push(glow);
          }
        });

        this.glRenderer.drawCurves(curves);

        // Ripples
        if (this.settings.enableRipples) {
          const ripplePoints = [];
          for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.growth;
            r.alpha *= 0.98;
            if (r.radius > r.maxRadius || r.alpha < 0.05) {
              this.ripples.splice(i, 1);
              continue;
            }
            ripplePoints.push({
              x: r.x, y: r.y,
              r: 0, g: 243, b: 255,
              a: r.alpha,
              size: r.radius * 2
            });
          }
          this.glRenderer.drawPoints(ripplePoints);
        }

      } else if (this.ctx) {
        // 2D-Fallback
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.drawStars2D();
        this.connections.forEach(conn => {
          const activeState = this.activeConnections.get(conn) || 1;
          this.drawConnection2D(conn.from, conn.to, conn, activeState, now);
        });
        this.drawRipples2D();
      }
    }

    startAnimation() {
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      if (this.useScheduler && this.animScheduler) {
        this.animScheduler.add(() => this.animate(performance.now()));
      } else {
        this.then = performance.now();
        const loop = (t) => { this.animate(t); this.animationFrame = requestAnimationFrame(loop); };
        this.animationFrame = requestAnimationFrame(loop);
      }
    }

    handleResize() {
      if (!this.gridElement) return;
      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      this.setupAdaptiveSettings();
      this.gradientCache.clear();
      this.setupCanvas();
      this.scanTools();
      this.generateStars();
      this.generateIntelligentConnections();
      if (this.connections.length === 0) this.generateFallbackConnections();
      this.setupInputDetection();
    }

    setupResizeObserver() {
      if (!this.gridElement) return;
      this.resizeObserver = new ResizeObserver(() => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          if (!this.gridElement) return;
          this.setupCanvas();
          this.scanTools();
          this.generateStars();
          this.generateIntelligentConnections();
          if (this.connections.length === 0) this.generateFallbackConnections();
        }, 250);
      });
      this.resizeObserver.observe(this.gridElement);
    }

    countTypes() {
      const stats = { primary: 0, secondary: 0, bridge: 0, cluster: 0 };
      this.connections.forEach(conn => stats[conn.type]++);
      return Object.entries(stats).filter(([_, c]) => c > 0).map(([t, c]) => `${c} ${t}`);
    }

    destroy() {
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      if (this.animScheduler) this.animScheduler.remove(() => this.animate);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
      if (this.glRenderer) this.glRenderer.destroy();
      this.gradientCache.clear();
    }
  }

  // Export
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.colorFlowNetwork = new GridSynchronizedNetworkUltimate(); });
  } else {
    window.colorFlowNetwork = new GridSynchronizedNetworkUltimate();
  }

  window.debugColorFlow = function() {
    const net = window.colorFlowNetwork;
    if (!net) return console.log('❌ Network not initialized');
    console.group('🚀 Color Flow v15.0 – GPU Ultra');
    console.log('Device:', net.isMobile ? 'Mobile 📱' : net.isTablet ? 'Tablet 📱' : 'Desktop 🖥️');
    console.log('Cards:', net.cards.length);
    console.log('Connections:', net.connections.length);
    console.log('Types:', net.countTypes().join(', '));
    console.log('Stars:', net.stars.length);
    console.log('Ripples:', net.ripples.length);
    console.log('Settings:', net.settings);
    console.log('Using WebGL:', net.useWebGL);
    console.groupEnd();
  };
})();
