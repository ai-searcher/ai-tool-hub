/* ===========================
   ROUTING / OBSTACLE AVOIDANCE (CSS-pixel-kompatibel)
   (Replace the corresponding methods inside SmartColorFlow)
   =========================== */

buildGrid(cellSize = 18) {
  // cellSize is in CSS pixels (not device pixels) — keep consistent with getBoundingClientRect()
  const canvasRect = this.canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, canvasRect.width);
  const cssHeight = Math.max(1, canvasRect.height);

  const cols = Math.max(1, Math.ceil(cssWidth / cellSize));
  const rows = Math.max(1, Math.ceil(cssHeight / cellSize));

  this._grid = {
    cellSize,      // CSS px per cell
    cols,
    rows,
    cssWidth,
    cssHeight,
    canvasRect,    // cache for conversions
    cells: new Uint8Array(cols * rows) // 0 = free, 1 = obstacle
  };
  return this._grid;
}

_gridIndex(col, row) {
  return row * this._grid.cols + col;
}

markObstaclesFromTools(pad = 6) {
  if (!this._grid) this.buildGrid();
  const { cellSize, cols, rows, cells, canvasRect } = this._grid;
  // reset obstacle map
  cells.fill(0);

  // For coordinate conversions: use CSS coordinates relative to canvas
  // pad is in CSS px
  this.tools.forEach(t => {
    if (!t.element) return;
    const rect = t.element.getBoundingClientRect();
    // compute bounds relative to canvas (CSS px)
    const left = rect.left - canvasRect.left;
    const top = rect.top - canvasRect.top;
    const right = rect.right - canvasRect.left;
    const bottom = rect.bottom - canvasRect.top;

    const x1 = Math.max(0, Math.floor((left - pad) / cellSize));
    const y1 = Math.max(0, Math.floor((top - pad) / cellSize));
    const x2 = Math.min(cols - 1, Math.ceil((right + pad) / cellSize));
    const y2 = Math.min(rows - 1, Math.ceil((bottom + pad) / cellSize));

    for (let r = y1; r <= y2; r++) {
      for (let c = x1; c <= x2; c++) {
        cells[this._gridIndex(c, r)] = 1;
      }
    }
  });
}

_pointToGrid(pt) {
  // pt is expected in CSS/viewport coordinates (e.g. from getBoundingClientRect centers)
  // convert to coordinates relative to canvas (CSS px) then to grid cell
  if (!this._grid) this.buildGrid();
  const { cellSize, cols, rows, canvasRect } = this._grid;
  const localX = pt.x - canvasRect.left;
  const localY = pt.y - canvasRect.top;
  return {
    c: Math.max(0, Math.min(cols - 1, Math.floor(localX / cellSize))),
    r: Math.max(0, Math.min(rows - 1, Math.floor(localY / cellSize)))
  };
}

_gridToPoint(node) {
  // returns a point in CSS pixels relative to the canvas (center of cell)
  const { cellSize, canvasRect } = this._grid;
  return {
    x: node.c * cellSize + cellSize / 2 + canvasRect.left,
    y: node.r * cellSize + cellSize / 2 + canvasRect.top
  };
}

/* Simple A* on grid (4-way or 8-way neighbors) */
findPathAstar(startPt, endPt, allowDiagonal = true, maxNodes = 5000) {
  if (!this._grid) this.buildGrid();
  const { cols, rows, cells } = this._grid;
  const start = this._pointToGrid(startPt);
  const goal  = this._pointToGrid(endPt);
  const key = (c, r) => (r * cols + c);

  // quick bounds check
  if (cells[key(goal.c, goal.r)] === 1 || cells[key(start.c, start.r)] === 1) {
    return null; // no path if start or goal inside obstacle
  }

  const open = new TinyHeap((a,b) => a.f - b.f);
  const cameFrom = new Int32Array(cols * rows).fill(-1);
  const gScore = new Float32Array(cols * rows).fill(Infinity);
  const fScore = new Float32Array(cols * rows).fill(Infinity);
  const startIdx = key(start.c, start.r);
  gScore[startIdx] = 0;
  fScore[startIdx] = this._heuristic(start, goal);
  open.push({ idx: startIdx, c: start.c, r: start.r, f: fScore[startIdx] });

  const neighborOffsets = allowDiagonal ? 
    [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] :
    [[1,0],[-1,0],[0,1],[0,-1]];

  let processed = 0;
  while (open.size() && processed < maxNodes) {
    const cur = open.pop();
    processed++;
    const curIdx = cur.idx;
    if (curIdx === key(goal.c, goal.r)) {
      // reconstruct path
      const path = [];
      let node = curIdx;
      while (node !== -1) {
        const c = node % cols;
        const r = Math.floor(node / cols);
        path.push({ c, r });
        node = cameFrom[node];
      }
      path.reverse();
      return path.map(n => this._gridToPoint(n));
    }

    // neighbors
    for (let i = 0; i < neighborOffsets.length; i++) {
      const nc = cur.c + neighborOffsets[i][0];
      const nr = cur.r + neighborOffsets[i][1];
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const nIdx = key(nc, nr);
      if (cells[nIdx] === 1) continue; // obstacle
      const tentativeG = gScore[curIdx] + ((i < 4) ? 1 : 1.4142); // diag cost
      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = curIdx;
        gScore[nIdx] = tentativeG;
        const h = this._heuristic({c:nc,r:nr}, goal);
        fScore[nIdx] = tentativeG + h;
        open.push({ idx: nIdx, c: nc, r: nr, f: fScore[nIdx] });
      }
    }
  }
  return null; // failed or too long
}

