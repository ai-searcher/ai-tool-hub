// =========================================
// GRID SYNCHRONIZED NETWORK V10.0 ELEGANT
// Minimalist Mobile Edition:
// - Thread-like thin lines
// - Flowing glow instead of particles
// - Ultra lightweight
// - 2 connections max per category
// =========================================

(function() {
  'use strict';

  class GridSynchronizedNetworkElegant {
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
      this.lastTime = 0;
      this.canvasWidth = 0;
      this.canvasHeight = 0;
      this.glowTime = 0;

      // Device Detection
      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

      // Adaptive Settings
      this.setupAdaptiveSettings();

      this.activeConnections = new Map();

      this.init();
    }

    setupAdaptiveSettings() {
      if (this.isMobile) {
        // MOBILE: Minimal & Elegant
        this.settings = {
          qualityMultiplier: 1.0,
          lineWidth: 1.5,              // 🔴 Sehr dünn wie Faden!
          glowWidth: 10,               // 🔴 Eleganter Glow
          glowSpeed: 0.0015,           // 🔴 Langsam fließend
          glowLength: 0.3,             // 🔴 30% der Linie leuchtet
          maxConnectionsPerCategory: 2, // 🔴 Nur 2 Linien pro Kategorie!
          enableProximity: false,      // 🔴 Keine Proximity
          enableBridges: false,        // 🔴 Keine Bridges
          hoverSpeed: 0.30,
          baseOpacity: 0.35,
          glowOpacity: 0.50
        };
      } else if (this.isTablet) {
        // TABLET: Medium
        this.settings = {
          qualityMultiplier: 1.2,
          lineWidth: 2.0,
          glowWidth: 12,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          maxConnectionsPerCategory: 3,
          enableProximity: true,
          enableBridges: false,
          hoverSpeed: 0.25,
          baseOpacity: 0.40,
          glowOpacity: 0.45
        };
      } else {
        // DESKTOP: Full
        this.settings = {
          qualityMultiplier: 1.5,
          lineWidth: 2.5,
          glowWidth: 15,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          maxConnectionsPerCategory: 4,
          enableProximity: true,
          enableBridges: true,
          hoverSpeed: 0.25,
          baseOpacity: 0.45,
          glowOpacity: 0.40
        };
      }

      // Category Colors
      this.categoryColors = {
        text: { r: 0, g: 243, b: 255 },
        image: { r: 236, g: 72, b: 153 },
        code: { r: 139, g: 92, b: 246 },
        video: { r: 239, g: 68, b: 68 },
        audio: { r: 34, g: 197, b: 94 },
        data: { r: 251, g: 191, b: 36 },
        other: { r: 148, g: 163, b: 184 }
      };

      console.log(`📱 Device: ${this.isMobile ? 'Mobile' : this.isTablet ? 'Tablet' : 'Desktop'}`);
      console.log(`🎨 Style: Elegant Thread Lines`);
      console.log(`📏 Line Width: ${this.settings.lineWidth}px`);
      console.log(`✨ Max Connections/Category: ${this.settings.maxConnectionsPerCategory}`);
    }

    init() {
      console.log('🎨 GridSynchronizedNetwork v10.0 ELEGANT');

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
      this.generateElegantConnections();
      this.setupInputDetection();
      this.startAnimation();
      this.setupResizeObserver();

      console.log('✅ Elegant Network initialized!');
      console.log(`🕸️ Connections: ${this.connections.length}`);
    }

    setupCanvas() {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'connection-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
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

      console.log(`📐 Canvas: ${this.canvasWidth}x${this.canvasHeight}px @ ${hdRatio}x`);
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
          index: index
        });
      });

      console.log(`🎯 Cards: ${this.cards.length}`);
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

    generateElegantConnections() {
      this.connections = [];
      const categoryGroups = {};

      // Group by category
      this.cards.forEach(card => {
        if (!categoryGroups[card.category]) {
          categoryGroups[card.category] = [];
        }
        categoryGroups[card.category].push(card);
      });

      // Only same category connections (elegant & minimal)
      Object.entries(categoryGroups).forEach(([category, group]) => {
        if (group.length > 1) {
          // Sort by position
          group.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 100) {
              return a.x - b.x;
            }
            return a.y - b.y;
          });

          // 🔴 LIMIT: Only maxConnectionsPerCategory connections
          const maxConnections = Math.min(
            group.length - 1, 
            this.settings.maxConnectionsPerCategory
          );

          for (let i = 0; i < maxConnections; i++) {
            this.addConnection(group[i], group[i + 1], 'thread', 1.0);
          }
        }
      });

      // Optional: Proximity (only if enabled)
      if (this.settings.enableProximity) {
        this.cards.forEach((card) => {
          const nearby = this.cards
            .filter(other => {
              if (other === card || other.category === card.category) return false;
              return this.getDistance(card, other) < 300;
            })
            .sort((a, b) => this.getDistance(card, a) - this.getDistance(card, b))
            .slice(0, 1); // Only 1

          nearby.forEach(neighbor => {
            if (!this.connectionExists(card, neighbor)) {
              this.addConnection(card, neighbor, 'thread', 0.7);
            }
          });
        });
      }

      // Optional: Bridges (only if enabled)
      if (this.settings.enableBridges) {
        const categories = Object.keys(categoryGroups);
        categories.forEach((catA, i) => {
          categories.slice(i + 1).forEach(catB => {
            const groupA = categoryGroups[catA];
            const groupB = categoryGroups[catB];

            let minDist = Infinity;
            let closestPair = null;

            groupA.forEach(cardA => {
              groupB.forEach(cardB => {
                const dist = this.getDistance(cardA, cardB);
                if (dist < minDist && dist < 350) {
                  minDist = dist;
                  closestPair = [cardA, cardB];
                }
              });
            });

            if (closestPair && !this.connectionExists(closestPair[0], closestPair[1])) {
              this.addConnection(closestPair[0], closestPair[1], 'thread', 0.5);
            }
          });
        });
      }

      console.log(`🧵 Generated ${this.connections.length} elegant thread connections`);
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
      const conn = {
        from: from,
        to: to,
        type: type,
        category: from.category,
        weight: weight,
        activeState: 1,
        glowOffset: Math.random() * Math.PI * 2 // 🔴 Jede Linie startet anders
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

    // 🔴 NEW: Draw elegant thread line with flowing glow
    drawThreadLine(from, to, connection, activeState, time) {
      const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);

      const fromColor = this.categoryColors[from.category] || this.categoryColors.other;
      const toColor = this.categoryColors[to.category] || this.categoryColors.other;

      const weight = connection.weight || 1;
      const baseOpacity = this.settings.baseOpacity * activeState * weight;

      // Base gradient
      gradient.addColorStop(0, `rgba(${fromColor.r}, ${fromColor.g}, ${fromColor.b}, ${baseOpacity})`);
      gradient.addColorStop(0.5, `rgba(${Math.round((fromColor.r + toColor.r)/2)}, ${Math.round((fromColor.g + toColor.g)/2)}, ${Math.round((fromColor.b + toColor.b)/2)}, ${baseOpacity * 1.1})`);
      gradient.addColorStop(1, `rgba(${toColor.r}, ${toColor.g}, ${toColor.b}, ${baseOpacity})`);

      // Draw base thread line (thin!)
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = this.settings.lineWidth * weight;
      this.ctx.lineCap = 'round';

      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.lineTo(to.x, to.y);
      this.ctx.stroke();

      // 🔴 FLOWING GLOW EFFECT (instead of particles!)
      // Calculate glow position (moves along line)
      const glowProgress = ((time * this.settings.glowSpeed + connection.glowOffset) % (Math.PI * 2)) / (Math.PI * 2);
      const glowStart = Math.max(0, glowProgress - this.settings.glowLength / 2);
      const glowEnd = Math.min(1, glowProgress + this.settings.glowLength / 2);

      // Only draw glow if visible
      if (glowEnd > 0 && glowStart < 1) {
        const glowGradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);

        const glowOpacity = this.settings.glowOpacity * activeState * weight;

        // Glow gradient (transparent -> bright -> transparent)
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

        // Draw glow
        this.ctx.strokeStyle = glowGradient;
        this.ctx.lineWidth = this.settings.lineWidth * 3 * weight; // Thicker for glow
        this.ctx.shadowBlur = this.settings.glowWidth * activeState;
        this.ctx.shadowColor = `rgba(${centerColor.r}, ${centerColor.g}, ${centerColor.b}, ${glowOpacity})`;

        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;
      }
    }

    lerpColor(color1, color2, t) {
      return {
        r: Math.round(color1.r + (color2.r - color1.r) * t),
        g: Math.round(color1.g + (color2.g - color1.g) * t),
        b: Math.round(color1.b + (color2.b - color1.b) * t)
      };
    }

    animate(time) {
      if (!this.ctx || !this.canvas) return;

      this.glowTime = time;

      this.updateActiveStates();

      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

      // Draw all elegant thread lines with flowing glow
      this.connections.forEach(conn => {
        const activeState = this.activeConnections.get(conn) || 1;
        this.drawThreadLine(conn.from, conn.to, conn, activeState, time);
      });

      this.animationFrame = requestAnimationFrame((t) => this.animate(t));
    }

    startAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.animate(performance.now());
    }

    handleResize() {
      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      this.setupAdaptiveSettings();
      this.setupCanvas();
      this.scanTools();
      this.generateElegantConnections();
      this.setupInputDetection();
    }

    setupResizeObserver() {
      if (!this.gridElement) return;

      this.resizeObserver = new ResizeObserver(() => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.setupCanvas();
          this.scanTools();
          this.generateElegantConnections();
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

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.colorFlowNetwork = new GridSynchronizedNetworkElegant();
    });
  } else {
    window.colorFlowNetwork = new GridSynchronizedNetworkElegant();
  }

  // Debug helper
  window.debugColorFlow = function() {
    const net = window.colorFlowNetwork;
    if (!net) {
      console.log('❌ Network not initialized');
      return;
    }
    console.group('🎨 Color Flow v10.0 ELEGANT');
    console.log('Device:', net.isMobile ? 'Mobile 📱' : net.isTablet ? 'Tablet' : 'Desktop 🖥️');
    console.log('Style: Thread Lines (No Particles)');
    console.log('Line Width:', net.settings.lineWidth + 'px');
    console.log('Glow Width:', net.settings.glowWidth + 'px');
    console.log('Max Connections/Category:', net.settings.maxConnectionsPerCategory);
    console.log('Total Connections:', net.connections.length);
    console.log('Hovered:', net.hoveredCard ? net.hoveredCard.category : 'None');
    console.groupEnd();
  };

})();
