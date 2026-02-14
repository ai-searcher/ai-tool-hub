// =========================================
// GRID SYNCHRONIZED NETWORK V7.1 FLUID
// Ultra-Smooth Fluid Edition
// - Silky smooth 60fps animations
// - Easing transitions
// - Optimized performance
// - Fluid particle flow
// =========================================

(function() {
  'use strict';

  class GridSynchronizedNetworkFluid {
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
      this.hoverProgress = 0; // Smooth hover transition
      this.lastTime = 0;
      this.isMobile = window.innerWidth < 768;

      // Ultra Glow Settings (optimiert für smooth)
      this.glowSettings = {
        baseOpacity: 0.45,
        glowOpacity: 0.30,
        lineWidth: 3.5,
        glowWidth: 15,
        hoverTransitionSpeed: 0.08, // Smooth hover transition
        particleGlow: 25
      };

      // Optimized Particle System (weniger für Performance)
      this.particleSettings = {
        count: 25,           // Reduziert von 40 → smooth
        speed: 0.002,        // Langsamer = flüssiger
        size: 3,
        glow: 20,
        opacity: 0.9,
        easing: 0.05         // Smooth movement
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

      // Hover state tracking
      this.activeConnections = new Map(); // Smooth active state per connection

      this.init();
    }

    init() {
      console.log('🌊 GridSynchronizedNetwork v7.1 FLUID initialized');

      window.addEventListener('quantum:ready', () => {
        console.log('📡 Quantum ready event received');
        setTimeout(() => this.setup(), 50);
      });

      if (document.readyState === 'complete') {
        setTimeout(() => this.setup(), 100);
      }

      window.addEventListener('resize', () => this.handleResize());

      document.addEventListener('mouseover', (e) => this.handleHover(e));
      document.addEventListener('mouseout', (e) => this.handleHoverOut(e));
    }

    setup() {
      console.log('🔧 Setup starting...');

      this.gridElement = document.getElementById('tool-grid');

      if (!this.gridElement) {
        console.warn('⚠️ Grid element not found, retrying...');
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
      this.generateConnections();
      this.initParticles();
      this.startAnimation();
      this.setupResizeObserver();

      console.log('✅ Fluid Network initialized!');
      console.log(`🕸️ Connections: ${this.connections.length}`);
      console.log(`✨ Particles: ${this.particles.length}`);
    }

    setupCanvas() {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'connection-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '0';
        this.containerElement.insertBefore(this.canvas, this.gridElement);
      }

      const gridRect = this.gridElement.getBoundingClientRect();
      const parentRect = this.containerElement.getBoundingClientRect();

      this.canvas.style.left = (gridRect.left - parentRect.left) + 'px';
      this.canvas.style.top = (gridRect.top - parentRect.top) + 'px';
      this.canvas.style.width = gridRect.width + 'px';
      this.canvas.style.height = gridRect.height + 'px';

      this.canvas.width = gridRect.width * window.devicePixelRatio;
      this.canvas.height = gridRect.height * window.devicePixelRatio;

      this.ctx = this.canvas.getContext('2d', { 
        alpha: true,
        desynchronized: true // Performance boost
      });
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      console.log(`📐 Canvas: ${gridRect.width}x${gridRect.height}px`);
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

    generateConnections() {
      this.connections = [];

      // Same category connections
      const categoryGroups = {};
      this.cards.forEach(card => {
        if (!categoryGroups[card.category]) {
          categoryGroups[card.category] = [];
        }
        categoryGroups[card.category].push(card);
      });

      Object.values(categoryGroups).forEach(group => {
        if (group.length > 1) {
          for (let i = 0; i < group.length - 1; i++) {
            const conn = {
              from: group[i],
              to: group[i + 1],
              type: 'alternative',
              category: group[i].category,
              activeState: 1 // Start full active
            };
            this.connections.push(conn);
            this.activeConnections.set(conn, 1);
          }
        }
      });

      // Neighbor connections
      this.cards.forEach((card, i) => {
        const neighbors = this.cards.filter(other => {
          if (other === card) return false;
          const dx = Math.abs(other.x - card.x);
          const dy = Math.abs(other.y - card.y);
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < 400 && distance > 50;
        });

        neighbors.slice(0, 2).forEach(neighbor => {
          if (!this.connections.some(c => 
            (c.from === card && c.to === neighbor) ||
            (c.from === neighbor && c.to === card)
          )) {
            const conn = {
              from: card,
              to: neighbor,
              type: 'workflow',
              category: card.category,
              activeState: 1
            };
            this.connections.push(conn);
            this.activeConnections.set(conn, 1);
          }
        });
      });

      console.log(`🕸️ Generated ${this.connections.length} connections`);
    }

    initParticles() {
      this.particles = [];

      this.connections.forEach((conn, connIndex) => {
        const particleCount = this.particleSettings.count;

        for (let i = 0; i < particleCount; i++) {
          this.particles.push({
            connection: conn,
            connectionIndex: connIndex,
            progress: i / particleCount,
            targetProgress: i / particleCount,
            speed: this.particleSettings.speed * (0.8 + Math.random() * 0.4),
            size: this.particleSettings.size * (0.7 + Math.random() * 0.6),
            offset: Math.random() * Math.PI * 2
          });
        }
      });

      console.log(`✨ Initialized ${this.particles.length} particles`);
    }

    handleHover(e) {
      const card = e.target.closest('.card-square');
      if (card && card !== this.hoveredCard) {
        this.hoveredCard = card;
      }
    }

    handleHoverOut(e) {
      const card = e.target.closest('.card-square');
      if (card === this.hoveredCard) {
        this.hoveredCard = null;
      }
    }

    isConnectionActive(connection) {
      if (!this.hoveredCard) return true;

      const hoveredCardData = this.cards.find(c => c.element === this.hoveredCard);
      if (!hoveredCardData) return true;

      return connection.from === hoveredCardData || connection.to === hoveredCardData;
    }

    // Smooth easing function
    easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Lerp (linear interpolation)
    lerp(start, end, t) {
      return start + (end - start) * t;
    }

    updateActiveStates(deltaTime) {
      // Smooth transitions for all connections
      this.connections.forEach(conn => {
        const isActive = this.isConnectionActive(conn);
        const targetState = isActive ? 1 : 0.3;
        const currentState = this.activeConnections.get(conn) || 1;

        // Smooth lerp to target state
        const newState = this.lerp(
          currentState, 
          targetState, 
          this.glowSettings.hoverTransitionSpeed
        );

        this.activeConnections.set(conn, newState);
      });
    }

    drawGradientLine(from, to, color, activeState) {
      const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);

      const fromColor = this.categoryColors[from.category] || this.categoryColors.other;
      const toColor = this.categoryColors[to.category] || this.categoryColors.other;

      // Use smooth activeState (0.3 to 1.5)
      const opacity = this.lerp(0.3, 1.5, activeState);
      const baseOpacity = this.glowSettings.baseOpacity * opacity;
      const glowOpacity = this.glowSettings.glowOpacity * opacity;

      gradient.addColorStop(0, `rgba(${fromColor.r}, ${fromColor.g}, ${fromColor.b}, ${baseOpacity})`);
      gradient.addColorStop(0.5, `rgba(${Math.round((fromColor.r + toColor.r)/2)}, ${Math.round((fromColor.g + toColor.g)/2)}, ${Math.round((fromColor.b + toColor.b)/2)}, ${baseOpacity * 1.2})`);
      gradient.addColorStop(1, `rgba(${toColor.r}, ${toColor.g}, ${toColor.b}, ${baseOpacity})`);

      const glowWidth = this.glowSettings.glowWidth * this.lerp(0.6, 1.2, activeState);
      this.ctx.shadowBlur = glowWidth;
      this.ctx.shadowColor = gradient;

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = this.glowSettings.lineWidth * this.lerp(0.8, 1.2, activeState);
      this.ctx.lineCap = 'round';

      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.lineTo(to.x, to.y);
      this.ctx.stroke();

      // Extra glow layer
      this.ctx.shadowBlur = glowWidth * 2;
      this.ctx.globalAlpha = glowOpacity;
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;

      this.ctx.shadowBlur = 0;
    }

    drawParticle(particle, time, deltaTime) {
      const conn = particle.connection;
      const activeState = this.activeConnections.get(conn) || 1;

      // Skip some particles when inactive (smooth culling)
      if (activeState < 0.5 && Math.random() > activeState) return;

      // Smooth progress update with easing
      particle.targetProgress += particle.speed;
      if (particle.targetProgress > 1) particle.targetProgress = 0;

      // Smooth interpolation to target
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

      const opacity = this.particleSettings.opacity * this.lerp(0.4, 1.2, activeState);

      this.ctx.shadowBlur = this.glowSettings.particleGlow * this.lerp(0.5, 1.5, activeState);
      this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;

      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, particle.size * this.lerp(0.8, 1.3, activeState), 0, Math.PI * 2);
      this.ctx.fill();

      // Extra glow
      this.ctx.shadowBlur = this.glowSettings.particleGlow * 2 * activeState;
      this.ctx.globalAlpha = 0.5 * activeState;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;

      this.ctx.shadowBlur = 0;
    }

    animate(time) {
      if (!this.ctx || !this.canvas) return;

      // Calculate delta time for smooth animations
      const deltaTime = time - this.lastTime;
      this.lastTime = time;

      // Update active states (smooth transitions)
      this.updateActiveStates(deltaTime);

      // Clear with alpha for smooth trails (optional)
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw connections with smooth active states
      this.connections.forEach(conn => {
        const activeState = this.activeConnections.get(conn) || 1;
        this.drawGradientLine(conn.from, conn.to, conn.category, activeState);
      });

      // Draw particles with smooth movement
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
      console.log('🎬 Fluid animation started');
      this.animate(this.lastTime);
    }

    handleResize() {
      this.isMobile = window.innerWidth < 768;
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.setupCanvas();
        this.scanTools();
        this.generateConnections();
        this.initParticles();
      }, 250);
    }

    setupResizeObserver() {
      if (!this.gridElement) return;

      this.resizeObserver = new ResizeObserver(() => {
        this.setupCanvas();
        this.scanTools();
        this.generateConnections();
        this.initParticles();
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
      window.colorFlowNetwork = new GridSynchronizedNetworkFluid();
    });
  } else {
    window.colorFlowNetwork = new GridSynchronizedNetworkFluid();
  }

  // Debug helper
  window.debugColorFlow = function() {
    const net = window.colorFlowNetwork;
    if (!net) {
      console.log('❌ Network not initialized');
      return;
    }
    console.group('🌊 Color Flow Fluid Stats');
    console.log('Cards:', net.cards.length);
    console.log('Connections:', net.connections.length);
    console.log('Particles:', net.particles.length);
    console.log('Canvas:', net.canvas ? `${net.canvas.width}x${net.canvas.height}` : 'Not created');
    console.log('Animation running:', net.animationFrame ? 'Yes' : 'No');
    console.log('FPS:', Math.round(1000 / (performance.now() - net.lastTime)));
    console.groupEnd();
  };

})();
