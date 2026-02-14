// =========================================
// GRID SYNCHRONIZED NETWORK V7.0 ULTRA
// Revolutionary Edition with:
// - Extreme Neon Glow (3x stronger)
// - Energy Particles (flowing through connections)
// - Hover Interactions (reactive network)
// - Gradient Lines (color transitions)
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
      this.isMobile = window.innerWidth < 768;

      // Ultra Glow Settings (3x stronger!)
      this.glowSettings = {
        baseOpacity: 0.45,        // 3x stronger than v6
        glowOpacity: 0.30,        // Extreme glow
        lineWidth: 3.5,           // Thicker base
        glowWidth: 15,            // Massive glow radius
        pulseAmplitude: 0.20,     // Dramatic pulse (20%)
        pulseSpeed: 0.0008,       // Slow, smooth pulse
        glowAlpha: 0.7,           // Strong glow alpha
        particleGlow: 25          // Particle glow radius
      };

      // Particle System
      this.particleSettings = {
        count: 40,                // Particles per connection
        speed: 0.003,             // Movement speed
        size: 3,                  // Particle size
        glow: 20,                 // Particle glow
        opacity: 0.9              // Particle opacity
      };

      // Category Colors (for gradients)
      this.categoryColors = {
        text: { r: 0, g: 243, b: 255 },      // Cyan
        image: { r: 236, g: 72, b: 153 },    // Pink
        code: { r: 139, g: 92, b: 246 },     // Purple
        video: { r: 239, g: 68, b: 68 },     // Red
        audio: { r: 34, g: 197, b: 94 },     // Green
        data: { r: 251, g: 191, b: 36 },     // Yellow
        other: { r: 148, g: 163, b: 184 }    // Gray
      };

      this.init();
    }

    init() {
      console.log('🚀 GridSynchronizedNetwork v7.0 ULTRA initialized');

      window.addEventListener('quantum:ready', () => {
        console.log('📡 Quantum ready event received');
        setTimeout(() => this.setup(), 50);
      });

      if (document.readyState === 'complete') {
        setTimeout(() => this.setup(), 100);
      }

      window.addEventListener('resize', () => this.handleResize());

      // Hover detection
      document.addEventListener('mouseover', (e) => this.handleHover(e));
      document.addEventListener('mouseout', (e) => this.handleHoverOut(e));
    }

    setup() {
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

      console.log('✅ Ultra Network initialized successfully!');
      console.log(\`📱 Mobile: \${this.isMobile}\`);
      console.log(\`🕸️ Connections: \${this.connections.length}\`);
      console.log(\`✨ Particles: \${this.particles.length}\`);
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

      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      console.log(\`📐 Canvas: \${gridRect.width}x\${gridRect.height}px\`);
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

      console.log(\`🎯 Scanned \${this.cards.length} cards\`);
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
            this.connections.push({
              from: group[i],
              to: group[i + 1],
              type: 'alternative',
              category: group[i].category
            });
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
            this.connections.push({
              from: card,
              to: neighbor,
              type: 'workflow',
              category: card.category
            });
          }
        });
      });

      console.log(\`🕸️ Generated \${this.connections.length} connections\`);
    }

    initParticles() {
      this.particles = [];

      this.connections.forEach((conn, connIndex) => {
        const particleCount = this.particleSettings.count;

        for (let i = 0; i < particleCount; i++) {
          this.particles.push({
            connection: conn,
            connectionIndex: connIndex,
            progress: i / particleCount,  // Distributed along line
            speed: this.particleSettings.speed * (0.8 + Math.random() * 0.4),
            size: this.particleSettings.size * (0.7 + Math.random() * 0.6),
            offset: Math.random() * Math.PI * 2  // For variation
          });
        }
      });

      console.log(\`✨ Initialized \${this.particles.length} particles\`);
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

    drawGradientLine(from, to, color, isActive) {
      const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);

      // Create color gradient
      const fromColor = this.categoryColors[from.category] || this.categoryColors.other;
      const toColor = this.categoryColors[to.category] || this.categoryColors.other;

      const activeMultiplier = isActive ? 1.5 : 0.3;
      const baseOpacity = this.glowSettings.baseOpacity * activeMultiplier;
      const glowOpacity = this.glowSettings.glowOpacity * activeMultiplier;

      // Gradient stops
      gradient.addColorStop(0, \`rgba(\${fromColor.r}, \${fromColor.g}, \${fromColor.b}, \${baseOpacity})\`);
      gradient.addColorStop(0.5, \`rgba(\${Math.round((fromColor.r + toColor.r)/2)}, \${Math.round((fromColor.g + toColor.g)/2)}, \${Math.round((fromColor.b + toColor.b)/2)}, \${baseOpacity * 1.2})\`);
      gradient.addColorStop(1, \`rgba(\${toColor.r}, \${toColor.g}, \${toColor.b}, \${baseOpacity})\`);

      // Ultra Glow
      const glowWidth = this.glowSettings.glowWidth * (isActive ? 1.5 : 1);
      this.ctx.shadowBlur = glowWidth;
      this.ctx.shadowColor = gradient;

      // Draw line
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = this.glowSettings.lineWidth * (isActive ? 1.3 : 1);
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

    drawParticle(particle, time) {
      const conn = particle.connection;
      const isActive = this.isConnectionActive(conn);

      if (!isActive && Math.random() > 0.3) return; // Skip some particles on inactive

      // Update position
      particle.progress += particle.speed;
      if (particle.progress > 1) particle.progress = 0;

      // Calculate position on line
      const x = conn.from.x + (conn.to.x - conn.from.x) * particle.progress;
      const y = conn.from.y + (conn.to.y - conn.from.y) * particle.progress;

      // Get color (interpolate between from and to)
      const fromColor = this.categoryColors[conn.from.category] || this.categoryColors.other;
      const toColor = this.categoryColors[conn.to.category] || this.categoryColors.other;

      const r = Math.round(fromColor.r + (toColor.r - fromColor.r) * particle.progress);
      const g = Math.round(fromColor.g + (toColor.g - fromColor.g) * particle.progress);
      const b = Math.round(fromColor.b + (toColor.b - fromColor.b) * particle.progress);

      const activeMultiplier = isActive ? 2 : 0.5;
      const opacity = this.particleSettings.opacity * activeMultiplier;

      // Ultra Glow for particles
      this.ctx.shadowBlur = this.glowSettings.particleGlow * activeMultiplier;
      this.ctx.shadowColor = \`rgba(\${r}, \${g}, \${b}, \${opacity})\`;

      // Draw particle
      this.ctx.fillStyle = \`rgba(\${r}, \${g}, \${b}, \${opacity})\`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, particle.size * (isActive ? 1.5 : 1), 0, Math.PI * 2);
      this.ctx.fill();

      // Extra glow
      this.ctx.shadowBlur = this.glowSettings.particleGlow * 2 * activeMultiplier;
      this.ctx.globalAlpha = 0.5;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;

      this.ctx.shadowBlur = 0;
    }

    animate(time) {
      if (!this.ctx || !this.canvas) return;

      // Clear
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw connections with gradients
      this.connections.forEach(conn => {
        const isActive = this.isConnectionActive(conn);
        this.drawGradientLine(conn.from, conn.to, conn.category, isActive);
      });

      // Draw particles
      this.particles.forEach(particle => {
        this.drawParticle(particle, time);
      });

      this.animationFrame = requestAnimationFrame((t) => this.animate(t));
    }

    startAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.animate(0);
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
    console.group('🎨 Color Flow Ultra Stats');
    console.log('Cards:', net.cards.length);
    console.log('Connections:', net.connections.length);
    console.log('Particles:', net.particles.length);
    console.log('Canvas:', net.canvas ? \`\${net.canvas.width}x\${net.canvas.height}\` : 'Not created');
    console.log('Mobile:', net.isMobile);
    console.log('Hovered:', net.hoveredCard ? 'Yes' : 'No');
    console.groupEnd();
  };

})();
