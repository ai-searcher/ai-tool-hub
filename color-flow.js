// =========================================
// ORGANIC COLOR FLOW V13.0 - BEAUTIFUL CHAOS
// - Natürliche, organische Kurven
// - Perlin-Noise-basierte Wellen
// - Mehrere Kontrolpunkte für smooth curves
// - Mobile-optimiert: Viele bunte Linien
// - Keine starren Grid-Muster
// =========================================

(function() {
  'use strict';

  // Simple Perlin Noise für organische Bewegung
  class SimplexNoise {
    constructor(seed = Math.random()) {
      this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
                     [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
                     [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
      this.p = [];
      for (let i = 0; i < 256; i++) {
        this.p[i] = Math.floor(seed * 256);
        seed = (seed * 16807) % 2147483647;
      }
      this.perm = [];
      for (let i = 0; i < 512; i++) {
        this.perm[i] = this.p[i & 255];
      }
    }

    dot(g, x, y) {
      return g[0] * x + g[1] * y;
    }

    noise2D(xin, yin) {
      const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
      const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
      
      let n0, n1, n2;
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = xin - X0;
      const y0 = yin - Y0;
      
      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; }
      else { i1 = 0; j1 = 1; }
      
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1.0 + 2.0 * G2;
      const y2 = y0 - 1.0 + 2.0 * G2;
      
      const ii = i & 255;
      const jj = j & 255;
      const gi0 = this.perm[ii + this.perm[jj]] % 12;
      const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
      const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
      
      let t0 = 0.5 - x0*x0 - y0*y0;
      if (t0 < 0) n0 = 0.0;
      else {
        t0 *= t0;
        n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
      }
      
      let t1 = 0.5 - x1*x1 - y1*y1;
      if (t1 < 0) n1 = 0.0;
      else {
        t1 *= t1;
        n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
      }
      
      let t2 = 0.5 - x2*x2 - y2*y2;
      if (t2 < 0) n2 = 0.0;
      else {
        t2 *= t2;
        n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
      }
      
      return 70.0 * (n0 + n1 + n2);
    }
  }

  class OrganicColorFlow {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.gridElement = null;
      this.containerElement = null;
      this.cards = [];
      this.connections = [];
      this.animationFrame = null;
      this.resizeObserver = null;
      this.hoveredCard = null;
      this.canvasWidth = 0;
      this.canvasHeight = 0;
      this.time = 0;

      // Perlin Noise für organische Bewegung
      this.noise = new SimplexNoise(Date.now());
      this.noiseScale = 0.002; // Smooth, langsame Wellen

      // Performance
      this.targetFPS = 60;
      this.frameInterval = 1000 / this.targetFPS;
      this.then = 0;

      // Device Detection
      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

      this.setupSettings();
      this.activeConnections = new Map();

      this.init();
    }

    setupSettings() {
      if (this.isMobile) {
        // 📱 MOBILE: VIELE BUNTE ORGANISCHE LINIEN!
        this.settings = {
          baseLineWidth: 1.5,
          glowWidth: 15,
          glowSpeed: 0.003,
          glowLength: 0.5,
          baseOpacity: 0.65,
          glowOpacity: 0.85,
          hoverSpeed: 0.22,
          maxConnections: 20,        // Viele Linien!
          curveIntensity: 0.35,      // Stärkere Kurven
          waveAmplitude: 40,         // Größere Wellen
          waveFrequency: 0.015,      // Mehr Wellen
          organicOffset: 25,         // Zufällige Abweichung
          multiPoint: true,          // Mehrere Control Points
          smoothing: 0.8,            // Extra smooth
          connectionDensity: 0.7,    // Mehr Verbindungen
          maxDistance: 450
        };
      } else if (this.isTablet) {
        this.settings = {
          baseLineWidth: 2.0,
          glowWidth: 16,
          glowSpeed: 0.0025,
          glowLength: 0.4,
          baseOpacity: 0.55,
          glowOpacity: 0.75,
          hoverSpeed: 0.20,
          maxConnections: 25,
          curveIntensity: 0.30,
          waveAmplitude: 35,
          waveFrequency: 0.012,
          organicOffset: 20,
          multiPoint: true,
          smoothing: 0.75,
          connectionDensity: 0.6,
          maxDistance: 500
        };
      } else {
        this.settings = {
          baseLineWidth: 2.5,
          glowWidth: 18,
          glowSpeed: 0.002,
          glowLength: 0.35,
          baseOpacity: 0.50,
          glowOpacity: 0.65,
          hoverSpeed: 0.18,
          maxConnections: 30,
          curveIntensity: 0.25,
          waveAmplitude: 30,
          waveFrequency: 0.010,
          organicOffset: 18,
          multiPoint: true,
          smoothing: 0.7,
          connectionDensity: 0.5,
          maxDistance: 600
        };
      }

      // 🎨 VIBRANT COLORS
      this.categoryColors = {
        text: { r: 0, g: 255, b: 255 },      // Cyan
        image: { r: 255, g: 80, b: 170 },    // Pink
        code: { r: 150, g: 100, b: 255 },    // Purple
        video: { r: 255, g: 75, b: 75 },     // Red
        audio: { r: 40, g: 220, b: 110 },    // Green
         data: { r: 255, g: 200, b: 50 },     // Yellow
        other: { r: 160, g: 175, b: 200 }    // Gray
      };
    }

    init() {
      console.log('🎨 Organic Color Flow v13.0');

      // Multiple setup triggers
      window.addEventListener('quantumready', () => {
        setTimeout(() => this.setup(), 100);
      });

      if (document.readyState === 'complete') {
        setTimeout(() => this.setup(), 150);
      }

      // Fallback
      setTimeout(() => {
        if (!this.canvas) this.setup();
      }, 500);

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
        console.error('❌ Container not found');
        return;
      }

      this.setupCanvas();
      this.scanCards();

      if (this.cards.length === 0) {
        console.warn('⚠️ No cards found');
        return;
      }

      this.generateOrganicConnections();
      this.setupInputDetection();
      this.startAnimation();
      this.setupResizeObserver();

      console.log(`✅ Organic Flow: ${this.connections.length} connections`);
      console.log(`📱 Mobile: ${this.isMobile ? 'YES' : 'NO'}`);
    }

    setupCanvas() {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'connection-canvas';
        this.canvas.style.cssText = `
          position: absolute;
          pointer-events: none;
          z-index: 1;
          will-change: transform;
          touch-action: none;
        `;
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

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = this.canvasWidth * dpr;
      this.canvas.height = this.canvasHeight * dpr;

      this.ctx = this.canvas.getContext('2d', { 
        alpha: true,
        desynchronized: true
      });

      this.ctx.scale(dpr, dpr);
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }

    scanCards() {
      const cardElements = this.gridElement.querySelectorAll('.card-square');
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
          index: index
        });
      });
    }

    generateOrganicConnections() {
      this.connections = [];
      
      // Gruppiere nach Kategorien
      const categoryGroups = {};
      this.cards.forEach(card => {
        if (!categoryGroups[card.category]) {
          categoryGroups[card.category] = [];
        }
        categoryGroups[card.category].push(card);
      });

      // Innerhalb jeder Kategorie: Organische Verbindungen
      Object.values(categoryGroups).forEach(group => {
        if (group.length < 2) return;

        // Sortiere für natürlichen Fluss
        group.sort((a, b) => {
          if (Math.abs(a.y - b.y) < 80) return a.x - b.x;
          return a.y - b.y;
        });

        // Verbinde benachbarte Cards
        for (let i = 0; i < group.length - 1; i++) {
          this.addConnection(group[i], group[i + 1], 1.0);
        }

        // Sprungverbindungen für Interesse
        if (group.length > 3) {
          for (let i = 0; i < group.length - 2; i += 2) {
            if (Math.random() < this.settings.connectionDensity) {
              this.addConnection(group[i], group[i + 2], 0.7);
            }
          }
        }

        // Lange Bögen
        if (group.length > 4) {
          const dist = this.getDistance(group[0], group[group.length - 1]);
          if (dist < this.settings.maxDistance) {
            this.addConnection(group[0], group[group.length - 1], 0.5);
          }
        }
      });

      // Kategorie-übergreifende Brücken
      const categories = Object.keys(categoryGroups);
      for (let i = 0; i < categories.length - 1; i++) {
        const groupA = categoryGroups[categories[i]];
        const groupB = categoryGroups[categories[i + 1]];

        let closest = null;
        let minDist = Infinity;

        groupA.forEach(cardA => {
          groupB.forEach(cardB => {
            const dist = this.getDistance(cardA, cardB);
            if (dist < minDist && dist < this.settings.maxDistance) {
              minDist = dist;
              closest = [cardA, cardB];
            }
          });
        });

        if (closest) {
          this.addConnection(closest[0], closest[1], 0.6);
        }
      }

      // Zufällige organische Verbindungen
      const extraConnections = Math.floor(this.cards.length * 0.3);
      for (let i = 0; i < extraConnections; i++) {
        const cardA = this.cards[Math.floor(Math.random() * this.cards.length)];
        const cardB = this.cards[Math.floor(Math.random() * this.cards.length)];
        
        if (cardA !== cardB && 
            !this.connectionExists(cardA, cardB) &&
            this.getDistance(cardA, cardB) < this.settings.maxDistance) {
          this.addConnection(cardA, cardB, 0.4);
        }
      }

      // Limit connections
      if (this.connections.length > this.settings.maxConnections) {
        this.connections = this.connections.slice(0, this.settings.maxConnections);
      }
    }

    addConnection(from, to, weight = 1.0) {
      // Generate organic path mit Perlin Noise
      const path = this.generateOrganicPath(from, to);

      const conn = {
        from: from,
        to: to,
        category: from.category,
        weight: weight,
        path: path,
        glowOffset: Math.random() * Math.PI * 2,
        activeState: 1
      };

      this.connections.push(conn);
      this.activeConnections.set(conn, 1);
    }

    generateOrganicPath(from, to) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Anzahl der Segmente basierend auf Distanz
      const segments = Math.max(5, Math.floor(dist / 50));
      const path = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        
        // Basis-Position (linear interpolation)
        const baseX = from.x + dx * t;
        const baseY = from.y + dy * t;

        // Perlin Noise für organische Abweichung
        const noiseX = this.noise.noise2D(baseX * this.noiseScale, baseY * this.noiseScale);
        const noiseY = this.noise.noise2D(baseY * this.noiseScale, baseX * this.noiseScale);

        // Senkrechte zur Linie für natürliche Kurven
        const perpX = -dy / dist;
        const perpY = dx / dist;

        // Kombiniere Noise mit Sinus-Welle für smooth flow
        const wave = Math.sin(t * Math.PI * this.settings.waveFrequency * segments);
        const waveOffset = wave * this.settings.waveAmplitude;

        // Finale Position mit organischer Abweichung
        const offsetX = (perpX * waveOffset) + (noiseX * this.settings.organicOffset);
        const offsetY = (perpY * waveOffset) + (noiseY * this.settings.organicOffset);

        path.push({
          x: baseX + offsetX,
          y: baseY + offsetY,
          t: t
        });
      }

      return path;
    }

    getDistance(card1, card2) {
      const dx = card2.x - card1.x;
      const dy = card2.y - card1.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    connectionExists(card1, card2) {
      return this.connections.some(c => 
        (c.from === card1 && c.to === card2) ||
        (c.from === card2 && c.to === card1)
      );
    }

    setupInputDetection() {
      const isTouchDevice = 'ontouchstart' in window;

      this.cards.forEach((card) => {
        if (isTouchDevice) {
          card.element.addEventListener('touchstart', () => {
            this.hoveredCard = card;
          }, { passive: true });

          card.element.addEventListener('touchend', () => {
            setTimeout(() => {
              if (this.hoveredCard === card) {
                this.hoveredCard = null;
              }
            }, 300);
          }, { passive: true });
        } else {
          card.element.addEventListener('mouseenter', () => {
            this.hoveredCard = card;
          });

          card.element.addEventListener('mouseleave', () => {
            if (this.hoveredCard === card) {
              this.hoveredCard = null;
            }
          });
        }
      });
    }

    isConnectionActive(connection) {
      if (!this.hoveredCard) return true;
      return connection.from === this.hoveredCard || connection.to === this.hoveredCard;
    }

    lerp(start, end, t) {
      return start + (end - start) * t;
    }

    updateActiveStates() {
      this.connections.forEach(conn => {
        const isActive = this.isConnectionActive(conn);
        const targetState = isActive ? 1 : 0.3;
        const currentState = this.activeConnections.get(conn) || 1;

        const newState = this.lerp(currentState, targetState, this.settings.hoverSpeed);
        this.activeConnections.set(conn, newState);
      });
    }

    drawOrganicConnection(connection, activeState, time) {
      const path = connection.path;
      if (!path || path.length < 2) return;

      const color = this.categoryColors[connection.category] || this.categoryColors.other;
      const opacity = this.settings.baseOpacity * activeState * connection.weight;

      // Base line
      this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
      this.ctx.lineWidth = this.settings.baseLineWidth * connection.weight;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.setLineDash([]);

      this.ctx.beginPath();
      this.ctx.moveTo(path[0].x, path[0].y);

      // Smooth Bezier curve durch alle Punkte
      for (let i = 1; i < path.length - 1; i++) {
        const xc = (path[i].x + path[i + 1].x) / 2;
        const yc = (path[i].y + path[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(path[i].x, path[i].y, xc, yc);
      }

      // Letztes Segment
      const lastIdx = path.length - 1;
      this.ctx.quadraticCurveTo(
        path[lastIdx - 1].x, 
        path[lastIdx - 1].y, 
        path[lastIdx].x, 
        path[lastIdx].y
      );

      this.ctx.stroke();

      // Flowing glow
      const flowSpeed = this.settings.glowSpeed;
      const glowProgress = ((time * flowSpeed + connection.glowOffset) % (Math.PI * 2)) / (Math.PI * 2);
      
      const glowOpacity = this.settings.glowOpacity * activeState * connection.weight;

      this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${glowOpacity})`;
      this.ctx.lineWidth = this.settings.baseLineWidth * 3 * connection.weight;
      this.ctx.shadowBlur = this.settings.glowWidth * activeState;
      this.ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${glowOpacity})`;

      // Zeichne nur den glowing part
      const glowStart = Math.max(0, glowProgress - this.settings.glowLength / 2);
      const glowEnd = Math.min(1, glowProgress + this.settings.glowLength / 2);

      if (glowEnd > glowStart) {
        const startIdx = Math.floor(glowStart * (path.length - 1));
        const endIdx = Math.ceil(glowEnd * (path.length - 1));

        this.ctx.beginPath();
        this.ctx.moveTo(path[startIdx].x, path[startIdx].y);

        for (let i = startIdx + 1; i < endIdx && i < path.length - 1; i++) {
          const xc = (path[i].x + path[i + 1].x) / 2;
          const yc = (path[i].y + path[i + 1].y) / 2;
          this.ctx.quadraticCurveTo(path[i].x, path[i].y, xc, yc);
        }

        if (endIdx < path.length) {
          this.ctx.lineTo(path[endIdx].x, path[endIdx].y);
        }

        this.ctx.stroke();
      }

      this.ctx.shadowBlur = 0;
    }

    animate(now) {
      if (!this.ctx || !this.canvas) return;

      this.animationFrame = requestAnimationFrame((t) => this.animate(t));

      const elapsed = now - this.then;
      if (elapsed < this.frameInterval) return;

      this.then = now - (elapsed % this.frameInterval);

      this.time = now;
      this.updateActiveStates();

      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

      this.connections.forEach(conn => {
        const activeState = this.activeConnections.get(conn) || 1;
        this.drawOrganicConnection(conn, activeState, now);
      });
    }

    startAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.then = performance.now();
      this.animate(this.then);
    }

    handleResize() {
      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      this.setupSettings();
      this.setupCanvas();
      this.scanCards();
      this.generateOrganicConnections();
      this.setupInputDetection();
    }

    setupResizeObserver() {
      if (!this.gridElement) return;

      this.resizeObserver = new ResizeObserver(() => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.setupCanvas();
          this.scanCards();
          this.generateOrganicConnections();
        }, 250);
      });

      this.resizeObserver.observe(this.gridElement);
    }

    destroy() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.colorFlowNetwork = new OrganicColorFlow();
    });
  } else {
    window.colorFlowNetwork = new OrganicColorFlow();
  }

  // Debug
  window.debugColorFlow = function() {
    const net = window.colorFlowNetwork;
    if (!net) {
      console.log('❌ Not initialized');
      return;
    }
    console.group('🎨 Organic Color Flow v13.0');
    console.log('Device:', net.isMobile ? 'Mobile 📱' : 'Desktop 🖥️');
    console.log('Cards:', net.cards.length);
    console.log('Connections:', net.connections.length);
    console.log('Organic paths: YES ✨');
    console.log('Perlin Noise: YES 🌊');
    console.groupEnd();
  };

})();
