// =========================================
// QUANTUM AI HUB — INTELLIGENT COLOR FLOW
// Production Ready Version 2.0
// Smart Routing • Performance Optimized • Zero Text Occlusion
// =========================================

'use strict';

class IntelligentColorFlow {

  constructor() {
    // ✅ Verwende bestehendes Canvas aus HTML (kein Duplikat!)
    this.canvas = document.getElementById('connection-canvas') || 
                  document.querySelector('.connection-canvas') ||
                  this.createFallbackCanvas();

    if (!this.canvas) {
      console.warn('⚠️ Canvas nicht verfügbar, ColorFlow deaktiviert');
      return;
    }

    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });

    // State
    this.tools = [];
    this.activeConnections = [];
    this.animationFrame = null;
    this.lastUpdate = 0;
    this.isInitialized = false;

    // Configuration
    this.config = {
      maxConnectionsPerTool: 3,          // Weniger = übersichtlicher
      maxDistance: 600,                   // Nur nahe Tools verbinden
      lineWidth: 1.5,                     
      glowWidth: 3,
      opacity: 0.15,                      // Dezent, stört nicht
      glowOpacity: 0.08,
      animationSpeed: 0.0008,             // Langsame Animation
      updateInterval: 100,                // 10 FPS für Smooth
      categoryWeights: {                  // Intelligente Verbindungen
        same: 3,                          // Gleiche Kategorie bevorzugen
        related: 2,                       // Verwandte Kategorien
        different: 0.5                    // Andere seltener
      }
    };

    // Kategorie-Farben (passend zu deinem Design)
    this.colors = {
      text: { base: '#00D4FF', glow: 'rgba(0, 212, 255, 0.3)' },
      image: { base: '#E040FB', glow: 'rgba(224, 64, 251, 0.3)' },
      code: { base: '#7C4DFF', glow: 'rgba(124, 77, 255, 0.3)' },
      audio: { base: '#FF6B9D', glow: 'rgba(255, 107, 157, 0.3)' },
      video: { base: '#448AFF', glow: 'rgba(68, 138, 255, 0.3)' },
      data: { base: '#1DE9B6', glow: 'rgba(29, 233, 182, 0.3)' },
      other: { base: '#B0BEC5', glow: 'rgba(176, 190, 197, 0.3)' }
    };

    // Verwandte Kategorien (für intelligente Verbindungen)
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

    console.log('✅ IntelligentColorFlow v2.0 initialized');
    this.isInitialized = true;
  }

  // =========================================
  // CANVAS MANAGEMENT
  // =========================================

  createFallbackCanvas() {
    console.warn('⚠️ Canvas nicht gefunden, erstelle Fallback');
    const canvas = document.createElement('canvas');
    canvas.id = 'connection-canvas';
    canvas.className = 'connection-canvas';
    // Am ANFANG einfügen, nicht am Ende!
    document.body.insertBefore(canvas, document.body.firstChild);
    return canvas;
  }

  setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Max 2x für Performance
    const rect = document.documentElement.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Optimierungen
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  // =========================================
  // TOOL OBSERVATION
  // =========================================

  observeTools() {
    let debounceTimer = null;

    const scan = () => {
      const elements = document.querySelectorAll('.card-square');

      if (elements.length === 0) {
        this.tools = [];
        this.activeConnections = [];
        return;
      }

      this.tools = Array.from(elements).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          element: el,
          category: el.dataset.category || 'other',
          name: el.dataset.toolName || el.querySelector('.square-title-large')?.textContent || 'Unknown',
          center: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          },
          rect: rect
        };
      });

      this.calculateIntelligentConnections();
    };

    // Initial scan nach kurzer Verzögerung (DOM ready)
    setTimeout(scan, 100);

    // MutationObserver für dynamische Updates
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scan, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Resize Handler (debounced)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.setupCanvas();
        scan();
      }, 200);
    });

    // Scroll Handler für bessere Performance
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(scan, 100);
    }, { passive: true });
  }

  // =========================================
  // INTELLIGENT CONNECTION ALGORITHM
  // =========================================

  calculateIntelligentConnections() {
    this.activeConnections = [];

    if (this.tools.length < 2) return;

    // Für jedes Tool die besten Verbindungen finden
    this.tools.forEach((tool, index) => {
      const candidates = this.findConnectionCandidates(tool, index);

      // Top N Verbindungen basierend auf Score
      const topConnections = candidates
        .slice(0, this.config.maxConnectionsPerTool);

      topConnections.forEach(conn => {
        // Prüfe ob diese Verbindung schon existiert (bidirektional)
        const exists = this.activeConnections.some(existing => 
          (existing.from === tool && existing.to === conn.tool) ||
          (existing.from === conn.tool && existing.to === tool)
        );

        if (!exists) {
          const path = this.calculateSmartPath(tool, conn.tool);
          const colors = this.colors[tool.category] || this.colors.other;

          this.activeConnections.push({
            from: tool,
            to: conn.tool,
            path: path,
            color: colors.base,
            glowColor: colors.glow,
            score: conn.score,
            animationOffset: Math.random() * Math.PI * 2 // Für Animation
          });
        }
      });
    });

    console.log(`🔗 ${this.activeConnections.length} intelligente Verbindungen erstellt`);
  }

  findConnectionCandidates(tool, toolIndex) {
    const candidates = [];

    this.tools.forEach((otherTool, otherIndex) => {
      if (toolIndex === otherIndex) return;

      const distance = this.getDistance(tool.center, otherTool.center);

      // Zu weit weg = ignorieren
      if (distance > this.config.maxDistance) return;

      // Score berechnen
      let score = 1000 - distance; // Nähe bevorzugen

      // Kategorie-Bonus
      if (tool.category === otherTool.category) {
        score += 200 * this.config.categoryWeights.same;
      } else if (this.isRelatedCategory(tool.category, otherTool.category)) {
        score += 100 * this.config.categoryWeights.related;
      } else {
        score += 50 * this.config.categoryWeights.different;
      }

      // Vermeiden von Überlappungen mit anderen Verbindungen
      const wouldOverlap = this.activeConnections.some(conn => 
        this.pathsWouldIntersect(tool.center, otherTool.center, conn.from.center, conn.to.center)
      );

      if (wouldOverlap) score -= 150;

      candidates.push({ tool: otherTool, score, distance });
    });

    // Nach Score sortieren (höher = besser)
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

  pathsWouldIntersect(a1, a2, b1, b2) {
    // Vereinfachter Intersektions-Check
    const denom = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
    if (Math.abs(denom) < 0.001) return false; // Parallel

    const ua = ((b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)) / denom;
    const ub = ((a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)) / denom;

    return ua > 0.2 && ua < 0.8 && ub > 0.2 && ub < 0.8; // Mitte schneidet
  }

  // =========================================
  // SMART PATH CALCULATION (Vermeidet Karten!)
  // =========================================

  calculateSmartPath(fromTool, toTool) {
    const start = fromTool.center;
    const end = toTool.center;

    // Prüfe direkte Linie
    if (!this.pathIntersectsAnyCard(start, end, fromTool, toTool)) {
      return [start, end]; // Direkte Verbindung
    }

    // Berechne Ausweichpfad (Curved)
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    // Perpendicular offset für Kurve
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    const perpX = -dy / len;
    const perpY = dx / len;

    // Kurven-Offset (30-80px)
    const offset = 50 + Math.random() * 30;

    const controlPoint = {
      x: midX + perpX * offset,
      y: midY + perpY * offset
    };

    // Quadratische Bézierkurve als Pfad-Punkte
    return this.bezierToPoints(start, controlPoint, end, 20);
  }

  pathIntersectsAnyCard(start, end, fromTool, toTool) {
    return this.tools.some(tool => {
      if (tool === fromTool || tool === toTool) return false;
      return this.lineIntersectsRect(start, end, tool.rect);
    });
  }

  lineIntersectsRect(p1, p2, rect) {
    // Erweitere Rect um Padding (Text-Bereich)
    const padding = 20;
    const r = {
      left: rect.left - padding,
      right: rect.right + padding,
      top: rect.top - padding,
      bottom: rect.bottom + padding
    };

    // Liang-Barsky Line Clipping
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    let t0 = 0, t1 = 1;

    const clipTest = (p, q) => {
      if (Math.abs(p) < 0.00001) return q >= 0;
      const t = q / p;
      if (p < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
      return true;
    };

    if (!clipTest(-dx, p1.x - r.left)) return false;
    if (!clipTest(dx, r.right - p1.x)) return false;
    if (!clipTest(-dy, p1.y - r.top)) return false;
    if (!clipTest(dy, r.bottom - p1.y)) return false;

    return t0 < t1;
  }

  bezierToPoints(p0, p1, p2, steps = 20) {
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
  // ANIMATION & RENDERING
  // =========================================

  start() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    const animate = (timestamp) => {
      // Throttle zu 60 FPS
      if (timestamp - this.lastUpdate < 16) {
        this.animationFrame = requestAnimationFrame(animate);
        return;
      }

      this.lastUpdate = timestamp;
      this.draw(timestamp);
      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  draw(timestamp) {
    const ctx = this.ctx;

    // Clear
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.activeConnections.length === 0) return;

    // Zeichne alle Verbindungen
    this.activeConnections.forEach(conn => {
      this.drawAnimatedConnection(ctx, conn, timestamp);
    });
  }

  drawAnimatedConnection(ctx, conn, timestamp) {
    if (!conn.path || conn.path.length < 2) return;

    // Pulsierender Opacity-Effekt
    const pulse = Math.sin(timestamp * this.config.animationSpeed + conn.animationOffset) * 0.5 + 0.5;
    const opacity = this.config.opacity + pulse * 0.05;
    const glowOpacity = this.config.glowOpacity + pulse * 0.03;

    // Glow-Layer (darunter)
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

    // Haupt-Linie (darüber)
    ctx.beginPath();
    ctx.moveTo(conn.path[0].x, conn.path[0].y);
    for (let i = 1; i < conn.path.length; i++) {
      ctx.lineTo(conn.path[i].x, conn.path[i].y);
    }

    // Konvertiere Hex zu RGBA
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
    if (this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    console.log('🔴 IntelligentColorFlow destroyed');
  }

  refresh() {
    this.calculateIntelligentConnections();
  }

  setOpacity(value) {
    this.config.opacity = Math.max(0, Math.min(1, value));
  }

  setMaxConnections(value) {
    this.config.maxConnectionsPerTool = Math.max(1, Math.min(10, value));
    this.calculateIntelligentConnections();
  }
}

// =========================================
// AUTO-INITIALIZE WHEN APP IS READY
// =========================================

window.addEventListener('quantum:ready', () => {
  console.log('🎨 ColorFlow: Received quantum:ready event');

  if (window.colorFlow) {
    console.log('⚠️ ColorFlow already exists, skipping initialization');
    return;
  }

  // Kleine Verzögerung damit DOM vollständig gerendert ist
  setTimeout(() => {
    try {
      window.colorFlow = new IntelligentColorFlow();
      console.log('✅ ColorFlow ready:', window.colorFlow);
    } catch (error) {
      console.error('❌ ColorFlow initialization failed:', error);
    }
  }, 200);
});

// Debug Helper (nur in Development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.debugColorFlow = () => {
    if (!window.colorFlow) {
      console.warn('ColorFlow not initialized');
      return;
    }
    console.log({
      tools: window.colorFlow.tools.length,
      connections: window.colorFlow.activeConnections.length,
      config: window.colorFlow.config
    });
  };
  console.log('🛠️ Debug: window.debugColorFlow() verfügbar');
}
