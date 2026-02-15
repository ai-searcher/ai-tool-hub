// =========================================
// GRID SYNCHRONIZED NETWORK V12.2 ORGANIC
// Enhanced: Beautiful & Vibrant on Mobile!
// + Organische, natürliche Kurven (keine starren Grid-Muster)
// =========================================

(function() {
  'use strict';

  // 🆕 PERLIN NOISE für organische Kurven
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

  class GridSynchronizedNetworkUltimate {
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
      this.glowTime = 0;
      this.pulseTime = 0;

      // 🆕 Perlin Noise für organische Kurven
      this.noise = new SimplexNoise(Date.now());

      // Performance optimization
      this.targetFPS = 60;
      this.frameInterval = 1000 / this.targetFPS;
      this.then = 0;

      // Device Detection
      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

      // Object pooling for performance
      this.gradientCache = new Map();

      // Connection type definitions (4 types for variety!)
      this.connectionTypes = {
        primary: {
          style: 'solid',
          lineWidth: 2.5,
          dashPattern: [],
          glowIntensity: 1.0,
          flowSpeed: 1.0,
          priority: 4,
          pulseEnabled: true
        },
        secondary: {
          style: 'dashed',
          lineWidth: 1.8,
          dashPattern: [8, 4],
          glowIntensity: 0.8,
          flowSpeed: 0.7,
          priority: 2,
          pulseEnabled: true
        },
        bridge: {
          style: 'dotted',
          lineWidth: 1.5,
          dashPattern: [2, 6],
          glowIntensity: 0.6,
          flowSpeed: 0.5,
          priority: 1,
          pulseEnabled: false
        },
        cluster: {
          style: 'curved',
          lineWidth: 2.0,
          dashPattern: [],
          glowIntensity: 0.9,
          flowSpeed: 0.8,
          curve: true,
          priority: 3,
          pulseEnabled: true
        }
      };

      this.setupAdaptiveSettings();
      this.activeConnections = new Map();

      this.init();
    }

    setupAdaptiveSettings() {
      if (this.isMobile) {
        this.settings = {
          qualityMultiplier: 1.0,
          baseLineWidth: 1.2,
          glowWidth: 12,
          glowSpeed: 0.0025,
          glowLength: 0.45,
          enableCurves: true,  // 🆕 Kurven auf Mobile!
          maxPrimaryConnections: 3,
          maxSecondaryConnections: 2,
          maxBridgeConnections: 2,
          hoverSpeed: 0.25,
          baseOpacity: 0.55,
          glowOpacity: 0.75,
          useSimplifiedRendering: false,
          minClusterSize: 2,
          maxDistance: 380,
          pulseSpeed: 0.0008,
          pulseIntensity: 0.15,
          touchFeedback: true,
          vibrantColors: true,
          // 🆕 Organische Kurven Settings
          organicCurves: true,
          curveComplexity: 0.25,      // Wie stark die Kurven sind
          waveAmplitude: 25,           // Wellen-Stärke
          noiseScale: 0.003            // Perlin Noise Frequenz
        };
      } else if (this.isTablet) {
        this.settings = {
          qualityMultiplier: 1.2,
          baseLineWidth: 1.8,
          glowWidth: 14,
          glowSpeed: 0.002,
          glowLength: 0.35,
          enableCurves: true,
          maxPrimaryConnections: 3,
          maxSecondaryConnections: 2,
          maxBridgeConnections: 3,
          hoverSpeed: 0.23,
          baseOpacity: 0.48,
          glowOpacity: 0.58,
          useSimplifiedRendering: false,
          minClusterSize: 2,
          maxDistance: 450,
          pulseSpeed: 0.0006,
          pulseIntensity: 0.12,
          touchFeedback: true,
          vibrantColors: true,
          organicCurves: true,
          curveComplexity: 0.22,
          waveAmplitude: 22,
          noiseScale: 0.0025
        };
      } else {
        this.settings = {
          qualityMultiplier: 1.5,
          baseLineWidth: 2.5,
          glowWidth: 15,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: true,
          maxPrimaryConnections: 4,
          maxSecondaryConnections: 3,
          maxBridgeConnections: 4,
          hoverSpeed: 0.25,
          baseOpacity: 0.45,
          glowOpacity: 0.40,
          useSimplifiedRendering: false,
          minClusterSize: 2,
          maxDistance: 500,
          pulseSpeed: 0.0005,
          pulseIntensity: 0.10,
          touchFeedback: false,
          vibrantColors: false,
          organicCurves: true,
          curveComplexity: 0.20,
          waveAmplitude: 20,
          noiseScale: 0.002
        };
      }

      if (this.settings.vibrantColors) {
        this.categoryColors = {
          text: { r: 0, g: 255, b: 255 },
          image: { r: 255, g: 80, b: 170 },
          code: { r: 150, g: 100, b: 255 },
          video: { r: 255, g: 75, b: 75 },
          audio: { r: 40, g: 220, b: 110 },
           data: { r: 255, g: 200, b: 50 },
          other: { r: 160, g: 175, b: 200 }
        };
      } else {
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
    }

    init() {
      console.log('🚀 GridSynchronizedNetwork v12.2 ORGANIC');

      // 🔧 FIX: Korrekter Event-Name
      window.addEventListener('quantumready', () => {
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

      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.handleResize(), 400);
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

      if (this.cards.length === 0) {
        console.warn('⚠️ No cards found');
        return;
      }

      this.generateIntelligentConnections();

      if (this.connections.length === 0) {
        console.log('📋 Using fallback connection generation');
        this.generateFallbackConnections();
      }

      this.setupInputDetection();
      this.startAnimation();
      this.setupResizeObserver();

      console.log('✅ Ultimate Enhanced Network initialized!');
      console.log(`🕸️ ${this.connections.length} vibrant connections`);
      console.log(`📱 Mobile optimized: ${this.isMobile ? 'YES' : 'NO'}`);
      console.log(`🌊 Organic curves: ${this.settings.organicCurves ? 'YES' : 'NO'}`);
    }

setupCanvas() {
  if (!this.canvas) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'connection-canvas';
    
    // 🔧 FIX: Explizite Styles für garantierte Sichtbarkeit
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      will-change: transform;
      touch-action: none;
      display: block !important;
      opacity: 1 !important;
      visibility: visible !important;
    `;
    
    this.containerElement.insertBefore(this.canvas, this.gridElement);
  }

  // 🔧 FIX: Verwende Container-Größe für vollständige Abdeckung
  const containerRect = this.containerElement.getBoundingClientRect();

  this.canvasWidth = containerRect.width;
  this.canvasHeight = containerRect.height;

  // Canvas DOM-Größe (bereits durch cssText auf 100% gesetzt)
  this.canvas.style.width = this.canvasWidth + 'px';
  this.canvas.style.height = this.canvasHeight + 'px';

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const hdRatio = dpr * this.settings.qualityMultiplier;

  // Canvas interne Auflösung (HD)
  this.canvas.width = this.canvasWidth * hdRatio;
  this.canvas.height = this.canvasHeight * hdRatio;

  this.ctx = this.canvas.getContext('2d', { 
    alpha: true,
    desynchronized: true,
    willReadFrequently: false
  });

  this.ctx.scale(hdRatio, hdRatio);
  this.ctx.imageSmoothingEnabled = true;
  this.ctx.imageSmoothingQuality = this.isMobile ? 'medium' : 'high';
  
  console.log(`✅ Canvas: ${this.canvasWidth}x${this.canvasHeight} (${this.canvas.width}x${this.canvas.height} internal)`);
}


    setupInputDetection() {
      const isTouchDevice = 'ontouchstart' in window;

      this.cards.forEach((card) => {
        if (isTouchDevice) {
          let touchTimeout;

          card.element.addEventListener('touchstart', (e) => {
            this.hoveredCard = card;

            if (this.settings.touchFeedback) {
              card.element.style.transform = 'scale(0.97)';
              card.element.style.transition = 'transform 0.15s ease';
            }

            touchTimeout = setTimeout(() => {
              if (this.hoveredCard === card) {
                if (this.settings.touchFeedback) {
                  card.element.style.transform = 'scale(0.95)';
                }
              }
            }, 200);

          }, { passive: true });

          card.element.addEventListener('touchend', () => {
            clearTimeout(touchTimeout);

            if (this.settings.touchFeedback) {
              card.element.style.transform = '';
            }

            setTimeout(() => {
              if (this.hoveredCard === card) {
                this.hoveredCard = null;
              }
            }, 350);
          }, { passive: true });

          card.element.addEventListener('touchcancel', () => {
            clearTimeout(touchTimeout);
            if (this.settings.touchFeedback) {
              card.element.style.transform = '';
            }
            this.hoveredCard = null;
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

    generateIntelligentConnections() {
      this.connections = [];
      const clusters = this.detectClusters();

      if (clusters.length > 0) {
        this.generatePrimaryConnections(clusters);
        this.generateSecondaryConnections(clusters);
        this.generateBridgeConnections(clusters);

        if (this.settings.enableCurves) {
          this.generateClusterConnections(clusters);
        }

        this.optimizeConnections();
      }
    }

    generateFallbackConnections() {
      const categoryGroups = {};

      this.cards.forEach(card => {
        if (!categoryGroups[card.category]) {
          categoryGroups[card.category] = [];
        }
        categoryGroups[card.category].push(card);
      });

      Object.values(categoryGroups).forEach(group => {
        if (group.length > 1) {
          group.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 100) return a.x - b.x;
            return a.y - b.y;
          });

          const max = Math.min(group.length - 1, this.settings.maxPrimaryConnections);
          for (let i = 0; i < max; i++) {
            this.addConnection(group[i], group[i + 1], 'primary', 1.0);
          }
        }
      });

      Object.values(categoryGroups).forEach(group => {
        if (group.length > 3) {
          group.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 100) return a.x - b.x;
            return a.y - b.y;
          });

          const max = Math.min(Math.floor(group.length / 2), this.settings.maxSecondaryConnections);
          for (let i = 0; i < max; i++) {
            const from = group[i * 2];
            const to = group[Math.min(i * 2 + 2, group.length - 1)];
            if (from !== to && !this.connectionExists(from, to)) {
              this.addConnection(from, to, 'secondary', 0.7);
            }
          }
        }
      });

      const categories = Object.keys(categoryGroups);
      const maxBridges = Math.min(categories.length - 1, this.settings.maxBridgeConnections);

      for (let i = 0; i < maxBridges; i++) {
        const groupA = categoryGroups[categories[i]];
        const groupB = categoryGroups[categories[i + 1]];

        if (groupA && groupB && groupA.length > 0 && groupB.length > 0) {
          let minDist = Infinity;
          let closestPair = null;

          groupA.forEach(cardA => {
            groupB.forEach(cardB => {
              const dist = this.getDistance(cardA, cardB);
              if (dist < minDist && dist < 600) {
                minDist = dist;
                closestPair = [cardA, cardB];
              }
            });
          });

          if (closestPair && !this.connectionExists(closestPair[0], closestPair[1])) {
            this.addConnection(closestPair[0], closestPair[1], 'bridge', 0.6);
          }
        }
      }

      if (this.settings.enableCurves) {
        Object.values(categoryGroups).forEach(group => {
          if (group.length > 3) {
            group.sort((a, b) => {
              if (Math.abs(a.y - b.y) < 100) return a.x - b.x;
              return a.y - b.y;
            });

            const start = group[0];
            const end = group[group.length - 1];

            if (!this.connectionExists(start, end) && this.getDistance(start, end) < 600) {
              this.addConnection(start, end, 'cluster', 0.5);
            }
          }
        });
      }
    }

    detectClusters() {
      const categoryGroups = {};

      this.cards.forEach(card => {
        if (!categoryGroups[card.category]) {
          categoryGroups[card.category] = [];
        }
        categoryGroups[card.category].push(card);
      });

      const clusters = [];

      Object.entries(categoryGroups).forEach(([category, cards]) => {
        if (cards.length < this.settings.minClusterSize) return;

        cards.sort((a, b) => {
          if (Math.abs(a.y - b.y) < 100) return a.x - b.x;
          return a.y - b.y;
        });

        const spatialClusters = [];
        let currentCluster = [cards[0]];

        for (let i = 1; i < cards.length; i++) {
          const dist = this.getDistance(cards[i-1], cards[i]);
          if (dist < this.settings.maxDistance) {
            currentCluster.push(cards[i]);
          } else {
            if (currentCluster.length >= this.settings.minClusterSize) {
              spatialClusters.push(currentCluster);
            }
            currentCluster = [cards[i]];
          }
        }
        if (currentCluster.length >= this.settings.minClusterSize) {
          spatialClusters.push(currentCluster);
        }

        spatialClusters.forEach(cluster => {
          clusters.push({
            category: category,
            cards: cluster,
            center: this.getClusterCenter(cluster)
          });
          cluster.forEach(card => card.cluster = clusters.length - 1);
        });
      });

      return clusters;
    }

    getClusterCenter(cards) {
      const sumX = cards.reduce((sum, card) => sum + card.x, 0);
      const sumY = cards.reduce((sum, card) => sum + card.y, 0);
      return { x: sumX / cards.length, y: sumY / cards.length };
    }

    generatePrimaryConnections(clusters) {
      clusters.forEach(cluster => {
        const cards = cluster.cards;
        const max = Math.min(cards.length - 1, this.settings.maxPrimaryConnections);

        for (let i = 0; i < max; i++) {
          this.addConnection(cards[i], cards[i + 1], 'primary', 1.0);
        }

        if (cards.length > 4 && !this.isMobile) {
          this.addConnection(cards[0], cards[cards.length - 1], 'primary', 0.6);
        }
      });
    }

    generateSecondaryConnections(clusters) {
      clusters.forEach(cluster => {
        const cards = cluster.cards;
        if (cards.length > 3) {
          const max = Math.min(
            Math.floor(cards.length / 2),
            this.settings.maxSecondaryConnections
          );

          for (let i = 0; i < max; i++) {
            const from = cards[i * 2];
            const to = cards[Math.min(i * 2 + 2, cards.length - 1)];

            if (from !== to && !this.connectionExists(from, to)) {
              this.addConnection(from, to, 'secondary', 0.7);
            }
          }
        }
      });
    }

    generateBridgeConnections(clusters) {
      const maxBridges = Math.min(
        Math.floor(clusters.length * 1.5),
        this.settings.maxBridgeConnections
      );

      let bridgesCreated = 0;

      for (let i = 0; i < clusters.length && bridgesCreated < maxBridges; i++) {
        for (let j = i + 1; j < clusters.length && bridgesCreated < maxBridges; j++) {
          const clusterA = clusters[i];
          const clusterB = clusters[j];

          let minDist = Infinity;
          let closestPair = null;

          clusterA.cards.forEach(cardA => {
            clusterB.cards.forEach(cardB => {
              const dist = this.getDistance(cardA, cardB);
              if (dist < minDist) {
                minDist = dist;
                closestPair = [cardA, cardB];
              }
            });
          });

          if (closestPair && minDist < this.settings.maxDistance && !this.connectionExists(closestPair[0], closestPair[1])) {
            this.addConnection(closestPair[0], closestPair[1], 'bridge', 0.5);
            bridgesCreated++;
          }
        }
      }
    }

    generateClusterConnections(clusters) {
      clusters.forEach(cluster => {
        const cards = cluster.cards;
        if (cards.length > 3) {
          const start = cards[0];
          const end = cards[cards.length - 1];

          if (!this.connectionExists(start, end)) {
            this.addConnection(start, end, 'cluster', 0.6);
          }
        }
      });
    }

    optimizeConnections() {
      this.cards.forEach(card => card.degree = 0);

      this.connections.forEach(conn => {
        conn.from.degree++;
        conn.to.degree++;
      });

      const maxDegree = this.isMobile ? 4 : 6;

      this.connections = this.connections.filter(conn => {
        return conn.from.degree <= maxDegree && conn.to.degree <= maxDegree;
      });

      this.connections.sort((a, b) => {
        const scoreA = (this.connectionTypes[a.type]?.priority || 1) * a.weight;
        const scoreB = (this.connectionTypes[b.type]?.priority || 1) * b.weight;
        return scoreB - scoreA;
      });
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

    addConnection(from, to, type, weight = 1.0) {
      const typeConfig = this.connectionTypes[type];

      const conn = {
        from: from,
        to: to,
        type: type,
        category: from.category,
        weight: weight,
        activeState: 1,
        glowOffset: Math.random() * Math.PI * 2,
        pulseOffset: Math.random() * Math.PI * 2,
        config: typeConfig,
        // 🆕 Generate organic path
        organicPath: this.settings.organicCurves ? this.generateOrganicPath(from, to) : null
      };
      this.connections.push(conn);
      this.activeConnections.set(conn, 1);
    }

    // 🆕 NEUE FUNKTION: Organischen Pfad generieren
    generateOrganicPath(from, to) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const segments = Math.max(4, Math.floor(dist / 60));
      const path = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        
        const baseX = from.x + dx * t;
        const baseY = from.y + dy * t;

        // Perlin Noise für smooth, organische Abweichung
        const noiseX = this.noise.noise2D(baseX * this.settings.noiseScale, baseY * this.settings.noiseScale);
        const noiseY = this.noise.noise2D(baseY * this.settings.noiseScale, baseX * this.settings.noiseScale);

        // Senkrechte zur Linie
        const perpX = -dy / dist;
        const perpY = dx / dist;

        // Sinus-Welle für smooth flow
        const wave = Math.sin(t * Math.PI * 2) * this.settings.waveAmplitude * this.settings.curveComplexity;

        // Kombiniere Noise + Wave
        const offsetX = (perpX * wave) + (noiseX * this.settings.waveAmplitude * 0.8);
        const offsetY = (perpY * wave) + (noiseY * this.settings.waveAmplitude * 0.8);

        path.push({
          x: baseX + offsetX,
          y: baseY + offsetY
        });
      }

      return path;
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
        const targetState = isActive ? 1 : 0.25;
        const currentState = this.activeConnections.get(conn) || 1;

        const newState = this.lerp(currentState, targetState, this.settings.hoverSpeed);
        this.activeConnections.set(conn, newState);
      });
    }

    getGradient(from, to, fromColor, toColor, baseOpacity) {
      const key = `${from.x},${from.y},${to.x},${to.y},${baseOpacity.toFixed(2)}`;

      if (this.gradientCache.has(key)) {
        return this.gradientCache.get(key);
      }

      const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);

      const midBoost = this.isMobile ? 1.2 : 1.1;

      gradient.addColorStop(0, `rgba(${fromColor.r}, ${fromColor.g}, ${fromColor.b}, ${baseOpacity})`);
      gradient.addColorStop(0.5, `rgba(${Math.round((fromColor.r + toColor.r)/2)}, ${Math.round((fromColor.g + toColor.g)/2)}, ${Math.round((fromColor.b + toColor.b)/2)}, ${baseOpacity * midBoost})`);
      gradient.addColorStop(1, `rgba(${toColor.r}, ${toColor.g}, ${toColor.b}, ${baseOpacity})`);

      if (this.gradientCache.size > 100) {
        const firstKey = this.gradientCache.keys().next().value;
        this.gradientCache.delete(firstKey);
      }

      this.gradientCache.set(key, gradient);
      return gradient;
    }

    drawConnection(from, to, connection, activeState, time) {
      const config = connection.config;
      const fromColor = this.categoryColors[from.category] || this.categoryColors.other;
      const toColor = this.categoryColors[to.category] || this.categoryColors.other;

      const weight = connection.weight || 1;

      let pulseMultiplier = 1.0;
      if (config.pulseEnabled && this.isMobile) {
        const pulseProgress = (time * this.settings.pulseSpeed + connection.pulseOffset) % (Math.PI * 2);
        pulseMultiplier = 1.0 + Math.sin(pulseProgress) * this.settings.pulseIntensity;
      }

      const baseOpacity = this.settings.baseOpacity * activeState * weight * pulseMultiplier;

      const gradient = this.getGradient(from, to, fromColor, toColor, baseOpacity);

      // Base line
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = (this.settings.baseLineWidth * config.lineWidth / 2.5) * weight * pulseMultiplier;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.setLineDash(config.dashPattern);

      // 🆕 Zeichne organischen Pfad oder normale Linie
      if (this.settings.organicCurves && connection.organicPath) {
        this.drawOrganicPath(connection.organicPath);
      } else if (config.curve && !this.settings.useSimplifiedRendering) {
        this.drawCurvedLine(from, to);
      } else {
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
      }

      this.ctx.setLineDash([]);

      // Flowing glow
      if (!this.settings.useSimplifiedRendering || activeState > 0.3) {
        const flowSpeed = this.settings.glowSpeed * config.flowSpeed * config.glowIntensity;
        const glowProgress = ((time * flowSpeed + connection.glowOffset) % (Math.PI * 2)) / (Math.PI * 2);
        const glowStart = Math.max(0, glowProgress - this.settings.glowLength / 2);
        const glowEnd = Math.min(1, glowProgress + this.settings.glowLength / 2);

        if (glowEnd > 0 && glowStart < 1) {
          const glowGradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
          const glowOpacity = this.settings.glowOpacity * activeState * weight * config.glowIntensity * pulseMultiplier;

          if (glowStart > 0) {
            glowGradient.addColorStop(0, `rgba(${fromColor.r}, ${fromColor.g}, ${fromColor.b}, 0)`);
            glowGradient.addColorStop(glowStart, `rgba(${fromColor.r}, ${fromColor.g}, ${fromColor.b}, 0)`);
          }

          const glowCenter = (glowStart + glowEnd) / 2;
          const centerColor = this.lerpColor(fromColor, toColor, glowCenter);

          glowGradient.addColorStop(glowCenter, `rgba(${centerColor.r}, ${centerColor.g}, ${centerColor.b}, ${glowOpacity})`);

          if (glowEnd < 1) {
            glowGradient.addColorStop(glowEnd, `rgba(${toColor.r}, ${toColor.g}, ${toColor.b}, 0)`);
            glowGradient.addColorStop(1, `rgba(${toColor.r}, ${toColor.g}, ${toColor.b}, 0)`);
          }

          this.ctx.strokeStyle = glowGradient;
          this.ctx.lineWidth = (this.settings.baseLineWidth * config.lineWidth / 2.5) * 3 * weight * pulseMultiplier;
          this.ctx.shadowBlur = this.settings.glowWidth * activeState * config.glowIntensity * pulseMultiplier;
          this.ctx.shadowColor = `rgba(${centerColor.r}, ${centerColor.g}, ${centerColor.b}, ${glowOpacity})`;

          if (this.settings.organicCurves && connection.organicPath) {
            this.drawOrganicPath(connection.organicPath);
          } else if (config.curve && !this.settings.useSimplifiedRendering) {
            this.drawCurvedLine(from, to);
          } else {
            this.ctx.beginPath();
            this.ctx.moveTo(from.x, from.y);
            this.ctx.lineTo(to.x, to.y);
            this.ctx.stroke();
          }

          this.ctx.shadowBlur = 0;
        }
      }
    }

    // 🆕 NEUE FUNKTION: Organischen Pfad zeichnen
    drawOrganicPath(path) {
      if (!path || path.length < 2) return;

      this.ctx.beginPath();
      this.ctx.moveTo(path[0].x, path[0].y);

      // Smooth Bezier curves durch alle Punkte
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
    }

    drawCurvedLine(from, to) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const offset = dist * 0.2;
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;

      const perpX = -dy / dist * offset;
      const perpY = dx / dist * offset;

      const cpX = midX + perpX;
      const cpY = midY + perpY;

      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.quadraticCurveTo(cpX, cpY, to.x, to.y);
      this.ctx.stroke();
    }

    lerpColor(color1, color2, t) {
      return {
        r: Math.round(color1.r + (color2.r - color1.r) * t),
        g: Math.round(color1.g + (color2.g - color1.g) * t),
        b: Math.round(color1.b + (color2.b - color1.b) * t)
      };
    }

    animate(now) {
      if (!this.ctx || !this.canvas) return;

      this.animationFrame = requestAnimationFrame((t) => this.animate(t));

      const elapsed = now - this.then;
      if (elapsed < this.frameInterval) return;

      this.then = now - (elapsed % this.frameInterval);

      this.glowTime = now;
      this.pulseTime = now;
      this.updateActiveStates();

      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

      this.connections.forEach(conn => {
        const activeState = this.activeConnections.get(conn) || 1;
        this.drawConnection(conn.from, conn.to, conn, activeState, now);
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
      this.setupAdaptiveSettings();
      this.gradientCache.clear();
      this.setupCanvas();
      this.scanTools();
      this.generateIntelligentConnections();
      if (this.connections.length === 0) {
        this.generateFallbackConnections();
      }
      this.setupInputDetection();
    }

    setupResizeObserver() {
      if (!this.gridElement) return;

      this.resizeObserver = new ResizeObserver(() => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.setupCanvas();
          this.scanTools();
          this.generateIntelligentConnections();
          if (this.connections.length === 0) {
            this.generateFallbackConnections();
          }
        }, 250);
      });

      this.resizeObserver.observe(this.gridElement);
    }

    countTypes() {
      const stats = { primary: 0, secondary: 0, bridge: 0, cluster: 0 };
      this.connections.forEach(conn => stats[conn.type]++);
      return Object.entries(stats)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => `${count} ${type}`);
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
      this.gradientCache.clear();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.colorFlowNetwork = new GridSynchronizedNetworkUltimate();
    });
  } else {
    window.colorFlowNetwork = new GridSynchronizedNetworkUltimate();
  }

  window.debugColorFlow = function() {
    const net = window.colorFlowNetwork;
    if (!net) {
      console.log('❌ Network not initialized');
      return;
    }
    console.group('🚀 Color Flow v12.2 ORGANIC');
    console.log('Device:', net.isMobile ? 'Mobile 📱' : net.isTablet ? 'Tablet 📱' : 'Desktop 🖥️');
    console.log('Cards:', net.cards.length);
    console.log('Connections:', net.connections.length);
    console.log('Types:', net.countTypes().join(', '));
    console.log('Organic Curves:', net.settings.organicCurves ? 'YES 🌊' : 'NO');
    console.log('Perlin Noise:', 'YES ✨');
    console.groupEnd();
  };

})();
