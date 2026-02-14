// =========================================
// GRID SYNCHRONIZED NETWORK V11.2 FIXED
// Fixed: Fallback für wenige Cards
// =========================================

(function() {
  'use strict';

  console.log('🔍 [DEBUG] Script loaded!');

  class GridSynchronizedNetworkTurbo {
    constructor() {
      console.log('🔍 [DEBUG] Constructor called');

      this.canvas = null;
      this.ctx = null;
      this.gridElement = null;
      this.containerElement = null;
      this.cards = [];
      this.connections = [];
      this.animationFrame = null;
      this.resizeObserver = null;
      this.hoveredCard = null;
      this.lastTime = 0;
      this.canvasWidth = 0;
      this.canvasHeight = 0;
      this.glowTime = 0;

      this.frameSkip = 0;
      this.targetFPS = 60;
      this.frameInterval = 1000 / this.targetFPS;
      this.then = 0;

      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

      this.gradientCache = new Map();
      this.colorCache = new Map();

      this.connectionTypes = {
        primary: {
          style: 'solid',
          lineWidth: 2.5,
          dashPattern: [],
          glowIntensity: 1.0,
          flowSpeed: 1.0,
          color: 'gradient'
        },
        secondary: {
          style: 'dashed',
          lineWidth: 1.8,
          dashPattern: [8, 4],
          glowIntensity: 0.8,
          flowSpeed: 0.7,
          color: 'gradient'
        },
        bridge: {
          style: 'dotted',
          lineWidth: 1.5,
          dashPattern: [2, 6],
          glowIntensity: 0.6,
          flowSpeed: 0.5,
          color: 'mixed'
        },
        cluster: {
          style: 'curved',
          lineWidth: 2.0,
          dashPattern: [],
          glowIntensity: 0.9,
          flowSpeed: 0.8,
          color: 'gradient',
          curve: true
        }
      };

      this.setupAdaptiveSettings();
      this.activeConnections = new Map();

      this.init();
    }

    setupAdaptiveSettings() {
      console.log('🔍 [DEBUG] Setup adaptive settings');
      console.log('🔍 [DEBUG] Device:', this.isMobile ? 'Mobile' : this.isTablet ? 'Tablet' : 'Desktop');

      if (this.isMobile) {
        this.settings = {
          qualityMultiplier: 1.0,
          baseLineWidth: 1.5,
          glowWidth: 10,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: false,
          enableClustering: true,
          enableHierarchy: true,
          maxPrimaryConnections: 2,
          maxSecondaryConnections: 1,
          hoverSpeed: 0.30,
          baseOpacity: 0.35,
          glowOpacity: 0.50,
          useSimplifiedRendering: true
        };
      } else if (this.isTablet) {
        this.settings = {
          qualityMultiplier: 1.2,
          baseLineWidth: 2.0,
          glowWidth: 12,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: true,
          enableClustering: true,
          enableHierarchy: true,
          maxPrimaryConnections: 3,
          maxSecondaryConnections: 2,
          hoverSpeed: 0.25,
          baseOpacity: 0.40,
          glowOpacity: 0.45,
          useSimplifiedRendering: false
        };
      } else {
        this.settings = {
          qualityMultiplier: 1.5,
          baseLineWidth: 2.5,
          glowWidth: 15,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: true,
          enableClustering: true,
          enableHierarchy: true,
          maxPrimaryConnections: 4,
          maxSecondaryConnections: 3,
          hoverSpeed: 0.25,
          baseOpacity: 0.45,
          glowOpacity: 0.40,
          useSimplifiedRendering: false
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

    init() {
      console.log('🚀 GridSynchronizedNetwork v11.2 FIXED');

      window.addEventListener('quantum:ready', () => {
        console.log('🔍 [DEBUG] Quantum ready event');
        setTimeout(() => this.setup(), 50);
      });

      if (document.readyState === 'complete') {
        console.log('🔍 [DEBUG] Document ready, calling setup');
        setTimeout(() => this.setup(), 100);
      } else {
        console.log('🔍 [DEBUG] Waiting for document ready...');
      }

      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.handleResize(), 300);
      });
    }

    setup() {
      console.log('🔍 [DEBUG] Setup starting...');

      this.gridElement = document.getElementById('tool-grid');
      console.log('🔍 [DEBUG] Grid element:', this.gridElement);

      if (!this.gridElement) {
        console.warn('⚠️ [DEBUG] Grid element NOT found! Retrying in 500ms...');
        setTimeout(() => this.setup(), 500);
        return;
      }

      this.containerElement = this.gridElement.parentElement;
      console.log('🔍 [DEBUG] Container element:', this.containerElement);

      if (!this.containerElement) {
        console.error('❌ [DEBUG] Container not found!');
        return;
      }

      this.setupCanvas();
      this.scanTools();

      if (this.cards.length === 0) {
        console.error('❌ [DEBUG] NO CARDS FOUND! Check .card-square selector!');
        return;
      }

      this.generateIntelligentConnections();

      if (this.connections.length === 0) {
        console.warn('⚠️ [DEBUG] NO CONNECTIONS from intelligent algo, using FALLBACK!');
        this.generateFallbackConnections();
      }

      this.setupInputDetection();
      this.startAnimation();
      this.setupResizeObserver();

      console.log('✅ Turbo Intelligent Network initialized!');
      console.log(`🕸️ Connections: ${this.connections.length}`);
      this.printConnectionStats();
    }

    setupCanvas() {
      console.log('🔍 [DEBUG] Setting up canvas...');

      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'connection-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
        this.canvas.style.willChange = 'transform';
        this.containerElement.insertBefore(this.canvas, this.gridElement);
        console.log('🔍 [DEBUG] Canvas created and inserted');
      }

      const gridRect = this.gridElement.getBoundingClientRect();
      const parentRect = this.containerElement.getBoundingClientRect();

      this.canvasWidth = gridRect.width;
      this.canvasHeight = gridRect.height;

      console.log('🔍 [DEBUG] Canvas dimensions:', this.canvasWidth, 'x', this.canvasHeight);

      this.canvas.style.left = (gridRect.left - parentRect.left) + 'px';
      this.canvas.style.top = (gridRect.top - parentRect.top) + 'px';
      this.canvas.style.width = this.canvasWidth + 'px';
      this.canvas.style.height = this.canvasHeight + 'px';

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const hdRatio = dpr * this.settings.qualityMultiplier;

      this.canvas.width = this.canvasWidth * hdRatio;
      this.canvas.height = this.canvasHeight * hdRatio;

      this.ctx = this.canvas.getContext('2d', { 
        alpha: true,
        desynchronized: true,
        willReadFrequently: false
      });

      this.ctx.scale(hdRatio, hdRatio);
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      console.log('📐 Canvas:', this.canvasWidth + 'x' + this.canvasHeight + 'px @ ' + hdRatio + 'x');
    }

    scanTools() {
      console.log('🔍 [DEBUG] Scanning for cards...');

      const cardElements = this.gridElement.querySelectorAll('.card-square');
      console.log('🔍 [DEBUG] Found', cardElements.length, 'card elements');

      this.cards = [];

      cardElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const gridRect = this.gridElement.getBoundingClientRect();
        const category = el.getAttribute('data-category') || 'other';

        console.log('🔍 [DEBUG] Card', index, ':', category);

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

      console.log('🎯 Scanned', this.cards.length, 'cards');
    }

    setupInputDetection() {
      const isTouchDevice = 'ontouchstart' in window;
      console.log('🔍 [DEBUG] Touch device:', isTouchDevice);

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
            }, 400);
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
      console.log('🔍 [DEBUG] Generating intelligent connections...');

      this.connections = [];

      const clusters = this.detectClusters();
      console.log('🔍 [DEBUG] Detected', clusters.length, 'clusters');

      if (clusters.length > 0) {
        this.generatePrimaryConnections(clusters);
        this.generateSecondaryConnections(clusters);
        this.generateBridgeConnections(clusters);

        if (this.settings.enableClustering) {
          this.generateClusterConnections(clusters);
        }

        this.optimizeConnections();
      }

      console.log('🧠 Generated', this.connections.length, 'intelligent connections');
    }

    // 🔴 NEW: FALLBACK wenn intelligent algo keine Connections generiert
    generateFallbackConnections() {
      console.log('🔄 [FALLBACK] Using simple connection generation...');

      const categoryGroups = {};

      // Group by category
      this.cards.forEach(card => {
        if (!categoryGroups[card.category]) {
          categoryGroups[card.category] = [];
        }
        categoryGroups[card.category].push(card);
      });

      // Connect within categories (simple sequential)
      Object.values(categoryGroups).forEach(group => {
        if (group.length > 1) {
          // Sort by position
          group.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 100) {
              return a.x - b.x;
            }
            return a.y - b.y;
          });

          // Sequential connections
          const maxConnections = Math.min(
            group.length - 1,
            this.isMobile ? 2 : 4
          );

          for (let i = 0; i < maxConnections; i++) {
            this.addConnection(group[i], group[i + 1], 'primary', 1.0);
          }
        }
      });

      // Cross-category connections for variety
      const categories = Object.keys(categoryGroups);
      if (categories.length > 1) {
        for (let i = 0; i < categories.length - 1; i++) {
          const groupA = categoryGroups[categories[i]];
          const groupB = categoryGroups[categories[i + 1]];

          if (groupA.length > 0 && groupB.length > 0) {
            // Connect closest pair
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

            if (closestPair) {
              this.addConnection(closestPair[0], closestPair[1], 'bridge', 0.7);
            }
          }
        }
      }

      console.log('🔄 [FALLBACK] Generated', this.connections.length, 'fallback connections');
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
        // 🔴 SKIP if only 1 card
        if (cards.length < 2) {
          console.log('🔍 [DEBUG] Skipping category', category, '(only', cards.length, 'card)');
          return;
        }

        cards.sort((a, b) => {
          if (Math.abs(a.y - b.y) < 100) {
            return a.x - b.x;
          }
          return a.y - b.y;
        });

        const spatialClusters = [];
        let currentCluster = [cards[0]];

        for (let i = 1; i < cards.length; i++) {
          const dist = this.getDistance(cards[i-1], cards[i]);
          if (dist < 400) {
            currentCluster.push(cards[i]);
          } else {
            if (currentCluster.length > 0) {
              spatialClusters.push(currentCluster);
            }
            currentCluster = [cards[i]];
          }
        }
        if (currentCluster.length > 0) {
          spatialClusters.push(currentCluster);
        }

        spatialClusters.forEach(cluster => {
          if (cluster.length > 1) {
            clusters.push({
              category: category,
              cards: cluster,
              center: this.getClusterCenter(cluster)
            });
            cluster.forEach(card => card.cluster = clusters.length - 1);
            console.log('🔍 [DEBUG] Created cluster:', category, 'with', cluster.length, 'cards');
          }
        });
      });

      return clusters;
    }

    getClusterCenter(cards) {
      const sumX = cards.reduce((sum, card) => sum + card.x, 0);
      const sumY = cards.reduce((sum, card) => sum + card.y, 0);
      return {
        x: sumX / cards.length,
        y: sumY / cards.length
      };
    }

    generatePrimaryConnections(clusters) {
      clusters.forEach(cluster => {
        const cards = cluster.cards;
        const maxConnections = Math.min(
          cards.length - 1,
          this.settings.maxPrimaryConnections
        );

        for (let i = 0; i < maxConnections; i++) {
          this.addConnection(
            cards[i], 
            cards[i + 1], 
            'primary',
            1.0
          );
        }

        if (cards.length > 4 && !this.isMobile) {
          this.addConnection(
            cards[0],
            cards[cards.length - 1],
            'primary',
            0.6
          );
        }
      });
    }

    generateSecondaryConnections(clusters) {
      clusters.forEach(cluster => {
        const cards = cluster.cards;
        if (cards.length > 3) {
          const maxSecondary = Math.min(
            Math.floor(cards.length / 2),
            this.settings.maxSecondaryConnections
          );

          for (let i = 0; i < maxSecondary; i++) {
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
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
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

          if (closestPair && minDist < 500 && !this.connectionExists(closestPair[0], closestPair[1])) {
            this.addConnection(
              closestPair[0],
              closestPair[1],
              'bridge',
              0.5
            );
          }
        }
      }
    }

    generateClusterConnections(clusters) {
      if (!this.settings.enableCurves) return;

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
      // Reset degrees
      this.cards.forEach(card => card.degree = 0);

      this.connections.forEach(conn => {
        conn.from.degree++;
        conn.to.degree++;
      });

      const beforeCount = this.connections.length;

      this.connections = this.connections.filter(conn => {
        const maxDegree = this.isMobile ? 4 : 6;
        return conn.from.degree <= maxDegree && conn.to.degree <= maxDegree;
      });

      if (beforeCount !== this.connections.length) {
        console.log('🔍 [DEBUG] Optimized: removed', beforeCount - this.connections.length, 'overloaded connections');
      }

      this.connections.sort((a, b) => {
        const scoreA = this.getConnectionScore(a);
        const scoreB = this.getConnectionScore(b);
        return scoreB - scoreA;
      });
    }

    getConnectionScore(conn) {
      const typeScores = {
        primary: 4,
        cluster: 3,
        secondary: 2,
        bridge: 1
      };
      return (typeScores[conn.type] || 1) * conn.weight;
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
        config: typeConfig
      };
      this.connections.push(conn);
      this.activeConnections.set(conn, 1);
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

        const newState = this.lerp(
          currentState, 
          targetState, 
          this.settings.hoverSpeed
        );

        this.activeConnections.set(conn, newState);
      });
    }

    getGradient(from, to, fromColor, toColor, baseOpacity) {
      const key = `${from.x},${from.y},${to.x},${to.y},${baseOpacity}`;

      if (this.gradientCache.has(key)) {
        return this.gradientCache.get(key);
      }

      const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, `rgba(${fromColor.r}, ${fromColor.g}, ${fromColor.b}, ${baseOpacity})`);
      gradient.addColorStop(0.5, `rgba(${Math.round((fromColor.r + toColor.r)/2)}, ${Math.round((fromColor.g + toColor.g)/2)}, ${Math.round((fromColor.b + toColor.b)/2)}, ${baseOpacity * 1.1})`);
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
      const baseOpacity = this.settings.baseOpacity * activeState * weight;

      const gradient = this.getGradient(from, to, fromColor, toColor, baseOpacity);

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = (this.settings.baseLineWidth * config.lineWidth / 2.5) * weight;
      this.ctx.lineCap = 'round';
      this.ctx.setLineDash(config.dashPattern);

      if (config.curve && !this.settings.useSimplifiedRendering) {
        this.drawCurvedLine(from, to);
      } else {
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
      }

      this.ctx.setLineDash([]);

      if (!this.settings.useSimplifiedRendering || activeState > 0.5) {
        const flowSpeed = this.settings.glowSpeed * config.flowSpeed * config.glowIntensity;
        const glowProgress = ((time * flowSpeed + connection.glowOffset) % (Math.PI * 2)) / (Math.PI * 2);
        const glowStart = Math.max(0, glowProgress - this.settings.glowLength / 2);
        const glowEnd = Math.min(1, glowProgress + this.settings.glowLength / 2);

        if (glowEnd > 0 && glowStart < 1) {
          const glowGradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
          const glowOpacity = this.settings.glowOpacity * activeState * weight * config.glowIntensity;

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
          this.ctx.lineWidth = (this.settings.baseLineWidth * config.lineWidth / 2.5) * 3 * weight;
          this.ctx.shadowBlur = this.settings.glowWidth * activeState * config.glowIntensity;
          this.ctx.shadowColor = `rgba(${centerColor.r}, ${centerColor.g}, ${centerColor.b}, ${glowOpacity})`;

          if (config.curve && !this.settings.useSimplifiedRendering) {
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
      this.updateActiveStates();

      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

      this.connections.forEach(conn => {
        const activeState = this.activeConnections.get(conn) || 1;
        this.drawConnection(conn.from, conn.to, conn, activeState, now);
      });
    }

    startAnimation() {
      console.log('🔍 [DEBUG] Starting animation...');

      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.then = performance.now();
      this.animate(this.then);

      console.log('🎬 Animation started');
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

    printConnectionStats() {
      const stats = {
        primary: 0,
        secondary: 0,
        bridge: 0,
        cluster: 0
      };

      this.connections.forEach(conn => {
        stats[conn.type]++;
      });

      console.log('📊 Connection Types:', stats);
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
      this.colorCache.clear();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🔍 [DEBUG] DOMContentLoaded fired');
      window.colorFlowNetwork = new GridSynchronizedNetworkTurbo();
    });
  } else {
    console.log('🔍 [DEBUG] Document already ready');
    window.colorFlowNetwork = new GridSynchronizedNetworkTurbo();
  }

  window.debugColorFlow = function() {
    const net = window.colorFlowNetwork;
    if (!net) {
      console.log('❌ Network not initialized');
      return;
    }
    console.group('🚀 Color Flow v11.2 FIXED');
    console.log('Device:', net.isMobile ? 'Mobile 📱' : net.isTablet ? 'Tablet' : 'Desktop 🖥️');
    console.log('Cards:', net.cards.length);
    console.log('Total Connections:', net.connections.length);
    net.printConnectionStats();
    console.log('Gradient Cache:', net.gradientCache.size);
    console.log('Curves Enabled:', net.settings.enableCurves);
    console.log('FPS Target:', net.targetFPS);
    console.log('Canvas:', net.canvas);
    console.log('Hovered:', net.hoveredCard ? net.hoveredCard.category : 'None');
    console.groupEnd();
  };

})();
