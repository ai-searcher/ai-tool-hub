// =========================================
// GRID SYNCHRONIZED NETWORK V8.0 FIXED
// Premium Edition - Bug Fixed
// - Realtime instant hover
// - HD crystal clear rendering
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
      this.canvasWidth = 0;
      this.canvasHeight = 0;
      this.isMobile = window.innerWidth < 768;

      // Ultra Glow Settings
      this.glowSettings = {
        baseOpacity: 0.5,
        glowOpacity: 0.35,
        lineWidth: 4,
        glowWidth: 18,
        hoverTransitionSpeed: 0.25,
        particleGlow: 30
      };

      // Particle System
      this.particleSettings = {
        count: 30,
        speed: 0.0025,
        size: 3.5,
        glow: 25,
        opacity: 0.95,
        easing: 0.12
      };

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

      // HD Rendering (angepasst)
      this.qualityMultiplier = 1.5; // 🔴 REDUZIERT von 2 auf 1.5 für bessere Performance

      this.activeConnections = new Map();

      this.init();
    }

    init() {
      console.log('🚀 GridSynchronizedNetwork v8.0 FIXED initialized');

      window.addEventListener('quantum:ready', () => {
        setTimeout(() => this.setup(), 50);
      });

      if (document.readyState === 'complete') {
        setTimeout(() => this.setup(), 100);
      }

      window.addEventListener('resize', () => this.handleResize());
    }

    setup() {
      console.log('🔧 Setup starting...');

      this.gridElement = document.getElementById('tool-grid');

      if (!this.gridElement) {
        console.warn('⚠️ Grid not found, retrying...');
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
      this.generateIntelligentConnections();
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
        console.log('✅ Canvas created');
      }

      const gridRect = this.gridElement.getBoundingClientRect();
      const parentRect = this.containerElement.getBoundingClientRect();

      // Store logical dimensions
      this.canvasWidth = gridRect.width;
      this.canvasHeight = gridRect.height;

      this.canvas.style.left = (gridRect.left - parentRect.left) + 'px';
      this.canvas.style.top = (gridRect.top - parentRect.top) + 'px';
      this.canvas.style.width = this.canvasWidth + 'px';
      this.canvas.style.height = this.canvasHeight + 'px';

      // HD RENDERING - Fixed scaling
      const hdRatio = window.devicePixelRatio * this.qualityMultiplier;
      this.canvas.width = this.canvasWidth * hdRatio;
      this.canvas.height = this.canvasHeight * hdRatio;

      this.ctx = this.canvas.getContext('2d', { 
        alpha: true,
        desynchronized: true,
        willReadFrequently: false
      });

      // WICHTIG: Scale NACH dem Kontext holen
      this.ctx.scale(hdRatio, hdRatio);

      // HD Antialiasing
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      console.log(`📐 Canvas: ${this.canvasWidth}x${this.canvasHeight}px @ ${hdRatio}x DPR`);
      console.log(`📐 Physical: ${this.canvas.width}x${this.canvas.height}px`);
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
      // Direct event listeners
      this.cards.forEach((card) => {
        card.element.addEventListener('mouseenter', () => {
          this.hoveredCard = card;
        });

        card.element.addEventListener('mouseleave', () => {
          if (this.hoveredCard === card) {
            this.hoveredCard = null;
          }
        });
      });

      // Fallback
      document.addEventListener('mousemove', (e) => {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const card = el?.closest('.card-square');

        if (card) {
          const cardData = this.cards.find(c => c.element === card);
          if (cardData) {
            this.hoveredCard = cardData;
          }
        } else {
          this.hoveredCard = null;
        }
      });

      console.log('✅ Hover detection ready');
    }

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

      // Layer 1: Same Category
      Object.entries(categoryGroups).forEach(([category, group]) => {
        if (group.length > 1) {
          // Sort by position
          group.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 100) {
              return a.x - b.x;
            }
            return a.y - b.y;
          });

          // Sequential connections
          for (let i = 0; i < group.length - 1; i++) {
            this.addConnection(group[i], group[i + 1], 'alternative', 1.0);
          }

          // Circular (optional)
          if (group.length > 3) {
            this.addConnection(group[0], group[group.length - 1], 'circular', 0.5);
          }
        }
      });

      // Layer 2: Proximity
      this.cards.forEach((card) => {
        const nearby = this.cards
          .filter(other => {
            if (other === card || other.category === card.category) return false;
            return this.getDistance(card, other) < 350;
          })
          .sort((a, b) => this.getDistance(card, a) - this.getDistance(card, b))
          .slice(0, 2);

        nearby.forEach(neighbor => {
          if (!this.connectionExists(card, neighbor)) {
            this.addConnection(card, neighbor, 'workflow', 0.8);
          }
        });
      });

      // Layer 3: Category Bridges
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

      console.log(`🧠 Generated ${this.connections.length} intelligent connections`);
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
            size: this.particleSettings.size * (0.7 + Math.random() * 0.6)
          });
        }
      });

      console.log(`✨ Initialized ${this.particles.length} particles`);
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
          this.glowSettings.hoverTransitionSpeed
        );

        this.activeConnections.set(conn, newState);
      });
    }

    drawGradientLine(from, to, connection, activeState) {
      const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);

      const fromColor = this.categoryColors[from.category] || this.categoryColors.other;
      const toColor = this.categoryColors[to.category] || this.categoryColors.other;

      const weight = connection.weight || 1;
      const opacity = this.lerp(0.25, 1.8, activeState) * weight;
      const baseOpacity = this.glowSettings.baseOpacity * opacity;
      const glowOpacity = this.glowSettings.glowOpacity * opacity;

      gradient.addColorStop(0, `rgba(${fromColor.r}, ${fromColor.g}, ${fromColor.b}, ${baseOpacity})`);
      gradient.addColorStop(0.5, `rgba(${Math.round((fromColor.r + toColor.r)/2)}, ${Math.round((fromColor.g + toColor.g)/2)}, ${Math.round((fromColor.b + toColor.b)/2)}, ${baseOpacity * 1.2})`);
      gradient.addColorStop(1, `rgba(${toColor.r}, ${toColor.g}, ${toColor.b}, ${baseOpacity})`);

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

      this.ctx.shadowBlur = glowWidth * 2.5;
      this.ctx.globalAlpha = glowOpacity;
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;

      this.ctx.shadowBlur = 0;
    }

    drawParticle(particle) {
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

      this.ctx.shadowBlur = this.glowSettings.particleGlow * this.lerp(0.4, 1.6, activeState);
      this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;

      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, particle.size * this.lerp(0.7, 1.4, activeState), 0, Math.PI * 2);
      this.ctx.fill();

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

      this.updateActiveStates();

      // 🔴 FIXED: Use logical dimensions for clear
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

      // Draw connections
      this.connections.forEach(conn => {
        const activeState = this.activeConnections.get(conn) || 1;
        this.drawGradientLine(conn.from, conn.to, conn, activeState);
      });

      // Draw particles
      this.particles.forEach(particle => {
        this.drawParticle(particle);
      });

      this.animationFrame = requestAnimationFrame((t) => this.animate(t));
    }

    startAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.lastTime = performance.now();
      console.log('🎬 Animation started');
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
    console.group('🚀 Color Flow v8.0 FIXED');
    console.log('Cards:', net.cards.length);
    console.log('Connections:', net.connections.length);
    console.log('Particles:', net.particles.length);
    console.log('Quality:', net.qualityMultiplier + 'x');
    console.log('Canvas Logical:', net.canvasWidth + 'x' + net.canvasHeight);
    console.log('Canvas Physical:', net.canvas.width + 'x' + net.canvas.height);
    console.log('Hovered:', net.hoveredCard ? net.hoveredCard.category : 'None');
    console.groupEnd();
  };

})();
