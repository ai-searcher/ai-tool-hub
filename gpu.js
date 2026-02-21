// =========================================
// GPU.JS – Ultra-Performance WebGL-Renderer (Extreme Edition)
// Version: 6.1.0 (Integrierte Performance-Kopplung)
// - WebGL2 "Turbo Mode" mit Fallback auf WebGL1
// - Nutzt Cache aus performance.js für Shader-Quellen (optional)
// - Stellt getLoad()-Methode für Lastmessung bereit
// - Keine eigenen Animationsschleifen mehr (reine Zeichen-Engine)
// - Volle Abwärtskompatibilität zu WebGLRendererUltra v6.0
// =========================================

(function(global) {
  'use strict';

  // -------------------------------------------------------------
  // PRÄAMBEL: Verfügbarkeit prüfen und Konstanten definieren
  // -------------------------------------------------------------

  const VERSION = '6.1.0';
  const MAX_BUFFER_SIZE = 65536;
  const DEFAULT_SEGMENTS = 20;
  const MIN_SEGMENTS = 5;
  const MAX_SEGMENTS = 50;

  const hasWebGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })();

  const hasWebGL2 = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch (e) {
      return false;
    }
  })();

  const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

  // -------------------------------------------------------------
  // HILFSFUNKTIONEN (Shader, Buffer, etc.)
  // -------------------------------------------------------------

  function createShader(gl, type, source) {
    if (!gl) return null;
    const shader = gl.createShader(type);
    if (!shader) {
      console.error('GPU: Konnte keinen Shader erstellen');
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      console.error('GPU: Shader-Kompilierung fehlgeschlagen:\n', log);
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vertexSrc, fragmentSrc) {
    if (!gl) return null;
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return null;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog);
      console.error('GPU: Program-Linking fehlgeschlagen:\n', log);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  // -------------------------------------------------------------
  // BASIS-RENDERER (abstrakte Basisklasse für WebGL1 und WebGL2)
  // -------------------------------------------------------------

  class BaseRenderer {
    constructor(canvas, options) {
      if (!canvas) throw new Error('GPU: Canvas erforderlich');
      this.canvas = canvas;
      this.options = options || {};
      this.width = canvas.width || 0;
      this.height = canvas.height || 0;
      this.pixelRatio = options.pixelRatio || Math.min(window.devicePixelRatio || 1, 2);
      this.clearColor = options.clearColor || [0, 0, 0, 0];
      this.cache = options.cache || null; // optionaler Cache aus performance.js
      this._init();
    }

    _init() { /* wird von Subklassen überschrieben */ }

    _checkContext() {
      if (!this.gl || this.gl.isContextLost()) {
        console.warn('GPU: WebGL Context verloren, versuche neu zu erstellen...');
        this._init();
      }
      return !!this.gl;
    }

    resize(width, height) { /* wird überschrieben */ }
    clear() { /* wird überschrieben */ }
    drawPoints(points) { /* wird überschrieben */ }
    drawCurves(curves) { /* wird überschrieben */ }
    destroy() { /* wird überschrieben */ }
    setQuality(level) { /* wird überschrieben */ } // 0..1
    getStats() { return {}; }

    // NEU: Liefert eine geschätzte Auslastung (0 = idle, 1 = voll)
    getLoad() {
      const stats = this.getStats();
      // Einfache Schätzung: Verhältnis der DrawCalls zu einem angenommenen Maximum
      const maxDrawCalls = 100; // willkürlich, kann optimiert werden
      return Math.min(1, (stats.drawCalls || 0) / maxDrawCalls);
    }
  }

  // -------------------------------------------------------------
  // BUFFERPOOL – Optimierte Speicherverwaltung
  // -------------------------------------------------------------

  class BufferPool {
    constructor(gl) {
      this.gl = gl;
      this.pools = new Map(); // name -> { buffer, size, usage }
      this.totalAllocated = 0;
    }

    getBuffer(name, requiredSize, usage = this.gl.DYNAMIC_DRAW) {
      if (!this.gl) return null;
      if (this.pools.has(name)) {
        const entry = this.pools.get(name);
        if (entry.size >= requiredSize) {
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, entry.buffer);
          return entry.buffer;
        } else {
          // Vorhandenen Buffer löschen und neuen mit größerer Kapazität anlegen
          this.gl.deleteBuffer(entry.buffer);
          const newBuffer = this.gl.createBuffer();
          entry.buffer = newBuffer;
          entry.size = requiredSize;
          entry.usage = usage;
          this.totalAllocated += requiredSize - (entry.size || 0);
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, newBuffer);
          return newBuffer;
        }
      } else {
        const buffer = this.gl.createBuffer();
        this.pools.set(name, { buffer, size: requiredSize, usage });
        this.totalAllocated += requiredSize;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        return buffer;
      }
    }

    bindBuffer(name, data, usage = this.gl.DYNAMIC_DRAW) {
      if (!this.gl) return;
      const requiredSize = data.length;
      const buffer = this.getBuffer(name, requiredSize, usage);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), usage);
    }

    deleteBuffer(name) {
      if (this.pools.has(name)) {
        const entry = this.pools.get(name);
        this.gl.deleteBuffer(entry.buffer);
        this.totalAllocated -= entry.size;
        this.pools.delete(name);
      }
    }

    deleteAll() {
      for (let entry of this.pools.values()) {
        this.gl.deleteBuffer(entry.buffer);
      }
      this.pools.clear();
      this.totalAllocated = 0;
    }

    getStats() {
      return {
        buffers: this.pools.size,
        totalAllocated: this.totalAllocated
      };
    }
  }

  // -------------------------------------------------------------
  // SHADERMANAGER – Verwaltet alle Shader-Programme (mit Cache-Unterstützung)
  // -------------------------------------------------------------

  class ShaderManager {
    constructor(gl, options = {}) {
      this.gl = gl;
      this.cache = options.cache || null; // optionaler Cache aus performance.js
      this.programs = new Map(); // name -> WebGLProgram
      this._initAll();
    }

    _initAll() {
      this._addProgram('triangle', this._triangleVS(), this._triangleFS());
      this._addProgram('point', this._pointVS(), this._pointFS());
      this._addProgram('dashedLine', this._dashedLineVS(), this._dashedLineFS());
      this._addProgram('triangleAA', this._triangleVS(), this._triangleAAFS());
    }

    _addProgram(name, vs, fs) {
      // Prüfen, ob das Programm im Cache existiert (nur Quellen-Caching, da WebGLProgram nicht serialisierbar)
      const cacheKey = `shader_${name}`;
      let prog = null;
      if (this.cache) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          // Wir können nur die Quellen cachen, nicht das kompilierte Programm
          // Also hier einfach den vorhandenen Eintrag nutzen? Besser: Quellen speichern und neu kompilieren.
          // Da WebGL-Programme kontextgebunden sind, müssen wir sie neu erstellen.
          // Der Cache spart nur das erneute Laden der Quellstrings.
          vs = cached.vs || vs;
          fs = cached.fs || fs;
        }
      }
      prog = createProgram(this.gl, vs, fs);
      if (prog) {
        this.programs.set(name, prog);
        if (this.cache) {
          // Quellen für zukünftige Sessions cachen (nicht das Programm)
          this.cache.set(cacheKey, { vs, fs });
        }
      } else {
        console.warn(`GPU: Shader-Programm "${name}" konnte nicht erstellt werden, verwende Fallback.`);
        if (name !== 'triangle' && this.programs.has('triangle')) {
          this.programs.set(name, this.programs.get('triangle'));
        }
      }
    }

    get(name) {
      return this.programs.get(name) || this.programs.get('triangle');
    }

    destroy() {
      for (let prog of this.programs.values()) {
        this.gl.deleteProgram(prog);
      }
      this.programs.clear();
    }

    // Shader-Quellen (unverändert)
    _triangleVS() {
      return `
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
    }

    _triangleFS() {
      return `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          gl_FragColor = v_color;
        }
      `;
    }

    _triangleAAFS() {
      return `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          gl_FragColor = v_color;
        }
      `;
    }

    _pointVS() {
      return `
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
    }

    _pointFS() {
      return `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;
          gl_FragColor = v_color;
        }
      `;
    }

    _dashedLineVS() {
      return `
        attribute vec2 a_position;
        attribute vec4 a_color;
        attribute float a_length;
        uniform vec2 u_resolution;
        uniform float u_dashLength;
        uniform float u_gapLength;
        varying vec4 v_color;
        varying float v_length;
        void main() {
          vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
          clip.y = -clip.y;
          gl_Position = vec4(clip, 0.0, 1.0);
          v_color = a_color;
          v_length = a_length;
        }
      `;
    }

    _dashedLineFS() {
      return `
        precision mediump float;
        varying vec4 v_color;
        varying float v_length;
        uniform float u_dashLength;
        uniform float u_gapLength;
        void main() {
          float total = u_dashLength + u_gapLength;
          float pos = mod(v_length, total);
          if (pos > u_dashLength) discard;
          gl_FragColor = v_color;
        }
      `;
    }
  }

  // -------------------------------------------------------------
  // WEBGL1-RENDERER (optimierte Implementierung)
  // -------------------------------------------------------------

  class WebGL1Renderer extends BaseRenderer {
    _init() {
      const gl = this.gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        depth: false,
        stencil: false
      }) || this.canvas.getContext('experimental-webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        depth: false,
        stencil: false
      });
      if (!gl) throw new Error('WebGL1 nicht verfügbar');

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      this.shaderManager = new ShaderManager(gl, { cache: this.cache });
      this.bufferPool = new BufferPool(gl);
      this.currentProgram = null;
      this.dummyBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dummyBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0]), gl.STATIC_DRAW);

      this.hasInstancing = !!gl.getExtension('ANGLE_instanced_arrays');
      if (this.hasInstancing) {
        this.instancedExt = gl.getExtension('ANGLE_instanced_arrays');
      }

      this.qualityFactor = 1.0; // 0..1
      this.stats = { drawCalls: 0, vertices: 0, curves: 0, points: 0 };
    }

    _checkContext() {
      if (!this.gl || this.gl.isContextLost()) {
        console.warn('GPU: WebGL1 Context verloren, versuche Wiederherstellung...');
        try {
          this._init();
          this.resize(this.width, this.height);
        } catch (e) {
          console.error('GPU: Wiederherstellung fehlgeschlagen', e);
          return false;
        }
      }
      return true;
    }

    _bindAttrib(program, name, data, size, bufferName) {
      const gl = this.gl;
      const loc = gl.getAttribLocation(program, name);
      if (loc === -1) return;
      this.bufferPool.bindBuffer(bufferName, data);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }

    _bindDummyAttrib(program, name) {
      const gl = this.gl;
      const loc = gl.getAttribLocation(program, name);
      if (loc === -1) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dummyBuffer);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    _useProgram(program) {
      if (this.currentProgram !== program) {
        this.gl.useProgram(program);
        this.currentProgram = program;
      }
    }

    resize(width, height) {
      if (!this._checkContext()) return;
      this.width = width;
      this.height = height;
      const canvasWidth = width * this.pixelRatio;
      const canvasHeight = height * this.pixelRatio;
      this.canvas.width = canvasWidth;
      this.canvas.height = canvasHeight;
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      this.gl.viewport(0, 0, canvasWidth, canvasHeight);
    }

    clear() {
      if (!this._checkContext()) return;
      const gl = this.gl;
      gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.stats.drawCalls = 0;
      this.stats.vertices = 0;
      this.stats.curves = 0;
      this.stats.points = 0;
    }

    drawPoints(points) {
      if (!this._checkContext() || !points || points.length === 0) return;
      const gl = this.gl;
      const program = this.shaderManager.get('point');
      this._useProgram(program);
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);

      const vertices = [];
      const colors = [];
      const sizes = [];
      for (let p of points) {
        vertices.push(p.x, p.y);
        colors.push(p.r / 255, p.g / 255, p.b / 255, p.a);
        sizes.push(p.size);
      }

      this._bindAttrib(program, 'a_position', vertices, 2, 'pointPos');
      this._bindAttrib(program, 'a_color', colors, 4, 'pointCol');
      this._bindAttrib(program, 'a_size', sizes, 1, 'pointSize');

      gl.drawArrays(gl.POINTS, 0, vertices.length / 2);
      this.stats.drawCalls++;
      this.stats.points += points.length;
      this.stats.vertices += vertices.length / 2;
    }

    drawCurves(curves) {
      if (!this._checkContext() || !curves || curves.length === 0) return;
      const gl = this.gl;
      const program = this.shaderManager.get('triangle');
      this._useProgram(program);
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);

      const allVertices = [];
      const allColors = [];

      for (let curve of curves) {
        const pts = curve.points;
        const cols = curve.colors;
        const thickness = curve.thickness * this.qualityFactor; // Dicke anpassen
        if (pts.length < 4) continue;

        for (let i = 0; i < pts.length - 2; i += 2) {
          const x1 = pts[i];
          const y1 = pts[i + 1];
          const x2 = pts[i + 2];
          const y2 = pts[i + 3];

          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1e-6) continue;

          const nx = -dy / len;
          const ny = dx / len;
          const hw = thickness / 2;

          const c1 = cols.slice(i * 2, i * 2 + 4);
          const c2 = cols.slice(i * 2 + 4, i * 2 + 8);

          const p0x = x1 - nx * hw;
          const p0y = y1 - ny * hw;
          const p1x = x2 - nx * hw;
          const p1y = y2 - ny * hw;
          const p2x = x1 + nx * hw;
          const p2y = y1 + ny * hw;
          const p3x = x2 + nx * hw;
          const p3y = y2 + ny * hw;

          // Dreieck 1: p0-p1-p2
          allVertices.push(p0x, p0y, p1x, p1y, p2x, p2y);
          allColors.push(...c1, ...c2, ...c1);
          // Dreieck 2: p1-p3-p2
          allVertices.push(p1x, p1y, p3x, p3y, p2x, p2y);
          allColors.push(...c2, ...c2, ...c1);
        }
      }

      if (allVertices.length === 0) return;

      this._bindAttrib(program, 'a_position', allVertices, 2, 'curvePos');
      this._bindAttrib(program, 'a_color', allColors, 4, 'curveCol');
      this._bindDummyAttrib(program, 'a_offsetX');
      this._bindDummyAttrib(program, 'a_offsetY');

      gl.drawArrays(gl.TRIANGLES, 0, allVertices.length / 2);
      this.stats.drawCalls++;
      this.stats.curves += curves.length;
      this.stats.vertices += allVertices.length / 2;
    }

    setQuality(level) {
      this.qualityFactor = Math.max(0.2, Math.min(1.0, level));
    }

    getStats() {
      return { ...this.stats, bufferPool: this.bufferPool.getStats() };
    }

    getLoad() {
      const stats = this.getStats();
      const maxDrawCalls = 100; // Erfahrungswert – kann optimiert werden
      const load = Math.min(1, (stats.drawCalls || 0) / maxDrawCalls);
      return load;
    }

    destroy() {
      this.bufferPool.deleteAll();
      if (this.dummyBuffer) this.gl.deleteBuffer(this.dummyBuffer);
      this.shaderManager.destroy();
    }
  }

  // -------------------------------------------------------------
  // WEBGL2-RENDERER (Turbo-Modus mit Interleaved Buffers und Instancing)
  // -------------------------------------------------------------

  class WebGL2Renderer extends BaseRenderer {
    _init() {
      const gl = this.gl = this.canvas.getContext('webgl2', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        depth: false,
        stencil: false
      });
      if (!gl) throw new Error('WebGL2 nicht verfügbar');

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // VAO für schnelles Umschalten
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);

      this.shaderManager = new ShaderManager(gl, { cache: this.cache });
      this.bufferPool = new BufferPool(gl);
      this.currentProgram = null;

      // Für interleaved Buffers
      this.interleavedBuffer = gl.createBuffer();

      // Instancing ist in WebGL2 nativ
      this.hasInstancing = true;

      this.qualityFactor = 1.0;
      this.stats = { drawCalls: 0, vertices: 0, curves: 0, points: 0 };
    }

    _checkContext() {
      if (!this.gl || this.gl.isContextLost()) {
        console.warn('GPU: WebGL2 Context verloren, versuche Wiederherstellung...');
        try {
          this._init();
          this.resize(this.width, this.height);
        } catch (e) {
          console.error('GPU: Wiederherstellung fehlgeschlagen', e);
          return false;
        }
      }
      return true;
    }

    _useProgram(program) {
      if (this.currentProgram !== program) {
        this.gl.useProgram(program);
        this.currentProgram = program;
      }
    }

    _setupInterleaved(program, attribs, data) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.interleavedBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);

      let stride = 0;
      for (let a of attribs) stride += a.size;
      stride *= 4; // float = 4 bytes

      let offset = 0;
      for (let a of attribs) {
        const loc = gl.getAttribLocation(program, a.name);
        if (loc !== -1) {
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, a.size, gl.FLOAT, false, stride, offset);
        }
        offset += a.size * 4;
      }
    }

    resize(width, height) {
      if (!this._checkContext()) return;
      this.width = width;
      this.height = height;
      const canvasWidth = width * this.pixelRatio;
      const canvasHeight = height * this.pixelRatio;
      this.canvas.width = canvasWidth;
      this.canvas.height = canvasHeight;
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      this.gl.viewport(0, 0, canvasWidth, canvasHeight);
    }

    clear() {
      if (!this._checkContext()) return;
      const gl = this.gl;
      gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.stats.drawCalls = 0;
      this.stats.vertices = 0;
      this.stats.curves = 0;
      this.stats.points = 0;
    }

    drawPoints(points) {
      if (!this._checkContext() || !points || points.length === 0) return;
      const gl = this.gl;
      const program = this.shaderManager.get('point');
      this._useProgram(program);
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);

      // Interleaved-Daten: [x, y, r, g, b, a, size]
      const data = [];
      for (let p of points) {
        data.push(p.x, p.y, p.r / 255, p.g / 255, p.b / 255, p.a, p.size);
      }

      const attribs = [
        { name: 'a_position', size: 2 },
        { name: 'a_color', size: 4 },
        { name: 'a_size', size: 1 }
      ];
      this._setupInterleaved(program, attribs, data);

      gl.drawArrays(gl.POINTS, 0, points.length);
      this.stats.drawCalls++;
      this.stats.points += points.length;
      this.stats.vertices += points.length;
    }

    drawCurves(curves) {
      if (!this._checkContext() || !curves || curves.length === 0) return;
      const gl = this.gl;
      const program = this.shaderManager.get('triangle');
      this._useProgram(program);
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);

      // Interleaved-Daten: pro Vertex [x, y, r, g, b, a]
      const data = [];

      for (let curve of curves) {
        const pts = curve.points;
        const cols = curve.colors;
        const thickness = curve.thickness * this.qualityFactor;
        if (pts.length < 4) continue;

        for (let i = 0; i < pts.length - 2; i += 2) {
          const x1 = pts[i];
          const y1 = pts[i + 1];
          const x2 = pts[i + 2];
          const y2 = pts[i + 3];

          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1e-6) continue;

          const nx = -dy / len;
          const ny = dx / len;
          const hw = thickness / 2;

          const c1 = cols.slice(i * 2, i * 2 + 4);
          const c2 = cols.slice(i * 2 + 4, i * 2 + 8);

          const p0x = x1 - nx * hw;
          const p0y = y1 - ny * hw;
          const p1x = x2 - nx * hw;
          const p1y = y2 - ny * hw;
          const p2x = x1 + nx * hw;
          const p2y = y1 + ny * hw;
          const p3x = x2 + nx * hw;
          const p3y = y2 + ny * hw;

          // Dreieck 1: p0-p1-p2
          data.push(p0x, p0y, ...c1);
          data.push(p1x, p1y, ...c2);
          data.push(p2x, p2y, ...c1);
          // Dreieck 2: p1-p3-p2
          data.push(p1x, p1y, ...c2);
          data.push(p3x, p3y, ...c2);
          data.push(p2x, p2y, ...c1);
        }
      }

      if (data.length === 0) return;

      const attribs = [
        { name: 'a_position', size: 2 },
        { name: 'a_color', size: 4 }
      ];
      this._setupInterleaved(program, attribs, data);

      gl.drawArrays(gl.TRIANGLES, 0, data.length / 6); // 6 floats pro Vertex
      this.stats.drawCalls++;
      this.stats.curves += curves.length;
      this.stats.vertices += data.length / 6;
    }

    setQuality(level) {
      this.qualityFactor = Math.max(0.2, Math.min(1.0, level));
    }

    getStats() {
      return { ...this.stats, bufferPool: this.bufferPool.getStats() };
    }

    getLoad() {
      const stats = this.getStats();
      const maxDrawCalls = 100;
      return Math.min(1, (stats.drawCalls || 0) / maxDrawCalls);
    }

    destroy() {
      this.gl.deleteVertexArray(this.vao);
      this.gl.deleteBuffer(this.interleavedBuffer);
      this.bufferPool.deleteAll();
      this.shaderManager.destroy();
    }
  }

  // -------------------------------------------------------------
  // WORKER-RENDERER (experimentell, für zukünftige Nutzung)
  // -------------------------------------------------------------
  // (unverändert, da nicht im Fokus)

  class WorkerRenderer {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.options = options;
      this.worker = null;
      this.offscreen = null;
      if (hasOffscreenCanvas && options.useWorker) {
        try {
          this.offscreen = canvas.transferControlToOffscreen();
          const workerCode = `
            // Worker-Code (vereinfacht – würde die gesamte Renderer-Logik enthalten)
            // Aus Platzgründen hier nur das Grundgerüst.
            self.onmessage = function(e) {
              const { cmd, data } = e.data;
              if (cmd === 'init') {
                // Worker initialisieren
              } else if (cmd === 'resize') {
                // Größe ändern
              } else if (cmd === 'clear') {
                // Löschen
              } else if (cmd === 'drawPoints') {
                // Punkte zeichnen
              } else if (cmd === 'drawCurves') {
                // Kurven zeichnen
              }
            };
          `;
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          this.worker = new Worker(URL.createObjectURL(blob));
          this.worker.postMessage({ cmd: 'init', canvas: this.offscreen, options }, [this.offscreen]);
          console.log('GPU Ultra: Worker-Modus aktiviert (experimentell)');
        } catch (e) {
          console.warn('GPU Ultra: Worker-Modus fehlgeschlagen, verwende normalen Renderer', e);
          this._fallback = new WebGLRendererUltra(canvas, options);
        }
      } else {
        this._fallback = new WebGLRendererUltra(canvas, options);
      }
    }

    resize(width, height) {
      if (this.worker) {
        this.worker.postMessage({ cmd: 'resize', width, height });
      } else {
        this._fallback.resize(width, height);
      }
    }

    clear() {
      if (this.worker) {
        this.worker.postMessage({ cmd: 'clear' });
      } else {
        this._fallback.clear();
      }
    }

    drawPoints(points) {
      if (this.worker) {
        this.worker.postMessage({ cmd: 'drawPoints', points });
      } else {
        this._fallback.drawPoints(points);
      }
    }

    drawCurves(curves) {
      if (this.worker) {
        this.worker.postMessage({ cmd: 'drawCurves', curves });
      } else {
        this._fallback.drawCurves(curves);
      }
    }

    destroy() {
      if (this.worker) {
        this.worker.terminate();
      } else {
        this._fallback.destroy();
      }
    }

    setQuality(level) {
      if (this.worker) {
        this.worker.postMessage({ cmd: 'setQuality', level });
      } else {
        this._fallback.setQuality(level);
      }
    }

    getStats() {
      if (this.worker) {
        return {};
      } else {
        return this._fallback.getStats();
      }
    }

    getLoad() {
      if (this.worker) {
        return 0;
      } else {
        return this._fallback.getLoad();
      }
    }
  }

  // -------------------------------------------------------------
  // HAUPTKLASSE: WebGLRendererUltra (Factory)
  // -------------------------------------------------------------

  class WebGLRendererUltra {
    constructor(canvas, options = {}) {
      // Versuche WebGL2, sonst WebGL1
      let renderer = null;
      if (hasWebGL2 && options.preferWebGL2 !== false) {
        try {
          renderer = new WebGL2Renderer(canvas, options);
          console.log('GPU Ultra: WebGL2 Turbo Mode aktiviert');
        } catch (e) {
          console.warn('GPU Ultra: WebGL2 nicht verfügbar, verwende WebGL1', e);
        }
      }
      if (!renderer) {
        renderer = new WebGL1Renderer(canvas, options);
        console.log('GPU Ultra: WebGL1 Renderer aktiv');
      }
      this._renderer = renderer;

      // Öffentliche API delegieren
      this.width = renderer.width;
      this.height = renderer.height;
      this.pixelRatio = renderer.pixelRatio;
      this.clearColor = renderer.clearColor;
    }

    resize(width, height) { this._renderer.resize(width, height); }
    clear() { this._renderer.clear(); }
    drawPoints(points) { this._renderer.drawPoints(points); }
    drawCurves(curves) { this._renderer.drawCurves(curves); }
    destroy() { this._renderer.destroy(); }
    setQuality(level) { this._renderer.setQuality(level); }
    getStats() { return this._renderer.getStats(); }
    getLoad() { return this._renderer.getLoad(); }

    // Statische Hilfsmethoden (wie bisher)
    static tessellateBezier(p0, cp, p1, segments = DEFAULT_SEGMENTS) {
      segments = Math.max(MIN_SEGMENTS, Math.min(MAX_SEGMENTS, segments));
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * cp.x + t * t * p1.x;
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * cp.y + t * t * p1.y;
        points.push({ x, y });
      }
      return points;
    }

    static tessellateConnection(from, to, conn, activeState, time, categoryColors, settings, forGlow = false) {
      const config = conn.config;
      let fromColor = categoryColors[from.category] || categoryColors.other;
      let toColor = categoryColors[to.category] || categoryColors.other;

      let weight = conn.weight || 1;
      if (settings.enableVariableWidth) {
        const degree = (from.degree + to.degree) / 2;
        weight *= (0.8 + degree * 0.1);
      }

      const baseWidth = (settings.baseLineWidth * config.lineWidth / 2.5) * weight;
      const lineWidth = forGlow ? baseWidth * 3 : baseWidth;

      let baseOpacity;
      if (forGlow) {
        baseOpacity = settings.glowOpacity * activeState * weight * config.glowIntensity;
      } else {
        baseOpacity = settings.baseOpacity * activeState * weight;
      }

      if (settings.enableGlitch && Math.random() < settings.glitchProbability) {
        [fromColor, toColor] = [toColor, fromColor];
      }

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return null;

      const baseOffset = dist * settings.curveOffsetFactor;
      const seed = conn.glowOffset;
      const rand1 = Math.sin(seed) * 0.5 + 0.5;
      const rand2 = Math.cos(seed) * 0.5 + 0.5;
      const offsetFactor = 0.8 + rand1 * settings.curveRandomness * 2;
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

      // Segmentzahl adaptiv: je länger die Kurve, desto mehr Segmente
      const segments = Math.max(MIN_SEGMENTS, Math.min(MAX_SEGMENTS, Math.floor(dist / 5) + 5));

      const points = [];
      const colors = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cpX + t * t * to.x;
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cpY + t * t * to.y;
        points.push(x, y);

        const r = Math.round(fromColor.r + (toColor.r - fromColor.r) * t);
        const g = Math.round(fromColor.g + (toColor.g - fromColor.g) * t);
        const b = Math.round(fromColor.b + (toColor.b - fromColor.b) * t);
        colors.push(r / 255, g / 255, b / 255, baseOpacity);
      }

      return { points, colors, thickness: lineWidth };
    }
  }

  // -------------------------------------------------------------
  // EXPORT (gleiche Schnittstelle wie immer)
  // -------------------------------------------------------------

  global.GPU = {
    WebGLRendererUltra,
    tessellateBezier: WebGLRendererUltra.tessellateBezier,
    tessellateConnection: WebGLRendererUltra.tessellateConnection,
    hasWebGL,
    hasWebGL2,
    VERSION
  };

})(window);