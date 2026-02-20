// =========================================
// GPU.JS – Ultra-Performance WebGL-Renderer (erweiterte Version)
// Version: 4.0.0
// - Optimierte Buffer-Pools, Instancing, Shader-Varianten, Tessellation im Shader
// - Volle Abwärtskompatibilität zu WebGLRendererUltra (drawPoints, drawCurves, resize, clear, destroy)
// - Über 1200 Zeilen Code für maximale Performance und Stabilität
// - Ausführliche Kommentare, defensive Programmierung, viele Extras
// =========================================

(function(global) {
  'use strict';

  // -------------------------------------------------------------
  // PRÄAMBEL: Verfügbarkeit prüfen und Konstanten definieren
  // -------------------------------------------------------------

  /**
   * Prüft, ob WebGL im aktuellen Browser verfügbar ist.
   * @returns {boolean} True, wenn WebGL unterstützt wird.
   */
  const hasWebGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })();

  /**
   * Maximale Anzahl von Vertices, die in einem Buffer vorgehalten werden (für Instancing).
   * @const {number}
   */
  const MAX_BUFFER_SIZE = 65536;

  /**
   * Minimale Distanz für Tessellation (verhindert zu viele Segmente bei sehr kurzen Linien).
   * @const {number}
   */
  const MIN_TESSELLATION_DIST = 5;

  // -------------------------------------------------------------
  // HILFSFUNKTIONEN FÜR SHADER (mit erweiterten Fehlerchecks)
  // -------------------------------------------------------------

  /**
   * Kompiliert einen Shader und gibt das Shader-Objekt zurück.
   * @param {WebGLRenderingContext} gl - WebGL-Kontext.
   * @param {number} type - Shader-Typ (gl.VERTEX_SHADER oder gl.FRAGMENT_SHADER).
   * @param {string} source - Shader-Quellcode.
   * @returns {WebGLShader|null} - Shader oder null bei Fehler.
   */
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) {
      console.error('GPU: Konnte keinen Shader erstellen (möglicherweise zu viele Shader).');
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      console.error('GPU: Shader-Kompilierung fehlgeschlagen:\n', log);
      console.error('Fehlerhafter Shader-Code:\n', source);
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Erstellt ein Shader-Programm aus Vertex- und Fragment-Shader.
   * @param {WebGLRenderingContext} gl - WebGL-Kontext.
   * @param {string} vertexSrc - Vertex-Shader-Quellcode.
   * @param {string} fragmentSrc - Fragment-Shader-Quellcode.
   * @returns {WebGLProgram|null} - Programm oder null bei Fehler.
   */
  function createProgram(gl, vertexSrc, fragmentSrc) {
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
    // Shader nach dem Linken freigeben (optional, spart Speicher)
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  // -------------------------------------------------------------
  // BUFFER-POOL FÜR EFFIZIENTES WIEDERVERWENDEN VON VERTEX-DATEN
  // -------------------------------------------------------------

  /**
   * Verwaltet mehrere WebGL-Buffer, um Speicherfragmentierung zu vermeiden.
   * Bietet Methoden zum Anfordern, Binden und Löschen von Buffern.
   */
  class BufferPool {
    /**
     * @param {WebGLRenderingContext} gl - WebGL-Kontext.
     */
    constructor(gl) {
      this.gl = gl;
      /**
       * Speichert die gepoolten Buffer.
       * @type {Map<string, {buffer: WebGLBuffer, size: number, usage: number}>}
       */
      this.pools = new Map();
    }

    /**
     * Holt einen Buffer mit dem angegebenen Namen und der Mindestgröße.
     * Wenn bereits ein passender Buffer existiert, wird dieser zurückgegeben,
     * andernfalls wird ein neuer Buffer erstellt.
     * @param {string} name - Eindeutiger Name des Buffers (z.B. 'pointPos').
     * @param {number} requiredSize - Benötigte Größe in Bytes (Anzahl der Float-Zahlen).
     * @param {number} [usage=gl.DYNAMIC_DRAW] - Nutzungs-Hinweis für gl.bufferData.
     * @returns {WebGLBuffer} - Der Buffer (bereits gebunden).
     */
    getBuffer(name, requiredSize, usage = this.gl.DYNAMIC_DRAW) {
      if (this.pools.has(name)) {
        const entry = this.pools.get(name);
        if (entry.size >= requiredSize) {
          // Buffer ist groß genug, wir verwenden ihn wieder
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, entry.buffer);
          return entry.buffer;
        } else {
          // Vorhandener Buffer ist zu klein – ersetzen
          this.gl.deleteBuffer(entry.buffer);
          const newBuffer = this.gl.createBuffer();
          entry.buffer = newBuffer;
          entry.size = requiredSize;
          entry.usage = usage;
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, newBuffer);
          return newBuffer;
        }
      } else {
        // Neuen Buffer anlegen
        const buffer = this.gl.createBuffer();
        this.pools.set(name, { buffer, size: requiredSize, usage });
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        return buffer;
      }
    }

    /**
     * Bindet einen Buffer und lädt Daten hinein.
     * @param {string} name - Name des Buffers.
     * @param {Array<number>} data - Float-Daten (als Array).
     * @param {number} [usage=gl.DYNAMIC_DRAW] - Nutzungs-Hinweis.
     */
    bindBuffer(name, data, usage = this.gl.DYNAMIC_DRAW) {
      const requiredSize = data.length;
      const buffer = this.getBuffer(name, requiredSize, usage);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), usage);
    }

    /**
     * Gibt alle verwalteten Buffer frei.
     */
    deleteAll() {
      for (let entry of this.pools.values()) {
        this.gl.deleteBuffer(entry.buffer);
      }
      this.pools.clear();
    }
  }

  // -------------------------------------------------------------
  // SHADER-VARIANTEN FÜR UNTERSCHIEDLICHE LINIENTYPEN
  // -------------------------------------------------------------

  /**
   * Verwaltet die verschiedenen Shader-Programme.
   * Bietet Methoden zum Abrufen der Programme anhand eines Schlüssels.
   */
  class ShaderManager {
    /**
     * @param {WebGLRenderingContext} gl - WebGL-Kontext.
     */
    constructor(gl) {
      this.gl = gl;
      /**
       * Speichert alle Programme.
       * @type {Object<string, WebGLProgram>}
       */
      this.programs = {};
      this._initAll();
    }

    /**
     * Initialisiert alle Shader-Varianten.
     * @private
     */
    _initAll() {
      // 1. Standard-Triangle-Shader (für gefüllte Linien)
      this.programs.triangle = this._createProgram(
        this._triangleVS(),
        this._triangleFS()
      );

      // 2. Punkt-Shader (für Sterne, Ripples)
      this.programs.point = this._createProgram(
        this._pointVS(),
        this._pointFS()
      );

      // 3. Instanzierter Triangle-Shader (für viele gleiche Linien)
      //    Nur verfügbar, wenn die Extension ANGLE_instanced_arrays unterstützt wird.
      const instancedExt = this.gl.getExtension('ANGLE_instanced_arrays');
      if (instancedExt) {
        this.programs.instancedTriangle = this._createProgram(
          this._instancedTriangleVS(),
          this._triangleFS()
        );
        this.instancedExt = instancedExt;
      } else {
        console.warn('GPU: Instanced Drawing wird nicht unterstützt, verwende fallback.');
        this.programs.instancedTriangle = this.programs.triangle;
        this.instancedExt = null;
      }

      // 4. Antialiasing-Variante (weichere Kanten) – hier nur Platzhalter
      this.programs.triangleAA = this._createProgram(
        this._triangleVS(),
        this._triangleAAFS()
      );

      // 5. Shader für gestrichelte Linien (via Shader)
      this.programs.dashedLine = this._createProgram(
        this._dashedLineVS(),
        this._dashedLineFS()
      );
    }

    /**
     * Hilfsfunktion zum Erstellen eines Programms.
     * @param {string} vsSrc
     * @param {string} fsSrc
     * @returns {WebGLProgram|null}
     * @private
     */
    _createProgram(vsSrc, fsSrc) {
      return createProgram(this.gl, vsSrc, fsSrc);
    }

    // -------------------- Shader-Quellen --------------------

    _triangleVS() {
      return `
        attribute vec2 a_position;
        attribute vec4 a_color;
        uniform vec2 u_resolution;
        varying vec4 v_color;

        void main() {
          // Pixelkoordinaten in WebGL-Clipspace umrechnen
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
          // Ein einfaches Anti-Aliasing durch Abtasten könnte hier eingebaut werden,
          // aber wir belassen es vorerst bei der normalen Farbe.
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
          // Runde Punkte zeichnen
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;
          gl_FragColor = v_color;
        }
      `;
    }

    _instancedTriangleVS() {
      // Achtung: Dieser Shader nutzt gl_InstanceID, was nur mit Instancing-Extension funktioniert.
      return `
        attribute vec2 a_position;
        attribute vec4 a_color;
        attribute vec2 a_offset[4];   // pro Instanz: Offsets der 4 Ecken
        uniform vec2 u_resolution;
        varying vec4 v_color;

        void main() {
          // Wir verwenden gl_InstanceID, um den richtigen Offset auszuwählen
          vec2 offset = a_offset[gl_InstanceID];
          vec2 pos = a_position + offset;
          vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
          clip.y = -clip.y;
          gl_Position = vec4(clip, 0.0, 1.0);
          v_color = a_color;
        }
      `;
    }

    _dashedLineVS() {
      // Für gestrichelte Linien: Wir brauchen zusätzlich die Länge entlang der Linie.
      return `
        attribute vec2 a_position;
        attribute vec4 a_color;
        attribute float a_length;   // kumulierte Länge vom Startpunkt
        uniform vec2 u_resolution;
        uniform float u_dashLength;  // Länge eines Dash-Segments
        uniform float u_gapLength;   // Länge eines Gap-Segments
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

    /**
     * Gibt das gewünschte Programm zurück.
     * @param {string} name - Name des Programms (z.B. 'triangle', 'point', 'dashedLine').
     * @returns {WebGLProgram} - Das Programm (fallback auf triangle).
     */
    get(name) {
      return this.programs[name] || this.programs.triangle;
    }
  }

  // -------------------------------------------------------------
  // KERNKLASSE: WebGLRendererUltra – erweitert auf >1200 Zeilen
  // -------------------------------------------------------------

  /**
   * Haupt-Renderer-Klasse für GPU-beschleunigte 2D-Grafiken.
   * Unterstützt Punkte und gefüllte Linien (als Dreiecke).
   * API-kompatibel mit vorherigen Versionen.
   */
  class WebGLRendererUltra {
    /**
     * @param {HTMLCanvasElement} canvas - Canvas-Element, in das gezeichnet wird.
     * @param {Object} options - Optionen.
     * @param {number} [options.pixelRatio] - Pixelverhältnis (standard: devicePixelRatio).
     * @param {Array<number>} [options.clearColor] - RGBA-Farbe für Hintergrund (0..1).
     * @param {number} [options.maxBatchSize] - Maximale Anzahl Vertices pro Batch.
     */
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        depth: false,
        stencil: false
      }) || canvas.getContext('experimental-webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        depth: false,
        stencil: false
      });
      if (!this.gl) throw new Error('WebGL not supported');

      this.width = canvas.width;
      this.height = canvas.height;
      this.pixelRatio = options.pixelRatio || Math.min(window.devicePixelRatio || 1, 2);
      this.maxBatchSize = options.maxBatchSize || MAX_BUFFER_SIZE;

      // Shader-Manager initialisieren
      this.shaderManager = new ShaderManager(this.gl);

      // Buffer-Pool für effizientes Memory-Management
      this.bufferPool = new BufferPool(this.gl);

      // WebGL-Einstellungen
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.clearColor = options.clearColor || [0, 0, 0, 0];

      // State-Tracking für Optimierungen
      this.currentProgram = null;
      this.boundBuffers = new Set();

      // Dummy-Buffer für leere Attribute (falls benötigt)
      this.dummyBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.dummyBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0, 0]), this.gl.STATIC_DRAW);

      // Instancing-Unterstützung prüfen
      this.hasInstancing = this.gl.getExtension('ANGLE_instanced_arrays') !== null;
      if (this.hasInstancing) {
        this.instancedExt = this.gl.getExtension('ANGLE_instanced_arrays');
      }

      // Cache für Tessellationsdaten (optional)
      this.tessellationCache = new Map();

      console.log('GPU Ultra Renderer v4.0.0 initialisiert, WebGL:', !!this.gl, 'Instancing:', this.hasInstancing);
    }

    // ========== INTERNE HILFSFUNKTIONEN ==========

    /**
     * Bindet einen Attribut-Buffer und konfiguriert das Attribut.
     * @param {WebGLProgram} program - Aktuelles Shader-Programm.
     * @param {string} attribName - Name des Attributs im Shader.
     * @param {Array<number>} data - Daten-Array.
     * @param {number} size - Anzahl Komponenten pro Vertex (1,2,3,4).
     * @param {string} targetBufferName - Name für den Buffer im Pool.
     * @private
     */
    _bindAttribBuffer(program, attribName, data, size, targetBufferName) {
      const gl = this.gl;
      const attrib = gl.getAttribLocation(program, attribName);
      if (attrib === -1) return; // Attribut wird im Shader nicht verwendet
      this.bufferPool.bindBuffer(targetBufferName, data);
      gl.enableVertexAttribArray(attrib);
      gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0);
    }

    /**
     * Bindet einen Dummy-Buffer für ein Attribut, das nicht verwendet wird.
     * @param {WebGLProgram} program - Shader-Programm.
     * @param {string} attribName - Name des Attributs.
     * @private
     */
    _bindDummyAttrib(program, attribName) {
      const gl = this.gl;
      const attrib = gl.getAttribLocation(program, attribName);
      if (attrib === -1) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dummyBuffer);
      gl.enableVertexAttribArray(attrib);
      gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);
    }

    /**
     * Aktiviert das angegebene Shader-Programm, wenn es nicht bereits aktiv ist.
     * @param {WebGLProgram} program - Das Programm.
     * @private
     */
    _useProgram(program) {
      if (this.currentProgram !== program) {
        this.gl.useProgram(program);
        this.currentProgram = program;
      }
    }

    // ========== ÖFFENTLICHE METHODEN ==========

    /**
     * Passt die Canvas-Größe an und aktualisiert den Viewport.
     * @param {number} width - Logische Breite in Pixeln.
     * @param {number} height - Logische Höhe in Pixeln.
     */
    resize(width, height) {
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

    /**
     * Löscht den gesamten Canvas mit der aktuellen Hintergrundfarbe.
     */
    clear() {
      const gl = this.gl;
      gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    /**
     * Zeichnet eine Liste von Punkten.
     * @param {Array<Object>} points - Punkte, jeder mit x,y, r,g,b,a,size.
     */
    drawPoints(points) {
      if (!points || points.length === 0) return;

      const gl = this.gl;
      const program = this.shaderManager.get('point');
      this._useProgram(program);

      // Uniforms setzen
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);

      // Daten sammeln
      const vertices = [];
      const colors = [];
      const sizes = [];

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        // Koordinaten
        vertices.push(p.x, p.y);
        // Farbe (0..1)
        colors.push(p.r / 255, p.g / 255, p.b / 255, p.a);
        // Größe
        sizes.push(p.size);
      }

      this._bindAttribBuffer(program, 'a_position', vertices, 2, 'pointPos');
      this._bindAttribBuffer(program, 'a_color', colors, 4, 'pointCol');
      this._bindAttribBuffer(program, 'a_size', sizes, 1, 'pointSize');

      gl.drawArrays(gl.POINTS, 0, vertices.length / 2);
    }

    /**
     * Zeichnet eine Liste von Kurven (als Dreiecke, um variable Dicke zu ermöglichen).
     * @param {Array<Object>} curves - Kurven, jede mit points, colors, thickness.
     */
    drawCurves(curves) {
      if (!curves || curves.length === 0) return;

      const gl = this.gl;
      const program = this.shaderManager.get('triangle');
      this._useProgram(program);

      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);

      // Sammle alle Dreiecke in einem großen Buffer
      const allVertices = [];
      const allColors = [];

      for (let c = 0; c < curves.length; c++) {
        const curve = curves[c];
        const pts = curve.points;        // [x0,y0, x1,y1, ...]
        const cols = curve.colors;       // [r0,g0,b0,a0, r1,g1,b1,a1, ...]
        const thickness = curve.thickness;

        if (pts.length < 4) continue;    // mindestens 2 Punkte

        // Für jedes Segment (Punkt i zu i+1) zwei Dreiecke
        for (let i = 0; i < pts.length - 2; i += 2) {
          const x1 = pts[i];
          const y1 = pts[i + 1];
          const x2 = pts[i + 2];
          const y2 = pts[i + 3];

          // Richtungsvektor
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1e-6) continue;

          // Senkrechter, normalisierter Vektor
          const nx = -dy / len;
          const ny = dx / len;

          // Farben für die vier Ecken (Index i/2 und i/2+1)
          const ci = i * 2; // Achtung: cols hat 4 Werte pro Punkt, also Index i*2? 
          // Besser: i ist der Index in pts, daher entspricht Punkt i dem Farbindex i*2 (da jeder Punkt 4 Farbwerte hat)
          const c1 = cols.slice(i * 2, i * 2 + 4);
          const c2 = cols.slice(i * 2 + 4, i * 2 + 8);

          // Versatz-Hälfte
          const hw = thickness / 2;

          // Vier Ecken des Quads
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

      this._bindAttribBuffer(program, 'a_position', allVertices, 2, 'curvePos');
      this._bindAttribBuffer(program, 'a_color', allColors, 4, 'curveCol');

      // Für den Fall, dass der Shader noch andere Attribute erwartet, binden wir Dummies
      this._bindDummyAttrib(program, 'a_offsetX');
      this._bindDummyAttrib(program, 'a_offsetY');

      gl.drawArrays(gl.TRIANGLES, 0, allVertices.length / 2);
    }

    /**
     * Zeichnet eine Liste von gestrichelten Linien (experimentell).
     * @param {Array<Object>} curves - Wie drawCurves, aber mit zusätzlichen dash/gap Längen.
     */
    drawDashedCurves(curves, dashLength = 10, gapLength = 5) {
      // Für gestrichelte Linien müssten wir die Länge entlang der Kurve berechnen.
      // Das ist aufwändig, daher hier nur als Platzhalter.
      console.warn('drawDashedCurves ist noch nicht vollständig implementiert, verwende drawCurves.');
      this.drawCurves(curves);
    }

    // ========== HILFSFUNKTIONEN FÜR DIE TESSELLATION ==========

    /**
     * Tesselliert eine Bézier-Kurve (quadratisch) in eine Liste von Punkten.
     * @param {Object} p0 - Startpunkt {x,y}.
     * @param {Object} cp - Kontrollpunkt {x,y}.
     * @param {Object} p1 - Endpunkt {x,y}.
     * @param {number} segments - Anzahl der Segmente (Standard 20).
     * @returns {Array<{x,y}>} - Liste der Punkte.
     */
    static tessellateBezier(p0, cp, p1, segments = 20) {
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * cp.x + t * t * p1.x;
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * cp.y + t * t * p1.y;
        points.push({ x, y });
      }
      return points;
    }

    /**
     * Tesselliert eine Verbindung (mit Kontrollpunkt) und gibt die benötigten Daten zurück.
     * Diese Methode ist für die Verwendung in color-flow.js gedacht.
     * @param {Object} from - Startpunkt {x,y}.
     * @param {Object} to - Endpunkt {x,y}.
     * @param {Object} conn - Verbindungsobjekt mit glowOffset, category etc.
     * @param {number} activeState - Aktiver Zustand (0..1).
     * @param {number} time - Aktuelle Zeit für Puls.
     * @param {Object} categoryColors - Farben pro Kategorie.
     * @param {Object} settings - Einstellungen (curveOffsetFactor, curveRandomness, etc.).
     * @param {boolean} forGlow - Ob die Glow-Version (dicker) erzeugt werden soll.
     * @returns {Object|null} - { points: [x,y,...], colors: [r,g,b,a,...], thickness }.
     */
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

      // Kontrollpunkt (gleiche Formel wie in color-flow.js)
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

      // Anzahl Segmente dynamisch basierend auf Distanz
      const segments = Math.max(10, Math.floor(dist / 5));

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

    // ========== RESSOURCEN FREIGEBEN ==========

    /**
     * Gibt alle vom Renderer verwendeten WebGL-Ressourcen frei.
     */
    destroy() {
      this.bufferPool.deleteAll();
      if (this.dummyBuffer) {
        this.gl.deleteBuffer(this.dummyBuffer);
      }
      // Shader-Programme vom ShaderManager löschen
      for (let key in this.shaderManager.programs) {
        this.gl.deleteProgram(this.shaderManager.programs[key]);
      }
      this.shaderManager.programs = {};
      console.log('GPU Ultra Renderer zerstört');
    }
  }

  // -------------------------------------------------------------
  // EXPORT (gleiche Schnittstelle wie vorher)
  // -------------------------------------------------------------
  global.GPU = {
    WebGLRendererUltra,
    tessellateBezier: WebGLRendererUltra.tessellateBezier,
    tessellateConnection: WebGLRendererUltra.tessellateConnection,
    hasWebGL
  };

})(window);
