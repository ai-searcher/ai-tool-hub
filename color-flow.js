
// =========================================
// GRID SYNCHRONIZED NETWORK V12.0 ULTIMATE
// All Features + Guaranteed Working
// - 4 Connection Types (solid/dashed/dotted/curved)
// - Intelligent Cluster Detection
// - Robust Fallback System
// - Performance Optimized
// - Mobile Friendly
// - Thin Thread Lines
// - Flowing Glow Effect
// =========================================

(function() {
  'use strict';

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

      this.init();
    }

    setupAdaptiveSettings() {
      if (this.isMobile) {
        this.settings = {
          qualityMultiplier: 1.0,
          baseLineWidth: 1.5,
          glowWidth: 10,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: false,
          maxPrimaryConnections: 2,
          maxSecondaryConnections: 1,
          maxBridgeConnections: 2,
          hoverSpeed: 0.30,
          baseOpacity: 0.35,
          glowOpacity: 0.50,
          useSimplifiedRendering: true,
          minClusterSize: 2,
          maxDistance: 400
        };
      } else if (this.isTablet) {
        this.settings = {
          qualityMultiplier: 1.2,
          baseLineWidth: 2.0,
          glowWidth: 12,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: true,
          maxPrimaryConnections: 3,
          maxSecondaryConnections: 2,
          maxBridgeConnections: 3,
          hoverSpeed: 0.25,
          baseOpacity: 0.40,
          glowOpacity: 0.45,
          useSimplifiedRendering: false,
          minClusterSize: 2,
          maxDistance: 450
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
          maxDistance: 500
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
      console.log('🚀 GridSynchronizedNetwork v12.0 ULTIMATE');

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

      if (this.cards.length === 0) {
        console.warn('⚠️ No cards found');
        return;
      }

      // Try intelligent algorithm first
      this.generateIntelligentConnections();

      // Fallback if no connections generated
      if (this.connections.length === 0) {
        console.log('📋 Using fallback connection generation');
        this.generateFallbackConnections();
      }

      this.setupInputDetection();
      this.startAnimation();
      this.setupResizeObserver();

      console.log('✅ Ultimate Network initialized!');
      console.log(`🕸️ ${this.connections.length} connections (${this.countTypes().join(', ')})`);
    }

    setupCanvas() {
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
    }

    scanTools() {
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

    // INTELLIGENT CONNECTION GENERATION
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

    // FALLBACK: Simple but guaranteed working
    generateFallbackConnections() {
      const categoryGroups = {};

      this.cards.forEach(card => {
        if (!categoryGroups[card.category]) {
          categoryGroups[card.category] = [];
        }
        categoryGroups[card.category].push(card);
      });

      // Primary: Connect within categories
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

      // Secondary: Skip connections within larger groups
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

      // Bridge: Connect different categories
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

      // Cluster: Curved connections for visual variety
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

      this.connections = this.connections.filter(conn => {
        const maxDegree = this.isMobile ? 4 : 6;
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

      // Base line
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

      // Flowing glow
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
    console.group('🚀 Color Flow v12.0 ULTIMATE');
    console.log('Device:', net.isMobile ? 'Mobile 📱' : net.isTablet ? 'Tablet 📱' : 'Desktop 🖥️');
    console.log('Cards:', net.cards.length);
    console.log('Connections:', net.connections.length);
    console.log('Types:', net.countTypes().join(', '));
    console.log('Gradient Cache:', net.gradientCache.size);
    console.log('Curves:', net.settings.enableCurves);
    console.log('FPS:', net.targetFPS);
    console.groupEnd();
  };

})();

