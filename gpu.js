// =========================================
// GPU.JS – Universelle WebGL-Render-Engine für Quantum AI Hub
// Version: 1.0.0
// Bietet GPU-beschleunigtes Rendering für Linien, Punkte, Kurven und Partikel.
// Kann als alleinstehende Engine oder als Basis für color-flow.js verwendet werden.
// Kompatibel mit allen Browsern, die WebGL 1.0/2.0 unterstützen.
// =========================================

(function(global) {
  'use strict';

  // Prüfe auf WebGL-Verfügbarkeit
  const hasWebGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })();

  // -------------------------------------------------------------
  // HILFSFUNKTIONEN
  // -------------------------------------------------------------
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vertexSrc, fragmentSrc) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  // -------------------------------------------------------------
  // WEBGL-RENDERER (Kernklasse)
  // -------------------------------------------------------------
  class WebGLRenderer {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false }) 
                || canvas.getContext('experimental-webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
      if (!this.gl) {
        throw new Error('WebGL not supported');
      }

      this.width = canvas.width;
      this.height = canvas.height;
      this.pixelRatio = options.pixelRatio || Math.min(window.devicePixelRatio || 1, 2);

      // Shader-Programme
      this.programs = {};
      this._initDefaultPrograms();

      // Buffer-Pool für effizientes Rendering
      this.buffers = {};

      // Aktuelle Zeichendaten
      this.clearColor = options.clearColor || [0, 0, 0, 0];
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    _initDefaultPrograms() {
      const gl = this.gl;

      // Standard-Linienprogramm (2D-Position + Farbe)
      const lineVS = `
        attribute vec2 a_position;
        attribute vec4 a_color;
        uniform vec2 u_resolution;
        varying vec4 v_color;
        void main() {
          vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
          clip.y = -clip.y;
          gl_Position = vec4(clip, 0.0, 1.0);
          v_color = a_color;
        }
      `;
      const lineFS = `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          gl_FragColor = v_color;
        }
      `;
      this.programs.line = createProgram(gl, lineVS, lineFS);

      // Punktprogramm (runde Punkte)
      const pointVS = `
        attribute vec2 a_position;
        attribute vec4 a_color;
        attribute float a_size;
        uniform vec2 u_resolution;
        varying vec4 v_color;
        void main() {
          vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
          clip.y = -clip.y;
          gl_Position = vec4(clip, 0.0, 1.0);
          gl_PointSize = a_size;
          v_color = a_color;
        }
      `;
      const pointFS = `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;
          gl_FragColor = v_color;
        }
      `;
      this.programs.point = createProgram(gl, pointVS, pointFS);

      // Optional: Kurvenprogramm (via Tessellation – hier als Linienzug)
    }

    resize(width, height) {
      this.width = width;
      this.height = height;
      this.canvas.width = width * this.pixelRatio;
      this.canvas.height = height * this.pixelRatio;
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    clear() {
      const gl = this.gl;
      gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // Zeichnet eine Liste von Linien (jede Linie als zwei Punkte)
    drawLines(lines) {
      if (!lines.length) return;
      const gl = this.gl;
      const prog = this.programs.line;
      gl.useProgram(prog);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), this.width, this.height);

      const vertices = [];
      const colors = [];
      lines.forEach(line => {
        vertices.push(line.x1, line.y1);
        vertices.push(line.x2, line.y2);
        colors.push(line.r1/255, line.g1/255, line.b1/255, line.a1);
        colors.push(line.r2/255, line.g2/255, line.b2/255, line.a2);
      });

      this._bindAttribBuffer('lineVertices', vertices, 2, prog, 'a_position');
      this._bindAttribBuffer('lineColors', colors, 4, prog, 'a_color');

      gl.drawArrays(gl.LINES, 0, vertices.length / 2);
    }

    // Zeichnet eine Liste von Punkten
    drawPoints(points) {
      if (!points.length) return;
      const gl = this.gl;
      const prog = this.programs.point;
      gl.useProgram(prog);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), this.width, this.height);

      const vertices = [];
      const colors = [];
      const sizes = [];
      points.forEach(p => {
        vertices.push(p.x, p.y);
        colors.push(p.r/255, p.g/255, p.b/255, p.a);
        sizes.push(p.size);
      });

      this._bindAttribBuffer('pointVertices', vertices, 2, prog, 'a_position');
      this._bindAttribBuffer('pointColors', colors, 4, prog, 'a_color');
      this._bindAttribBuffer('pointSizes', sizes, 1, prog, 'a_size');

      gl.drawArrays(gl.POINTS, 0, vertices.length / 2);
    }

    // Zeichnet eine Kurve als Linienzug (Tessellation)
    drawCurve(points, colors) {
      // points: Array von [x,y]-Paaren, colors: Array von [r,g,b,a]-Paaren
      if (points.length < 2) return;
      const gl = this.gl;
      const prog = this.programs.line; // Linienprogramm für Linienzug
      gl.useProgram(prog);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), this.width, this.height);

      const vertices = points.flat();
      const colorArray = colors.flat();

      this._bindAttribBuffer('curveVertices', vertices, 2, prog, 'a_position');
      this._bindAttribBuffer('curveColors', colorArray, 4, prog, 'a_color');

      gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 2);
    }

    // Hilfsfunktion: Puffer binden und Daten übertragen
    _bindAttribBuffer(name, data, size, program, attribName) {
      const gl = this.gl;
      if (!this.buffers[name]) {
        this.buffers[name] = gl.createBuffer();
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[name]);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
      const attrib = gl.getAttribLocation(program, attribName);
      gl.enableVertexAttribArray(attrib);
      gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0);
    }

    // Ressourcen freigeben
    destroy() {
      Object.values(this.buffers).forEach(buf => this.gl.deleteBuffer(buf));
      Object.values(this.programs).forEach(prog => this.gl.deleteProgram(prog));
    }
  }

  // -------------------------------------------------------------
  // PARTIKELSYSTEM (optional, GPU-beschleunigt)
  // -------------------------------------------------------------
  class GPUParticleSystem {
    constructor(renderer, maxParticles = 1000) {
      this.renderer = renderer;
      this.gl = renderer.gl;
      this.maxParticles = maxParticles;
      this.particles = []; // für CPU-Updates (alternativ: Transform Feedback)
    }

    // Einfache CPU-gesteuerte Partikel (kann später auf GPU umgestellt werden)
    update(dt) {
      // Partikel-Logik hier
    }

    draw() {
      const points = this.particles.map(p => ({
        x: p.x,
        y: p.y,
        r: p.r,
        g: p.g,
        b: p.b,
        a: p.alpha,
        size: p.size
      }));
      this.renderer.drawPoints(points);
    }
  }

  // -------------------------------------------------------------
  // COMPUTE-SHADER-WRAPPER (WebGL 2.0 oder WebGL 1.0 mit Fragment-Shader-Tricks)
  // -------------------------------------------------------------
  class GPUCompute {
    constructor(renderer) {
      this.renderer = renderer;
      this.gl = renderer.gl;
      // Prüfe auf WebGL 2.0 für Compute-Shader (noch nicht weit verbreitet)
      this.isWebGL2 = this.gl instanceof WebGL2RenderingContext;
    }

    // Einfache parallele Berechnung über Fragment-Shader (Render-to-Texture)
    compute(workGroupSize, shader, outputTexture) {
      // Implementierung je nach Bedarf
    }
  }

  // -------------------------------------------------------------
  // EXPORT (nur WebGLRenderer als Hauptklasse)
  // -------------------------------------------------------------
  global.GPU = {
    WebGLRenderer,
    GPUParticleSystem,
    GPUCompute,
    hasWebGL
  };

})(window);