// =========================================
// GRID SYNCHRONIZED NETWORK V9.0 MOBILE ULTRA
// Maximum Performance & Efficiency Edition
// - Adaptive quality based on device
// - Battery-aware rendering
// - Touch-optimized
// - Memory efficient
// - FPS-adaptive
// =========================================

(function() {
  'use strict';

  class GridSynchronizedNetworkMobile {
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
      this.intersectionObserver = null;
      this.hoveredCard = null;
      this.lastTime = 0;
      this.canvasWidth = 0;
      this.canvasHeight = 0;
      this.isVisible = true;
      this.isLowPowerMode = false;
      this.currentFPS = 60;
      this.frameCount = 0;
      this.lastFPSCheck = 0;

      // Device Detection
      this.isMobile = this.detectMobile();
      this.isTablet = this.detectTablet();
      this.supportsTouch = 'ontouchstart' in window;

      // Adaptive Settings based on device
      this.setupAdaptiveSettings();

      this.activeConnections = new Map();

      this.init();
    }

    detectMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth < 768;
    }

    detectTablet() {
      return /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768 && window.innerWidth < 1024;
    }

    setupAdaptiveSettings() {
      // Base settings for desktop
      let baseSettings = {
        qualityMultiplier: 1.5,
        particleCount: 30,
        glowWidth: 18,
        lineWidth: 4,
        particleSize: 3.5,
        hoverSpeed: 0.25,
        particleEasing: 0.12,
        connectionDistance: 350,
        bridgeDistance: 400,
        maxConnections: 2,
        enableCircular: true,
        enableBridges: true,
        baseOpacity: 0.5,
        glowOpacity: 0.35
      };

      // Mobile optimizations
      if (this.isMobile) {
        baseSettings = {
          qualityMultiplier: 1.0,      // 🔴 No HD on mobile
          particleCount: 15,           // 🔴 50% fewer particles
          glowWidth: 12,               // 🔴 Smaller glow
          lineWidth: 3,                // 🔴 Thinner lines
          particleSize: 2.5,           // 🔴 Smaller particles
          hoverSpeed: 0.35,            // 🔴 Faster (less frames)
          particleEasing: 0.15,        // 🔴 Faster
          connectionDistance: 300,     // 🔴 Shorter distance
          bridgeDistance: 350,         // 🔴 Shorter distance
          maxConnections: 1,           // 🔴 Only 1 connection
          enableCircular: false,       // 🔴 Disable circular
          enableBridges: false,        // 🔴 Disable bridges
          baseOpacity: 0.45,
          glowOpacity: 0.30
        };
      }

      // Tablet optimizations (middle ground)
      if (this.isTablet) {
        baseSettings.qualityMultiplier = 1.2;
        baseSettings.particleCount = 20;
        baseSettings.maxConnections = 2;
        baseSettings.enableCircular = false;
        baseSettings.enableBridges = true;
      }

      // Apply settings
      this.settings = baseSettings;

      // Glow Settings
      this.glowSettings = {
        baseOpacity: this.settings.baseOpacity,
        glowOpacity: this.settings.glowOpacity,
        lineWidth: this.settings.lineWidth,
        glowWidth: this.settings.glowWidth,
        hoverTransitionSpeed: this.settings.hoverSpeed,
        particleGlow: this.settings.glowWidth * 1.5
      };

      // Particle Settings
      this.particleSettings = {
        count: this.settings.particleCount,
        speed: 0.0025,
        size: this.settings.particleSize,
        opacity: 0.95,
        easing: this.settings.particleEasing
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

      console.log(`📱 Device: ${this.isMobile ? 'Mobile' : this.isTablet ? 'Tablet' : 'Desktop'}`);
      console.log(`⚙️ Quality: ${this.settings.qualityMultiplier}x`);
      console.log(`✨ Particles: ${this.settings.particleCount} per connection`);
    }

    init() {
      console.log('🚀 GridSynchronizedNetwork v9.0 MOBILE ULTRA');

      // Battery API
      this.setupBatteryAPI();

      // Visibility API (pause when hidden)
      this.setupVisibilityAPI();

      window.addEventListener('quantum:ready', () => {
        setTimeout(() => this.setup(), 50);
      });

      if (document.readyState === 'complete') {
        setTimeout(() => this.setup(), 100);
      }

      // Debounced resize
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.handleResize(), 300);
      }, { passive: true });
    }

    setupBatteryAPI() {
      if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
          this.updateBatteryStatus(battery);
          battery.addEventListener('chargingchange', () => this.updateBatteryStatus(battery));
          battery.addEventListener('levelchange', () => this.updateBatteryStatus(battery));
        });
      }
    }

    updateBatteryStatus(battery) {
      // Enable low power mode if battery < 20% and not charging
      const wasLowPower = this.isLowPowerMode;
      this.isLowPowerMode = !battery.charging && battery.level < 0.2;

      if (this.isLowPowerMode !== wasLowPower) {
        console.log(`🔋 Low Power Mode: ${this.isLowPowerMode ? 'ON' : 'OFF'}`);

        if (this.isLowPowerMode) {
          // Reduce quality further
          this.particleSettings.count = Math.max(5, this.particleSettings.count / 2);
          this.glowSettings.glowWidth *= 0.7;
        }
      }
    }

    setupVisibilityAPI() {
      document.addEventListener('visibilitychange', () => {
        this.isVisible = !document.hidden;

        if (!this.isVisible) {
          console.log('👁️ Page hidden - pausing animation');
          if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
          }
        } else {
          console.log('👁️ Page visible - resuming animation');
          this.startAnimation();
        }
      }, { passive: true });
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
      this.generateIntelligentConnections();
      this.initParticles();
      this.setupInputDetection();
      this.setupIntersectionObserver();
      this.startAnimation();
      this.setupResizeObserver();

      console.log('✅ Mobile Ultra initialized!');
      console.log(`🕸️ Connections: ${this.connections.length}`);
      console.log(`✨ Particles: ${this.particles.length}`);
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

      // Adaptive quality
      const dpr = window.devicePixelRatio || 1;
      const effectiveDPR = Math.min(dpr, 2); // Cap at 2x for performance
      const hdRatio = effectiveDPR * this.settings.qualityMultiplier;

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

      console.log(`📐 Canvas: ${this.canvasWidth}x${this.canvasHeight} @ ${hdRatio}x`);
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
      if (this.supportsTouch) {
        // Touch events for mobile
        this.cards.forEach((card) => {
          card.element.addEventListener('touchstart', () => {
            this.hoveredCard = card;
          }, { passive: true });

          card.element.addEventListener('touchend', () => {
            setTimeout(() => {
              if (this.hoveredCard === card) {
                this.hoveredCard = null;
              }
            }, 500); // Keep highlight for 500ms
          }, { passive: true });
        });
      } else {
        // Mouse events for desktop
        this.cards.forEach((card) => {
          card.element.addEventListener('mouseenter', () => {
            this.hoveredCard = card;
          }, { passive: true });

          card.element.addEventListener('mouseleave', () => {
            if (this.hoveredCard === card) {
              this.hoveredCard = null;
            }
          }, { passive: true });
        });
      }
    }

    setupIntersectionObserver() {
      // Pause animation when canvas is not visible
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const wasVisible = this.isVisible;
          this.isVisible = entry.isIntersecting;

          if (!wasVisible && this.isVisible) {
            this.startAnimation();
          } else if (wasVisible && !this.isVisible) {
            if (this.animationFrame) {
              cancelAnimationFrame(this.animationFrame);
              this.animationFrame = null;
            }
          }
        });
      }, { threshold: 0.1 });

      this.intersectionObserver.observe(this.canvas);
    }

    generateIntelligentConnections() {
      this.connections = [];
      const categoryGroups = {};

      this.cards.forEach(card => {
        if (!categoryGroups[card.category]) {
          categoryGroups[card.category] = [];
        }
        categoryGroups[card.category].push(card);
      });

      // Layer 1: Same Category
      Object.entries(categoryGroups).forEach(([category, group]) => {
        if (group.length > 1) {
          group.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 100) {
              return a.x - b.x;
            }
            return a.y - b.y;
          });

          for (let i = 0; i < group.length - 1; i++) {
            this.addConnection(group[i], group[i + 1], 'alternative', 1.0);
          }

          // Circular only if enabled
          if (this.settings.enableCircular && group.length > 3) {
            this.addConnection(group[0], group[group.length - 1], 'circular', 0.5);
          }
        }
      });

      // Layer 2: Proximity
      this.cards.forEach((card) => {
        const nearby = this.cards
          .filter(other => {
            if (other === card || other.category === card.category) return false;
            return this.getDistance(card, other) < this.settings.connectionDistance;
          })
          .sort((a, b) => this.getDistance(card, a) - this.getDistance(card, b))
          .slice(0, this.settings.maxConnections);

        nearby.forEach(neighbor => {
          if (!this.connectionExists(card, neighbor)) {
            this.addConnection(card, neighbor, 'workflow', 0.8);
          }
        });
      });

      // Layer 3: Bridges (if enabled)
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
                if (dist < minDist && dist < this.settings.bridgeDistance) {
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
      }

      console.log(`🧠 Connections: ${this.connections.length}`);
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

      console.log(`✨ Particles: ${this.particles.length}`);
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

      // Skip extra glow on low power mode
      if (!this.isLowPowerMode) {
        this.ctx.shadowBlur = glowWidth * 2.5;
        this.ctx.globalAlpha = glowOpacity;
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
      }

      this.ctx.shadowBlur = 0;
    }

    drawParticle(particle) {
      const conn = particle.connection;
      const activeState = this.activeConnections.get(conn) || 1;

      // Aggressive culling on low power
      if (this.isLowPowerMode && activeState < 0.5) return;
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

      // Skip extra glow on mobile/low power
      if (!this.isMobile && !this.isLowPowerMode) {
        this.ctx.shadowBlur = this.glowSettings.particleGlow * 2.5 * activeState;
        this.ctx.globalAlpha = 0.6 * activeState;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
      }

      this.ctx.shadowBlur = 0;
    }

    updateFPS(time) {
      this.frameCount++;

      if (time - this.lastFPSCheck > 1000) {
        this.currentFPS = this.frameCount;
        this.frameCount = 0;
        this.lastFPSCheck = time;

        // Adaptive quality based on FPS
        if (this.currentFPS < 30 && !this.isMobile) {
          console.warn(`⚠️ Low FPS detected: ${this.currentFPS}`);
          // Reduce quality on the fly
          this.particleSettings.count = Math.max(10, this.particleSettings.count - 5);
        }
      }
    }

    animate(time) {
      if (!this.ctx || !this.canvas || !this.isVisible) return;

      const deltaTime = time - this.lastTime;
      this.lastTime = time;

      // FPS monitoring
      this.updateFPS(time);

      this.updateActiveStates();

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
      this.lastFPSCheck = this.lastTime;
      this.frameCount = 0;
      this.animate(this.lastTime);
    }

    handleResize() {
      this.isMobile = this.detectMobile();
      this.isTablet = this.detectTablet();
      this.setupAdaptiveSettings();
      this.setupCanvas();
      this.scanTools();
      this.generateIntelligentConnections();
      this.initParticles();
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
          this.initParticles();
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
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
      }
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.colorFlowNetwork = new GridSynchronizedNetworkMobile();
    });
  } else {
    window.colorFlowNetwork = new GridSynchronizedNetworkMobile();
  }

  // Debug helper
  window.debugColorFlow = function() {
    const net = window.colorFlowNetwork;
    if (!net) {
      console.log('❌ Network not initialized');
      return;
    }
    console.group('🚀 Color Flow v9.0 MOBILE ULTRA');
    console.log('Device:', net.isMobile ? 'Mobile 📱' : net.isTablet ? 'Tablet 📱' : 'Desktop 🖥️');
    console.log('Touch:', net.supportsTouch ? 'Yes' : 'No');
    console.log('Quality:', net.settings.qualityMultiplier + 'x');
    console.log('Particles/Connection:', net.particleSettings.count);
    console.log('Total Particles:', net.particles.length);
    console.log('Connections:', net.connections.length);
    console.log('Current FPS:', net.currentFPS);
    console.log('Low Power Mode:', net.isLowPowerMode ? 'ON 🔋' : 'OFF');
    console.log('Visible:', net.isVisible ? 'Yes 👁️' : 'No');
    console.log('Hovered:', net.hoveredCard ? net.hoveredCard.category : 'None');
    console.groupEnd();
  };

})();
