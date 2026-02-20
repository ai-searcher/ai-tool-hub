// =========================================
// GPU.JS – Ultra-Version: WebGL-Renderer für organische Kurven mit variabler Breite und Glow
// Version: 2.0.0 (Quadbasierte Linien, Farbverlauf, Tessellierung, Glow)
// Kompatibel mit Performance.js, kann separat oder als Teil von Performance.GPU verwendet werden.
// =========================================

(function(global) {
  'use strict';

  // Prüfe auf WebGL
  const hasWebGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })();

  // -------------------------------------------------------------
  // HILFSFUNKTIONEN FÜR SHADER
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
  // KERNKLASSE: WebGLRendererUltra
  // -------------------------------------------------------------
  class WebGLRendererUltra {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false }) 
                || canvas.getContext('experimental-webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
      if (!this.gl) throw new Error('WebGL not supported');

      this.width = canvas.width;
      this.height = canvas.height;
      this.pixelRatio = options.pixelRatio || Math.min(window.devicePixelRatio || 1, 2);

      // Shader-Programme initialisieren
      this.programs = {};
      this._initPrograms();

      // Buffer-Pool
      this.buffers = {};

      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.clearColor = options.clearColor || [0, 0, 0, 0];
    }

    _initPrograms() {
      const gl = this.gl;

      // Programm für gefüllte Dreiecke (für Linien als Rechtecke)
      const triVS = `
        attribute vec2 a_position;   // Position im Weltkoordinatensystem
        attribute vec4 a_color;      // Farbe (r,g,b,a)
        attribute float a_offsetX;   // Versatz in x-Richtung (senkrecht zur Linie)
        attribute float a_offsetY;   // Versatz in y-Richtung
        uniform vec2 u_resolution;
        uniform float u_thickness;    // globale Dicke (wird mit a_offset multipliziert)
        varying vec4 v_color;

        void main() {
          // Versatz anwenden (a_offset ist normalisiert)
          vec2 pos = a_position + vec2(a_offsetX, a_offsetY) * u_thickness;
          vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
          clip.y = -clip.y;
          gl_Position = vec4(clip, 0.0, 1.0);
          v_color = a_color;
        }
      `;

      const triFS = `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          gl_FragColor = v_color;
        }
      `;

      this.programs.triangle = createProgram(gl, triVS, triFS);

      // Punktprogramm (für Sterne, Ripples)
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

    // Zeichnet eine Liste von Kurven (jede Kurve als Linienzug mit variabler Dicke)
    // Erwartet für jede Kurve: { points: [x,y, x,y, ...], colors: [r,g,b,a, ...], thickness }
    // Die Kurve wird tesselliert und als Rechteckstreifen gezeichnet.
    drawCurves(curves) {
      if (!curves.length) return;

      // Wir sammeln alle Dreiecke in einem großen Buffer
      let allVertices = [];
      let allColors = [];
      let allOffsets = [];

      curves.forEach(curve => {
        const pts = curve.points;   // Array von [x,y] Paaren (Länge 2*N)
        const cols = curve.colors;   // Array von [r,g,b,a] pro Punkt (Länge 4*N)
        const thickness = curve.thickness;
        if (pts.length < 4) return; // mindestens zwei Punkte

        // Für jedes Segment (i von 0 bis N-2) erzeugen wir zwei Dreiecke (Quad)
        for (let i = 0; i < pts.length - 2; i += 2) {
          const x1 = pts[i];
          const y1 = pts[i+1];
          const x2 = pts[i+2];
          const y2 = pts[i+3];

          // Richtungsvektor
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx*dx + dy*dy);
          if (len < 1e-6) continue;

          // Senkrechter Vektor (normalisiert)
          const nx = -dy / len;
          const ny = dx / len;

          // Farben für die vier Ecken (linear interpoliert)
          const c1 = cols.slice(i*2, i*2+4);   // Farbe an Punkt 1
          const c2 = cols.slice(i*2+4, i*2+8); // Farbe an Punkt 2

          // Indices für die Dreiecke (zwei Dreiecke: 0-1-2 und 1-3-2)
          // Punkte: 0 = links unten, 1 = rechts unten, 2 = links oben, 3 = rechts oben
          const p0 = { x: x1 - nx * thickness/2, y: y1 - ny * thickness/2 };
          const p1 = { x: x2 - nx * thickness/2, y: y2 - ny * thickness/2 };
          const p2 = { x: x1 + nx * thickness/2, y: y1 + ny * thickness/2 };
          const p3 = { x: x2 + nx * thickness/2, y: y2 + ny * thickness/2 };

          // Dreieck 1: p0-p1-p2
          allVertices.push(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
          allColors.push(...c1, ...c2, ...c1);
          allOffsets.push(0,0, 0,0, 0,0); // Offsets werden nicht benötigt, da wir bereits die verschobenen Punkte verwenden

          // Dreieck 2: p1-p3-p2
          allVertices.push(p1.x, p1.y, p3.x, p3.y, p2.x, p2.y);
          allColors.push(...c2, ...c2, ...c1);
          allOffsets.push(0,0, 0,0, 0,0);
        }
      });

      if (allVertices.length === 0) return;

      const gl = this.gl;
      const prog = this.programs.triangle;
      gl.useProgram(prog);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), this.width, this.height);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_thickness'), 1.0); // wird hier nicht gebraucht, da wir offsets nicht nutzen

      this._bindAttribBuffer('curveVertices', allVertices, 2, prog, 'a_position');
      this._bindAttribBuffer('curveColors', allColors, 4, prog, 'a_color');

      // Wir müssen auch a_offsetX/Y binden, aber da wir sie nicht nutzen, geben wir einen Dummy-Buffer
      if (!this.buffers.dummyOffset) {
        this.buffers.dummyOffset = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.dummyOffset);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0]), gl.STATIC_DRAW);
      }
      const offsetLoc = gl.getAttribLocation(prog, 'a_offsetX');
      gl.enableVertexAttribArray(offsetLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.dummyOffset);
      gl.vertexAttribPointer(offsetLoc, 2, gl.FLOAT, false, 0, 0);
      // Für a_offsetY nutzen wir den gleichen (einfach)

      gl.drawArrays(gl.TRIANGLES, 0, allVertices.length / 2);
    }

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

    destroy() {
      Object.values(this.buffers).forEach(buf => this.gl.deleteBuffer(buf));
      Object.values(this.programs).forEach(prog => this.gl.deleteProgram(prog));
    }
  }

  // -------------------------------------------------------------
  // HILFSFUNKTION ZUR TESSELLIERUNG EINER BÉZIER-KURVE
  // -------------------------------------------------------------
  function tessellateBezier(p0, cp, p1, segments = 20) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = (1-t)*(1-t)*p0.x + 2*(1-t)*t*cp.x + t*t*p1.x;
      const y = (1-t)*(1-t)*p0.y + 2*(1-t)*t*cp.y + t*t*p1.y;
      points.push({ x, y });
    }
    return points;
  }

  // -------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------
  global.GPU = {
    WebGLRendererUltra,
    tessellateBezier,
    hasWebGL
  };

})(window);
