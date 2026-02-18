// =========================================
// GRID SYNCHRONIZED NETWORK V14.1 – ORGANIC CURVES (WebGL)
// - Alle Linien als Bézier-Kurven (keine 90° Winkel)
// - Fließende, natürliche Krümmung
// - Unregelmäßigerer Puls durch variierende Geschwindigkeit
// - scanTools erfasst .stack-card für Kategorien-Ansicht
// - Optimiert für alle Geräte
// - Integriert Performance.AnimationScheduler für optimierte Framerate
// - WebGL-beschleunigtes Rendering mit Kurventessellierung für maximale Performance
// - FIX: Linien werden jetzt korrekt angezeigt
// =========================================

(function() {
  'use strict';

  // -------------------------------------------------------------
  // WEBGL RENDERER – für maximale Performance mit Kurven
  // -------------------------------------------------------------
  class WebGLCurveRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false }) 
                || canvas.getContext('experimental-webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
      
      if (!this.gl) {
        console.warn('WebGL nicht verfügbar, verwende Canvas 2D');
        return null;
      }

      this.initShaders();
      this.buffers = {};
      this.clearColor = [0, 0, 0, 0];
      
      // Aktive Zeichendaten
      this.curves = []; // Array von { vertices: [], colors: [] }
    }

    initShaders() {
      const gl = this.gl;

      // Vertex-Shader für Linienzüge (Position + Farbe pro Vertex)
      const lineVS = `
        attribute vec2 a_position;
        attribute vec4 a_color;
        uniform vec2 u_resolution;
        varying vec4 v_color;

        void main() {
          vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
          clipSpace.y = -clipSpace.y;
          gl_Position = vec4(clipSpace, 0.0, 1.0);
          v_color = a_color;
        }
      `;

      // Fragment-Shader für Linienzüge
      const lineFS = `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          gl_FragColor = v_color;
        }
      `;

      // Vertex-Shader für Punkte (Sterne, Ripples) – mit Punktgröße
      const pointVS = `
        attribute vec2 a_position;
        attribute vec4 a_color;
        attribute float a_size;
        uniform vec2 u_resolution;
        varying vec4 v_color;

        void main() {
          vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
          clipSpace.y = -clipSpace.y;
          gl_Position = vec4(clipSpace, 0.0, 1.0);
          gl_PointSize = a_size;
          v_color = a_color;
        }
      `;

      // Fragment-Shader für Punkte (runde Punkte)
      const pointFS = `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;
          gl_FragColor = v_color;
        }
      `;

      this.lineProgram = this.createProgram(lineVS, lineFS);
      this.pointProgram = this.createProgram(pointVS, pointFS);

      // Attribute holen
      this.lineAttribs = {
        position: gl.getAttribLocation(this.lineProgram, 'a_position'),
        color: gl.getAttribLocation(this.lineProgram, 'a_color')
      };
      this.pointAttribs = {
        position: gl.getAttribLocation(this.pointProgram, 'a_position'),
        color: gl.getAttribLocation(this.pointProgram, 'a_color'),
        size: gl.getAttribLocation(this.pointProgram, 'a_size')
      };

      // Uniforms
      this.resUniformLine = gl.getUniformLocation(this.lineProgram, 'u_resolution');
      this.resUniformPoint = gl.getUniformLocation(this.pointProgram, 'u_resolution');

      // Enable blending für Transparenz
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    createProgram(vsSrc, fsSrc) {
      const gl = this.gl;
      const vs = this.compileShader(gl.VERTEX_SHADER, vsSrc);
      const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSrc);
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('Shader Link Error:', gl.getProgramInfoLog(prog));
        return null;
      }
      return prog;
    }

    compileShader(type, src) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader Compile Error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    setSize(width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    }

    clear() {
      const gl = this.gl;
      gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // Kurve als Linienzug zeichnen (Punkte werden als LINE_STRIP gerendert)
    addCurve(points, colors) {
      if (points.length < 4) return; // mindestens 2 Punkte (x,y) = 4 Werte
      this.curves.push({
        vertices: new Float32Array(points),
        colors: new Float32Array(colors)
      });
    }

    drawAllCurves() {
      const gl = this.gl;
      gl.useProgram(this.lineProgram);
      gl.uniform2f(this.resUniformLine, this.canvas.width, this.canvas.height);

      this.curves.forEach(curve => {
        // Vertex-Puffer
        if (!this.buffers.curveVBO) this.buffers.curveVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.curveVBO);
        gl.bufferData(gl.ARRAY_BUFFER, curve.vertices, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.lineAttribs.position);
        gl.vertexAttribPointer(this.lineAttribs.position, 2, gl.FLOAT, false, 0, 0);

        // Farb-Puffer
        if (!this.buffers.curveCBO) this.buffers.curveCBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.curveCBO);
        gl.bufferData(gl.ARRAY_BUFFER, curve.colors, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.lineAttribs.color);
        gl.vertexAttribPointer(this.lineAttribs.color, 4, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.LINE_STRIP, 0, curve.vertices.length / 2);
      });

      this.curves = []; // leeren
    }

    // Punkte zeichnen (Sterne, Ripples)
    drawPoints(points) {
      if (!points.length) return;
      const gl = this.gl;
      gl.useProgram(this.pointProgram);
      gl.uniform2f(this.resUniformPoint, this.canvas.width, this.canvas.height);

      const vertices = [];
      const colors = [];
      const sizes = [];
      points.forEach(p => {
        vertices.push(p.x, p.y);
        colors.push(p.r/255, p.g/255, p.b/255, p.a);
        sizes.push(p.size);
      });

      if (!this.buffers.pointVBO) this.buffers.pointVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.pointVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(this.pointAttribs.position);
      gl.vertexAttribPointer(this.pointAttribs.position, 2, gl.FLOAT, false, 0, 0);

      if (!this.buffers.pointCBO) this.buffers.pointCBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.pointCBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(this.pointAttribs.color);
      gl.vertexAttribPointer(this.pointAttribs.color, 4, gl.FLOAT, false, 0, 0);

      if (!this.buffers.pointSBO) this.buffers.pointSBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.pointSBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(this.pointAttribs.size);
      gl.vertexAttribPointer(this.pointAttribs.size, 1, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.POINTS, 0, vertices.length / 2);
    }

    destroy() {
      const gl = this.gl;
      if (this.buffers.curveVBO) gl.deleteBuffer(this.buffers.curveVBO);
      if (this.buffers.curveCBO) gl.deleteBuffer(this.buffers.curveCBO);
      if (this.buffers.pointVBO) gl.deleteBuffer(this.buffers.pointVBO);
      if (this.buffers.pointCBO) gl.deleteBuffer(this.buffers.pointCBO);
      if (this.buffers.pointSBO) gl.deleteBuffer(this.buffers.pointSBO);
    }
  }

  // -------------------------------------------------------------
  // HAUPTKLASSE (basierend auf Version 13.6, ergänzt um WebGL)
  // -------------------------------------------------------------
  class GridSynchronizedNetworkUltimate {
    constructor() {
      this.canvas = null;
      this.ctx = null; // für Fallback 2D
      this.glRenderer = null;
      this.useWebGL = false;
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

      this.stars = [];
      this.starFieldActive = true;
      this.glitchFrame = 0;
      this.glitchIntensity = 0;
      this.ripples = [];

      this.targetFPS = 60;
      this.frameInterval = 1000 / this.targetFPS;
      this.then = 0;

      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

      this.gradientCache = new Map();

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
      this.setupRippleListener();

      // Performance-Optimierung: AnimationScheduler nutzen falls verfügbar
      this.useScheduler = window.Performance && window.Performance.AnimationScheduler;
      if (this.useScheduler) {
        const schedulerFPS = Math.min(this.targetFPS, 30);
        this.animScheduler = new window.Performance.AnimationScheduler(schedulerFPS);
        console.log('🎬 Using AnimationScheduler with', schedulerFPS, 'fps');
      } else {
        this.animScheduler = null;
      }

      this.init();
    }

    setupAdaptiveSettings() {
      if (this.isMobile) {
        this.settings = {
          qualityMultiplier: 1.0,
          baseLineWidth: 2.0,
          glowWidth: 12,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: true,
          maxPrimaryConnections: 2,
          maxSecondaryConnections: 1,
          maxBridgeConnections: 2,
          hoverSpeed: 0.30,
          baseOpacity: 0.45,
          glowOpacity: 0.55,
          useSimplifiedRendering: false,
          minClusterSize: 2,
          maxDistance: 400,
          enableWaves: false,
          enableGlitch: false,
          enableStars: true,
          enableRipples: true,
          enableCategoryStyles: true,
          enableVariableWidth: false,
          starCount: 50,
          curveOffsetFactor: 0.2,
          curveRandomness: 0.3
        };
      } else if (this.isTablet) {
        this.settings = {
          qualityMultiplier: 1.2,
          baseLineWidth: 2.5,
          glowWidth: 14,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: true,
          maxPrimaryConnections: 3,
          maxSecondaryConnections: 2,
          maxBridgeConnections: 3,
          hoverSpeed: 0.25,
          baseOpacity: 0.40,
          glowOpacity: 0.50,
          useSimplifiedRendering: false,
          minClusterSize: 2,
          maxDistance: 450,
          enableWaves: false,
          enableGlitch: true,
          enableStars: true,
          enableRipples: true,
          enableCategoryStyles: true,
          enableVariableWidth: true,
          starCount: 100,
          glitchProbability: 0.01,
          curveOffsetFactor: 0.25,
          curveRandomness: 0.4
        };
      } else {
        this.settings = {
          qualityMultiplier: 1.5,
          baseLineWidth: 3.0,
          glowWidth: 18,
          glowSpeed: 0.0015,
          glowLength: 0.3,
          enableCurves: true,
          maxPrimaryConnections: 4,
          maxSecondaryConnections: 3,
          maxBridgeConnections: 4,
          hoverSpeed: 0.25,
          baseOpacity: 0.45,
          glowOpacity: 0.50,
          useSimplifiedRendering: false,
          minClusterSize: 2,
          maxDistance: 500,
          enableWaves: false,
          enableGlitch: true,
          enableStars: true,
          enableRipples: true,
          enableCategoryStyles: true,
          enableVariableWidth: true,
          starCount: 200,
          glitchProbability: 0.02,
          curveOffsetFactor: 0.3,
          curveRandomness: 0.5
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

    setupRippleListener() {
      document.addEventListener('click', (e) => {
        const card = e.target.closest('.card-square');
        if (!card) return;
        const gridRect = this.gridElement?.getBoundingClientRect();
        if (!gridRect) return;
        const cardRect = card.getBoundingClientRect();
        const x = cardRect.left + cardRect.width/2 - gridRect.left;
        const y = cardRect.top + cardRect.height/2 - gridRect.top;
        if (this.settings.enableRipples) {
          this.ripples.push({
            x, y,
            radius: 10,
            maxRadius: Math.max(this.canvasWidth, this.canvasHeight) * 0.8,
            alpha: 0.8,
            growth: 2,
            active: true
          });
        }
      });
    }

    init() {
      console.log('🚀 GridSynchronizedNetwork v14.1 – WebGL (FIX)');

      window.addEventListener('quantum:ready', () => {
        console.log('📡 quantum:ready received');
        setTimeout(() => this.setup(), 50);
      });

      if (document.readyState === 'complete') {
        console.log('📄 Document already complete, setting up...');
        setTimeout(() => this.setup(), 100);
      }

      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.handleResize(), 300);
      });
    }

    setup() {
      console.log('🔧 Setting up network...');
      this.gridElement = document.getElementById('tool-grid');

      if (!this.gridElement) {
        console.log('⏳ tool-grid not found, retrying in 500ms');
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
      this.generateStars();

      if (this.cards.length === 0) {
        console.warn('⚠️ No cards found, waiting for cards...');
        setTimeout(() => this.refresh(), 500);
        return;
      }

      this.generateIntelligentConnections();

      if (this.connections.length === 0) {
        console.log('📋 Using fallback connection generation');
        this.generateFallbackConnections();
      }

      console.log(`🃏 Found ${this.cards.length} cards, generated ${this.connections.length} connections`);

      this.setupInputDetection();
      this.startAnimation();
      this.setupResizeObserver();

      console.log('✅ Organic Curves initialized!');
      console.log(`🕸️ ${this.connections.length} connections (${this.countTypes().join(', ')})`);
    }

    setupCanvas() {
      if (!this.gridElement) {
        console.warn('setupCanvas: gridElement missing');
        return;
      }
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'connection-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
        this.canvas.style.willChange = 'transform';
        this.containerElement.insertBefore(this.canvas, this.gridElement);
        console.log('🖼️ Canvas created and inserted');
      }

      const gridRect = this.gridElement.getBoundingClientRect();
      const parentRect = this.containerElement.getBoundingClientRect();

      this.canvasWidth = gridRect.width;
      this.canvasHeight = gridRect.height;

      this.canvas.style.left = (gridRect.left - parentRect.left) + 'px';
      this.canvas.style.top = (gridRect.top - parentRect.top) + 'px';
      this.canvas.style.width = this.canvasWidth + 'px';
      this.canvas.style.height = this.canvasHeight + 'px';

      // Versuche WebGL, sonst 2D
      if (!this.glRenderer) {
        this.glRenderer = new WebGLCurveRenderer(this.canvas);
        if (this.glRenderer) {
          this.useWebGL = true;
          this.glRenderer.setSize(this.canvasWidth, this.canvasHeight);
          console.log('🎨 WebGL renderer active');
        } else {
          this.useWebGL = false;
          // Fallback auf 2D
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const hdRatio = dpr * this.settings.qualityMultiplier;
          this.canvas.width = this.canvasWidth * hdRatio;
          this.canvas.height = this.canvasHeight * hdRatio;
          this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });
          if (this.ctx) {
            this.ctx.scale(hdRatio, hdRatio);
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
          }
          console.log('🎨 2D canvas fallback');
        }
      } else {
        if (this.useWebGL) {
          this.glRenderer.setSize(this.canvasWidth, this.canvasHeight);
        } else {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const hdRatio = dpr * this.settings.qualityMultiplier;
          this.canvas.width = this.canvasWidth * hdRatio;
          this.canvas.height = this.canvasHeight * hdRatio;
          if (this.ctx) this.ctx.scale(hdRatio, hdRatio);
        }
      }
    }

    generateStars() {
      this.stars = [];
      for (let i = 0; i < this.settings.starCount; i++) {
        this.stars.push({
          x: Math.random() * this.canvasWidth,
          y: Math.random() * this.canvasHeight,
          radius: Math.random() * 1.5 + 0.5,
          brightness: Math.random() * 0.5 + 0.3,
          speed: Math.random() * 0.05 + 0.02,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    scanTools() {
      if (!this.gridElement) return;
      const cardElements = this.gridElement.querySelectorAll('.card-square, .stack-card');
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

      console.log(`🔍 Scanned ${this.cards.length} cards`);
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

    refresh() {
      console.log('🔄 Refreshing network...');
      if (!this.gridElement) {
        console.warn('refresh: gridElement missing');
        return;
      }
      this.scanTools();
      this.generateIntelligentConnections();
      if (this.connections.length === 0) {
        console.log('📋 No intelligent connections, using fallback');
        this.generateFallbackConnections();
      }
      console.log(`🕸️ After refresh: ${this.connections.length} connections`);
      this.setupCanvas();
      this.generateStars();
    }

    // ==================== Verbindungslogik (unverändert aus Version 13.6) ====================
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

    // Zeichenmethoden – je nach Renderer (WebGL oder 2D)

    // Berechnet eine quadratische Bézier-Kurve und gibt Array von Punkten und Farben zurück
    tessellateCurve(from, to, connection, activeState, time, forGlow = false) {
      const config = connection.config;
      let fromColor = this.categoryColors[from.category] || this.categoryColors.other;
      let toColor = this.categoryColors[to.category] || this.categoryColors.other;
      
      let weight = connection.weight || 1;
      if (this.settings.enableVariableWidth) {
        const degree = (from.degree + to.degree) / 2;
        weight *= (0.8 + degree * 0.1);
      }

      let baseOpacity;
      if (forGlow) {
        baseOpacity = this.settings.glowOpacity * activeState * weight * config.glowIntensity;
      } else {
        baseOpacity = this.settings.baseOpacity * activeState * weight;
      }

      if (this.settings.enableGlitch && Math.random() < this.settings.glitchProbability) {
        const tmp = fromColor;
        fromColor = toColor;
        toColor = tmp;
      }

      // Kurvenpunkte berechnen (quadratische Bézier)
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return { points: [], colors: [] };

      const baseOffset = dist * this.settings.curveOffsetFactor;
      const seed = connection.glowOffset;
      const rand1 = Math.sin(seed) * 0.5 + 0.5;
      const rand2 = Math.cos(seed) * 0.5 + 0.5;
      const offsetFactor = 0.8 + rand1 * this.settings.curveRandomness * 2;
      const angleVar = (rand2 - 0.5) * Math.PI * 0.5;
      const offset = baseOffset * offsetFactor;

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const cos = Math.cos(angleVar);
      const sin = Math.sin(angleVar);
      const rotatedX = perpX * cos - perpY * sin;
      const rotatedY = perpX * sin + perpY * cos;
      const cpX = midX + rotatedX * offset;
      const cpY = midY + rotatedY * offset;

      // Tessellierung: 20 Segmente
      const segments = 20;
      const points = [];
      const colors = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        // Quadratische Bézier: B(t) = (1-t)^2*P0 + 2(1-t)*t*P1 + t^2*P2
        const x = (1-t)*(1-t)*from.x + 2*(1-t)*t*cpX + t*t*to.x;
        const y = (1-t)*(1-t)*from.y + 2*(1-t)*t*cpY + t*t*to.y;
        points.push(x, y);
        
        // Farbe linear interpolieren
        const r = Math.round(fromColor.r + (toColor.r - fromColor.r) * t);
        const g = Math.round(fromColor.g + (toColor.g - fromColor.g) * t);
        const b = Math.round(fromColor.b + (toColor.b - fromColor.b) * t);
        const a = baseOpacity;
        colors.push(r/255, g/255, b/255, a);
      }
      return { points, colors };
    }

    // Hauptanimationsschleife
    animate(now) {
      if (!this.ctx && !this.glRenderer) return;

      this.glowTime = now;
      this.updateActiveStates();

      if (this.useWebGL && this.glRenderer) {
        // WebGL-Rendering
        this.glRenderer.clear();

        // Sterne
        if (this.settings.enableStars) {
          const starPoints = this.stars.map(star => {
            const brightness = star.brightness + Math.sin(this.glowTime * star.speed + star.phase) * 0.1;
            return {
              x: star.x,
              y: star.y,
              r: 255,
              g: 255,
              b: 255,
              a: Math.max(0.2, brightness),
              size: star.radius * 2
            };
          });
          this.glRenderer.drawPoints(starPoints);
        }

        // Kurven sammeln (normale und Glow)
        this.connections.forEach(conn => {
          const activeState = this.activeConnections.get(conn) || 1;
          
          // Normale Linie
          const normal = this.tessellateCurve(conn.from, conn.to, conn, activeState, now, false);
          if (normal.points.length) {
            this.glRenderer.addCurve(normal.points, normal.colors);
          }

          // Glow (nicht bei simplified rendering)
          if (!this.settings.useSimplifiedRendering || activeState > 0.5) {
            const glow = this.tessellateCurve(conn.from, conn.to, conn, activeState, now, true);
            if (glow.points.length) {
              this.glRenderer.addCurve(glow.points, glow.colors);
            }
          }
        });

        this.glRenderer.drawAllCurves();

        // Ripples
        if (this.settings.enableRipples) {
          const ripplePoints = [];
          for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.growth;
            r.alpha *= 0.98;
            if (r.radius > r.maxRadius || r.alpha < 0.05) {
              this.ripples.splice(i, 1);
              continue;
            }
            ripplePoints.push({
              x: r.x, y: r.y,
              r: 0, g: 243, b: 255,
              a: r.alpha,
              size: r.radius * 2
            });
          }
          this.glRenderer.drawPoints(ripplePoints);
        }

      } else if (this.ctx) {
        // 2D-Fallback
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.drawStars2D();

        this.connections.forEach(conn => {
          const activeState = this.activeConnections.get(conn) || 1;
          this.drawConnection2D(conn.from, conn.to, conn, activeState, now);
        });

        this.drawRipples2D();
      }
    }

    // 2D-Fallback-Methoden (aus Original)
    drawStars2D() {
      if (!this.settings.enableStars) return;
      this.ctx.save();
      this.ctx.fillStyle = 'white';
      for (let star of this.stars) {
        const brightness = star.brightness + Math.sin(this.glowTime * star.speed + star.phase) * 0.1;
        this.ctx.globalAlpha = Math.max(0.2, brightness);
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    drawRipples2D() {
      if (!this.settings.enableRipples) return;
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
      this.ctx.lineWidth = 2;
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.radius += r.growth;
        r.alpha *= 0.98;
        if (r.radius > r.maxRadius || r.alpha < 0.05) {
          this.ripples.splice(i, 1);
          continue;
        }
        this.ctx.globalAlpha = r.alpha;
        this.ctx.beginPath();
        this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    drawConnection2D(from, to, connection, activeState, time) {
      const config = connection.config;
      let fromColor = this.categoryColors[from.category] || this.categoryColors.other;
      let toColor = this.categoryColors[to.category] || this.categoryColors.other;

      let dashPattern = config.dashPattern;
      if (this.settings.enableCategoryStyles) {
        const cat = from.category;
        if (cat === 'text') dashPattern = [6, 3];
        else if (cat === 'image') dashPattern = [2, 4];
        else if (cat === 'code') dashPattern = [8, 2];
        else if (cat === 'audio') dashPattern = [4, 4];
        else if (cat === 'video') dashPattern = [12, 4];
        else if (cat === 'data') dashPattern = [1, 3];
        else dashPattern = config.dashPattern;
      }

      let weight = connection.weight || 1;
      if (this.settings.enableVariableWidth) {
        const degree = (from.degree + to.degree) / 2;
        weight *= (0.8 + degree * 0.1);
      }

      const baseOpacity = this.settings.baseOpacity * activeState * weight;

      if (this.settings.enableGlitch && Math.random() < this.settings.glitchProbability) {
        const tmp = fromColor;
        fromColor = toColor;
        toColor = tmp;
      }

      const gradient = this.getGradient(from, to, fromColor, toColor, baseOpacity);

      this.ctx.lineCap = 'round';
      this.ctx.setLineDash(dashPattern);

      this.drawCurvedLine2D(from, to, gradient, (this.settings.baseLineWidth * config.lineWidth / 2.5) * weight, connection);

      this.ctx.setLineDash([]);

      if (!this.settings.useSimplifiedRendering || activeState > 0.5) {
        const speedVariation = 0.8 + 0.4 * Math.sin(connection.glowOffset * 10);
        const flowSpeed = this.settings.glowSpeed * config.flowSpeed * config.glowIntensity * speedVariation;
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

          this.drawCurvedLine2D(from, to, glowGradient, this.ctx.lineWidth, connection);

          this.ctx.shadowBlur = 0;
        }
      }
    }

    drawCurvedLine2D(from, to, strokeStyle, lineWidth, connection) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;

      const baseOffset = dist * this.settings.curveOffsetFactor;
      const seed = connection.glowOffset;
      const rand1 = Math.sin(seed) * 0.5 + 0.5;
      const rand2 = Math.cos(seed) * 0.5 + 0.5;
      const offsetFactor = 0.8 + rand1 * this.settings.curveRandomness * 2;
      const angleVar = (rand2 - 0.5) * Math.PI * 0.5;
      const offset = baseOffset * offsetFactor;
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const cos = Math.cos(angleVar);
      const sin = Math.sin(angleVar);
      const rotatedX = perpX * cos - perpY * sin;
      const rotatedY = perpX * sin + perpY * cos;
      const cpX = midX + rotatedX * offset;
      const cpY = midY + rotatedY * offset;

      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.quadraticCurveTo(cpX, cpY, to.x, to.y);
      this.ctx.strokeStyle = strokeStyle;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
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

    lerpColor(color1, color2, t) {
      return {
        r: Math.round(color1.r + (color2.r - color1.r) * t),
        g: Math.round(color1.g + (color2.g - color1.g) * t),
        b: Math.round(color1.b + (color2.b - color1.b) * t)
      };
    }

    startAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }

      if (this.useScheduler && this.animScheduler) {
        // Scheduler verwenden
        this.animScheduler.add(() => this.animate(performance.now()));
      } else {
        // Standard
        const animateLoop = (t) => {
          this.animate(t);
          this.animationFrame = requestAnimationFrame(animateLoop);
        };
        this.animationFrame = requestAnimationFrame(animateLoop);
      }
    }

    handleResize() {
      if (!this.gridElement) {
        console.warn('handleResize: gridElement missing – skipping resize');
        return;
      }
      this.isMobile = window.innerWidth < 768;
      this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      this.setupAdaptiveSettings();
      this.gradientCache.clear();
      this.setupCanvas();
      this.scanTools();
      this.generateStars();
      this.generateIntelligentConnections();
      if (this.connections.length === 0) {
        this.generateFallbackConnections();
      }
      this.setupInputDetection();
      console.log('📏 Resize handled, connections:', this.connections.length);
    }

    setupResizeObserver() {
      if (!this.gridElement) return;

      this.resizeObserver = new ResizeObserver(() => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          if (!this.gridElement) return;
          this.setupCanvas();
          this.scanTools();
          this.generateStars();
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
      if (this.animScheduler) {
        this.animScheduler.remove(() => this.animate);
        this.animScheduler.stop();
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      if (this.glRenderer) {
        this.glRenderer.destroy();
      }
      this.gradientCache.clear();
    }
  }

  // Export
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
    console.group('🚀 Color Flow v14.1 – WebGL');
    console.log('Device:', net.isMobile ? 'Mobile 📱' : net.isTablet ? 'Tablet 📱' : 'Desktop 🖥️');
    console.log('Cards:', net.cards.length);
    console.log('Connections:', net.connections.length);
    console.log('Types:', net.countTypes().join(', '));
    console.log('Stars:', net.stars.length);
    console.log('Ripples:', net.ripples.length);
    console.log('Settings:', net.settings);
    console.log('Using WebGL:', net.useWebGL);
    console.groupEnd();
  };

})();