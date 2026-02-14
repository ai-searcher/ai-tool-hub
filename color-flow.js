// =========================================
// GRID SYNCHRONIZED NETWORK V8.0 ULTRA
// Premium Edition:
// - Realtime instant hover
// - 4K crystal clear rendering
// - Intelligent connection algorithm
// =========================================

(function() {
  'use strict';

  class GridSynchronizedNetworkUltra {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.gridElement = null;
      this.containerElement = null;
      this.cards = [];
      this.connections = [];
      this.particles = [];
      this.animationFrame = null;
      this.resizeObserver = null;
      this.hoveredCard = null;
      this.lastTime = 0;
      this.isMobile = window.innerWidth < 768;

      // Ultra Glow Settings - INSTANT RESPONSE
      this.glowSettings = {
        baseOpacity: 0.5,           // Höher für bessere Sichtbarkeit
        glowOpacity: 0.35,
        lineWidth: 4,               // Dicker für HD
        glowWidth: 18,              // Größer für HD
        hoverTransitionSpeed: 0.25, // 🔴 4x schneller! (war 0.08)
        particleGlow: 30
      };

      // Particle System - HD
      this.particleSettings = {
        count: 30,
        speed: 0.0025,
        size: 3.5,                  // Größer für HD
        glow: 25,
        opacity: 0.95,
        easing: 0.12                // 🔴 Schneller! (war 0.05)
      };

      // Category Colors - Enhanced
      this.categoryColors = {
        text: { r: 0, g: 243, b: 255 },
        image: { r: 236, g: 72, b: 153 },
        code: { r: 139, g: 92, b: 246 },
        video: { r: 239, g: 68, b: 68 },
        audio: { r: 34, g: 197, b: 94 },
        data: { r: 251, g: 191, b: 36 },
        other: { r: 148, g: 163, b: 184 }
      };

      // HD Rendering
      this.qualityMultiplier = 2; // 🔴 2x Resolution für HD!

      this.activeConnections = new Map();

      this.init();
    }

    init() {
      console.log('🚀 GridSynchronizedNetwork v8.0 ULTRA Premium initialized');

      window.addEventListener('quantum:ready', () => {
        setTimeout(() => this.setup(), 50);
      });

      if (document.readyState === 'complete') {
        setTimeout(() => this.setup(), 100);
      }

      window.addEventListener('resize', () => this.handleResize());
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
      this.generateIntelligentConnections(); // 🔴 Intelligenter Algorithmus!
      this.initParticles();
      this.setupHoverDetection();
      this.startAnimation();
      this.setupResizeObserver();

      console.log('✅ Ultra Premium Network initialized!');
      console.log(`🕸️ Intelligent Connections: ${this.connections.length}`);
      console.log(`✨ HD Particles: ${this.particles.length}`);
      console.log(`🎨 Quality: ${this.qualityMultiplier}x`);
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

      this.canvas.style.left = (gridRect.left - parentRect.left) + 'px';
      this.canvas.style.top = (gridRect.top - parentRect.top) + 'px';
      this.canvas.style.width = gridRect.width + 'px';
      this.canvas.style.height = gridRect.height + 'px';

      // 🔴 HD RENDERING - 2x devicePixelRatio für crystal clear
      const hdRatio = window.devicePixelRatio * this.qualityMultiplier;
      this.canvas.width = gridRect.width * hdRatio;
      this.canvas.height = gridRect.height * hdRatio;

      this.ctx = this.canvas.getContext('2d', { 
        alpha: true,
        desynchronized: true,
        willReadFrequently: false // Performance
      });
      this.ctx.scale(hdRatio, hdRatio);

      // 🔴 HD Antialiasing
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      console.log(`📐 Canvas HD: ${gridRect.width}x${gridRect.height}px @ ${hdRatio}x`);
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

      console.log(`🎯 Scanned ${this.cards.length} cards`);
    }

    setupHoverDetection() {
      // Direct event listeners for instant response
      this.cards.forEach((card) => {
        const el = card.element;

        el.addEventListener('mouseenter', () => {
          this.hoveredCard = card;
        });

        el.addEventListener('mouseleave', () => {
          if (this.hoveredCard === card) {
            this.hoveredCard = null;
          }
        });
      });

      // Fallback
      document.addEventListener('mousemove', (e) => {
        const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
        const card = hoveredElement?.closest('.card-square');

        if (card) {
          const cardData = this.cards.find(c => c.element === card);
          if (cardData) {
            this.hoveredCard = cardData;
          }
        } else {
          this.hoveredCard = null;
        }
      });
    }

    // 🧠 INTELLIGENT CONNECTION ALGORITHM
    generateIntelligentConnections() {
      this.connections = [];
      const categoryGroups = {};

      // Group by category
      this.cards.forEach(card => {
        if (!categoryGroups[card.category]) {
          categoryGroups[card.category] = [];
        }
        categoryGroups[card.category].push(card);
      });

      // 1. SAME CATEGORY CONNECTIONS (strong relationships)
      Object.entries(categoryGroups).forEach(([category, group]) => {
        if (group.length > 1) {
          // Smart sorting: by position (left to right, top to bottom)
          group.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 100) {
              return a.x - b.x; // Same row: sort by x
            }
            return a.y - b.y; // Different rows: sort by y
          });

          // Connect sequential items
          for (let i = 0; i < group.length - 1; i++) {
            this.addConnection(group[i], group[i + 1], 'alternative', 1.0);
          }

          // Connect first and last (circular)
          if (group.length > 3) {
            this.addConnection(group[0], group[group.length - 1], 'circular', 0.5);
          }
        }
      });

      // 2. SMART PROXIMITY CONNECTIONS (workflow relationships)
      this.cards.forEach((card) => {
        // Find nearby cards from different categories
        const nearbyDifferent = this.cards
          .filter(other => {
            if (other === card || other.category === card.category) return false;
            const distance = this.getDistance(card, other);
            return distance < 350;
          })
          .sort((a, b) => this.getDistance(card, a) - this.getDistance(card, b))
          .slice(0, 2); // Top 2 closest

        nearbyDifferent.forEach(neighbor => {
          if (!this.connectionExists(card, neighbor)) {
            this.addConnection(card, neighbor, 'workflow', 0.8);
          }
        });
      });

      // 3. CATEGORY BRIDGES (connect different category groups)
      const categories = Object.keys(categoryGroups);
      categories.forEach((catA, i) => {
        categories.slice(i + 1).forEach(catB => {
          const groupA = categoryGroups[catA];
          const groupB = categoryGroups[catB];

          // Find closest pair between categories
          let minDist = Infinity;
          let closestPair = null;

          groupA.forEach(cardA => {
            groupB.forEach(cardB => {
              const dist = this.getDistance(cardA, cardB);
              if (dist < minDist && dist < 400) {
                minDist = dist;
                closestPair = [cardA, cardB];
              }
            });
          });

          if (closestPair && !this.connectionExists(closestPair[0], closestPair[1])) {
            this.addConnection(closestPair[0], closestPair[1], 'bridge', 0.6);
          }
        });
      });

      console.log(`🧠 Intelligent connections generated: ${this.connections.length}`);
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
        activeState: 1
      };
      this.connections.push(conn);
      this.activeConnections.set(conn, 1);
    }

    initParticles() {
      this.particles = [];

      this.connections.forEach((conn) => {
        const particleCount = Math.round(this.particleSettings.count * conn.weight);

        for (let i = 0; i < particleCount; i++) {
          this.particles.push({
            connection: conn,
            progress: i / particleCount,
            targetProgress: i / particleCount,
            speed: this.particleSettings.speed * (0.8 + Math.random() * 0.4) * conn.weight,
            size: this.particleSettings.size * (0.7 + Math.random() * 0.6),
            offset: Math.random() * Math.PI * 2
          });
        }
      });

      console.log(`✨ HD Particles initialized: ${this.particles.length}`);
    }

    isConnectionActive(connection) {
      if (!this.hoveredCard) return true;
      return connection.from === this.hoveredCard || connection.to === this.hoveredCard;
    }

    lerp(start, end, t) {
      return start + (end - start) * t;
    }

    updateActiveStates(deltaTime) {
      // 🔴 INSTANT HOVER - Schnellere Transitions
      this.connections.forEach(conn => {
        const isActive = this.isConnectionActive(conn);
        const targetState = isActive ? 1 : 0.25; // 0.25 statt 0.3 = dimmer
        const currentState = this.activeConnections.get(conn) || 1;

        // Schnellere Interpolation
        const newState = this.lerp(
          currentState, 
          targetState, 
          this.glowSettings.hoverTransitionSpeed
        );

        this.activeConnections.set(conn, newState);
      });
    }

    drawGradientLine(from, to, connection, activeState) {
      const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);

      const fromColor = this.categoryColors[from.category] || this.categoryColors.other;
      const toColor = this.categoryColors[to.category] || this.categoryColors.other;

      // Weight-based opacity
      const weight = connection.weight || 1;
      const opacity = this.lerp(0.25, 1.8, activeState) * weight;
      const baseOpacity = this.glowSettings.baseOpacity * opacity;
      const glowOpacity = this.glowSettings.glowOpacity * opacity;

      gradient.addColorStop(0, `rgba(${fromColor.r}, ${fromColor.g}, ${fromColor.b}, ${baseOpacity})`);
      gradient.addColorStop(0.5, `rgba(${Math.round((fromColor.r + toColor.r)/2)}, ${Math.round((fromColor.g + toColor.g)/2)}, ${Math.round((fromColor.b + toColor.b)/2)}, ${baseOpacity * 1.2})`);
      gradient.addColorStop(1, `rgba(${toColor.r}, ${toColor.g}, ${toColor.b}, ${baseOpacity})`);

      // HD Line rendering
      const glowWidth = this.glowSettings.glowWidth * this.lerp(0.5, 1.3, activeState);
      this.ctx.shadowBlur = glowWidth;
      this.ctx.shadowColor = gradient;

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = this.glowSettings.lineWidth * this.lerp(0.7, 1.3, activeState) * weight;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.lineTo(to.x, to.y);
      this.ctx.stroke();

      // Extra HD glow layer
      this.ctx.shadowBlur = glowWidth * 2.5;
      this.ctx.globalAlpha = glowOpacity;
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;

      this.ctx.shadowBlur = 0;
    }

    drawParticle(particle, time, deltaTime) {
      const conn = particle.connection;
      const activeState = this.activeConnections.get(conn) || 1;

      if (activeState < 0.4 && Math.random() > activeState) return;

      particle.targetProgress += particle.speed;
      if (particle.targetProgress > 1) particle.targetProgress = 0;

      particle.progress = this.lerp(
        particle.progress, 
        particle.targetProgress, 
        this.particleSettings.easing
      );

      const x = conn.from.x + (conn.to.x - conn.from.x) * particle.progress;
      const y = conn.from.y + (conn.to.y - conn.from.y) * particle.progress;

      const fromColor = this.categoryColors[conn.from.category] || this.categoryColors.other;
      const toColor = this.categoryColors[conn.to.category] || this.categoryColors.other;

      const r = Math.round(fromColor.r + (toColor.r - fromColor.r) * particle.progress);
      const g = Math.round(fromColor.g + (toColor.g - fromColor.g) * particle.progress);
      const b = Math.round(fromColor.b + (toColor.b - fromColor.b) * particle.progress);

      const opacity = this.particleSettings.opacity * this.lerp(0.3, 1.3, activeState);

      // HD Particle rendering
      this.ctx.shadowBlur = this.glowSettings.particleGlow * this.lerp(0.4, 1.6, activeState);
      this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;

      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, particle.size * this.lerp(0.7, 1.4, activeState), 0, Math.PI * 2);
      this.ctx.fill();

      // Extra glow
      this.ctx.shadowBlur = this.glowSettings.particleGlow * 2.5 * activeState;
      this.ctx.globalAlpha = 0.6 * activeState;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;

      this.ctx.shadowBlur = 0;
    }

    animate(time) {
      if (!this.ctx || !this.canvas) return;

      const deltaTime = time - this.lastTime;
      this.lastTime = time;

      this.updateActiveStates(deltaTime);

      // HD Clear
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw connections
      this.connections.forEach(conn => {
        const activeState = this.activeConnections.get(conn) || 1;
        this.drawGradientLine(conn.from, conn.to, conn, activeState);
      });

      // Draw particles
      this.particles.forEach(particle => {
        this.drawParticle(particle, time, deltaTime);
      });

      this.animationFrame = requestAnimationFrame((t) => this.animate(t));
    }

    startAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.lastTime = performance.now();
      this.animate(this.lastTime);
    }

    handleResize() {
      this.isMobile = window.innerWidth < 768;
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.setupCanvas();
        this.scanTools();
        this.generateIntelligentConnections();
        this.initParticles();
        this.setupHoverDetection();
      }, 250);
    }

    setupResizeObserver() {
      if (!this.gridElement) return;

      this.resizeObserver = new ResizeObserver(() => {
        this.setupCanvas();
        this.scanTools();
        this.generateIntelligentConnections();
        this.initParticles();
        this.setupHoverDetection();
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
      window.colorFlowNetwork = new GridSynchronizedNetworkUltra();
    });
  } else {
    window.colorFlowNetwork = new GridSynchronizedNetworkUltra();
  }

  // Debug helper
  window.debugColorFlow = function() {
    const net = window.colorFlowNetwork;
    if (!net) {
      console.log('❌ Network not initialized');
      return;
    }
    console.group('🚀 Color Flow Ultra Premium v8.0');
    console.log('Cards:', net.cards.length);
    console.log('Intelligent Connections:', net.connections.length);
    console.log('HD Particles:', net.particles.length);
    console.log('Quality Multiplier:', net.qualityMultiplier + 'x');
    console.log('Canvas Resolution:', net.canvas.width + 'x' + net.canvas.height);
    console.log('Hovered:', net.hoveredCard ? net.hoveredCard.category : 'None');
    console.groupEnd();
  };

})();