_heuristic(a, b) {
  // diagonal-aware octile distance
  const dx = Math.abs(a.c - b.c);
  const dy = Math.abs(a.r - b.r);
  return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy);
}

/* Tiny binary heap implementation (min-heap) - lightweight */
class TinyHeap {
  constructor(cmp){ this.cmp = cmp; this.nodes = []; }
  push(x){ this.nodes.push(x); this._siftUp(this.nodes.length-1); }
  pop(){ if(this.nodes.length===0) return null; const r=this.nodes[0]; const last=this.nodes.pop(); if(this.nodes.length){this.nodes[0]=last; this._siftDown(0);} return r; }
  size(){ return this.nodes.length; }
  _siftUp(i){ const n=this.nodes; const cmp=this.cmp; while(i>0){const p=(i-1)>>1; if(cmp(n[i],n[p])>=0) break; [n[i],n[p]]=[n[p],n[i]]; i=p;} }
  _siftDown(i){ const n=this.nodes; const cmp=this.cmp; const len=n.length; while(true){ let l=i*2+1; if(l>=len) break; let r=l+1; let m=l; if(r<len && cmp(n[r], n[l])<0) m=r; if(cmp(n[m], n[i])>=0) break; [n[i], n[m]]=[n[m], n[i]]; i=m; } }
}

/* Smooth path (Chaikin's corner-cutting) */
smoothPath(points, iterations = 2) {
  if (!points || points.length < 3) return points;
  let pts = points.map(p => ({x: p.x, y: p.y}));
  for (let it = 0; it < iterations; it++) {
    const out = [];
    out.push(pts[0]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i+1];
      const Q = { x: 0.75*p0.x + 0.25*p1.x, y: 0.75*p0.y + 0.25*p1.y };
      const R = { x: 0.25*p0.x + 0.75*p1.x, y: 0.25*p0.y + 0.75*p1.y };
      out.push(Q);
      out.push(R);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

/* draw path on canvas context (expects already scaled coords) */
drawPath(ctx, pts, color, width = 2, dashed = false) {
  if (!pts || pts.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  if (dashed) ctx.setLineDash([6,6]); else ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

/* Integration: replace simple connection calc with route-based one */
calculateConnectionsWithRouting() {
  // ensure grid exists and obstacles are up-to-date
  this.buildGrid(this.routingCellSize || 18);
  this.markObstaclesFromTools(this.routingPad || 6);

  // for each tool compute anchors and path to others (or a subset)
  this.tools.forEach((t, i) => {
    t.connections = [];
    const rect1 = t.element.getBoundingClientRect();
    const anchors1 = [
      { x: rect1.left - 6, y: rect1.top + rect1.height / 2 }, // left
      { x: rect1.right + 6, y: rect1.top + rect1.height / 2 }, // right
      { x: rect1.left + rect1.width/2, y: rect1.top - 6 }, // top
      { x: rect1.left + rect1.width/2, y: rect1.bottom + 6 } // bottom
    ];

    this.tools.slice(i+1).forEach(t2 => {
      const rect2 = t2.element.getBoundingClientRect();
      const anchors2 = [
        { x: rect2.left - 6, y: rect2.top + rect2.height / 2 },
        { x: rect2.right + 6, y: rect2.top + rect2.height / 2 },
        { x: rect2.left + rect2.width/2, y: rect2.top - 6 },
        { x: rect2.left + rect2.width/2, y: rect2.bottom + 6 }
      ];

      // try combinations of anchors to find a viable path
      let bestPath = null;
      for (const a1 of anchors1) {
        for (const a2 of anchors2) {
          const rawPath = this.findPathAstar(a1, a2, true, 8000);
          if (!rawPath) continue;
          const smooth = this.smoothPath(rawPath, 2);
          // choose shortest euclidean length
          const len = smooth.reduce((acc, p, idx, arr) => {
            if (idx === 0) return 0;
            const dx = p.x - arr[idx-1].x; const dy = p.y - arr[idx-1].y;
            return acc + Math.hypot(dx,dy);
          }, 0);
          if (!bestPath || len < bestPath.len) bestPath = { path: smooth, len, start: a1, end: a2 };
        }
      }

      if (bestPath) {
        const color = this.colors[t.category] || this.colors.other;
        t.connections.push({ target: t2, path: bestPath.path, color });
        // symmetrical
        t2.connections = t2.connections || [];
        t2.connections.push({ target: t, path: bestPath.path.slice().reverse(), color });
      } else {
        // fallback: store null -> calling draw will use simple bezier or low alpha line
        t.connections.push({ target: t2, path: null, color: this.colors.other });
      }
    });
  });
}

/* Hook into your draw() function:
   when drawing connections, check connection.path; if present use drawPath(),
   otherwise fallback to previous bezier draw. */