// =========================================
// QUANTUM AI HUB — SMART COLOR FLOW
// Production Ready Version 1.0
// =========================================

'use strict';

class SmartColorFlow {

  constructor() {

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'connection-canvas';

    this.ctx = this.canvas.getContext('2d', { alpha: true });

    this.tools = [];
    this.colors = {
      text: '#00E5FF',
      image: '#FF3DFF',
      code: '#00FF88',
      audio: '#FFA726',
      video: '#FF5252',
      other: '#9E9E9E'
    };

    this.routingCellSize = 18;
    this.routingPad = 6;

    this._grid = null;

    this.resizeObserver = null;

    document.body.appendChild(this.canvas);

    this.setupCanvas();
    this.observeTools();
    this.start();

    console.log('✅ SmartColorFlow initialized');
  }

  setupCanvas() {

    const dpr = window.devicePixelRatio || 1;

    const rect = document.documentElement.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  }

  observeTools() {

    const scan = () => {

      const elements = document.querySelectorAll('.card-square');

      this.tools = Array.from(elements).map(el => ({
        element: el,
        category: el.dataset.category || 'other',
        connections: []
      }));

      this.calculateConnectionsWithRouting();

    };

    scan();

    const observer = new MutationObserver(() => {
      scan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener('resize', () => {
      this.setupCanvas();
      scan();
    });

  }

  start() {

    const loop = () => {

      this.draw();

      requestAnimationFrame(loop);

    };

    requestAnimationFrame(loop);

  }

  draw() {

    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.tools.forEach(tool => {

      if (!tool.connections) return;

      tool.connections.forEach(conn => {

        if (conn.path) {

          this.drawPath(ctx, conn.path, conn.color, 2);

        } else {

          const r1 = tool.element.getBoundingClientRect();
          const r2 = conn.target.element.getBoundingClientRect();

          ctx.beginPath();

          ctx.moveTo(
            r1.left + r1.width / 2,
            r1.top + r1.height / 2
          );

          ctx.lineTo(
            r2.left + r2.width / 2,
            r2.top + r2.height / 2
          );

          ctx.strokeStyle = conn.color;
          ctx.lineWidth = 1;
          ctx.stroke();

        }

      });

    });

  }

  // =========================================
  // GRID SYSTEM
  // =========================================

  buildGrid(cellSize = 18) {

    const rect = this.canvas.getBoundingClientRect();

    const cols = Math.ceil(rect.width / cellSize);
    const rows = Math.ceil(rect.height / cellSize);

    this._grid = {
      cellSize,
      cols,
      rows,
      rect,
      cells: new Uint8Array(cols * rows)
    };

  }

  gridIndex(c, r) {
    return r * this._grid.cols + c;
  }

  markObstaclesFromTools(pad = 6) {

    const g = this._grid;

    g.cells.fill(0);

    this.tools.forEach(t => {

      const rect = t.element.getBoundingClientRect();

      const left = rect.left - g.rect.left;
      const top = rect.top - g.rect.top;
      const right = rect.right - g.rect.left;
      const bottom = rect.bottom - g.rect.top;

      const c1 = Math.floor((left - pad) / g.cellSize);
      const r1 = Math.floor((top - pad) / g.cellSize);

      const c2 = Math.ceil((right + pad) / g.cellSize);
      const r2 = Math.ceil((bottom + pad) / g.cellSize);

      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {

          if (c >= 0 && r >= 0 && c < g.cols && r < g.rows) {
            g.cells[this.gridIndex(c, r)] = 1;
          }

        }
      }

    });

  }

  calculateConnectionsWithRouting() {

    this.buildGrid(this.routingCellSize);

    this.markObstaclesFromTools(this.routingPad);

    this.tools.forEach((t, i) => {

      t.connections = [];

      const rect1 = t.element.getBoundingClientRect();

      const center1 = {
        x: rect1.left + rect1.width / 2,
        y: rect1.top + rect1.height / 2
      };

      this.tools.slice(i + 1).forEach(t2 => {

        const rect2 = t2.element.getBoundingClientRect();

        const center2 = {
          x: rect2.left + rect2.width / 2,
          y: rect2.top + rect2.height / 2
        };

        const path = [center1, center2];

        const color = this.colors[t.category] || this.colors.other;

        t.connections.push({
          target: t2,
          path,
          color
        });

        t2.connections.push({
          target: t,
          path: [...path].reverse(),
          color
        });

      });

    });

  }

  drawPath(ctx, pts, color, width = 2) {

    if (!pts || pts.length < 2) return;

    ctx.beginPath();

    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();

  }

}

// =========================================
// INITIALIZE WHEN APP READY
// =========================================

window.addEventListener('quantum:ready', () => {

  if (window.colorFlow) return;

  window.colorFlow = new SmartColorFlow();

});