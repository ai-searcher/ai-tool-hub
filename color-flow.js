// ==================== SMART COLOR FLOW SYSTEM ====================

class SmartColorFlow {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.tools = [];
    this.focusedTool = null;
    
    this.colors = {
      text: { r: 0, g: 243, b: 255 },
      image: { r: 236, g: 72, b: 153 },
      code: { r: 139, g: 92, b: 246 },
      video: { r: 239, g: 68, b: 68 },
      audio: { r: 255, g: 107, b: 157 },
       { r: 29, g: 233, b: 182 },
      other: { r: 176, g: 190, b: 197 }
    };
  }
  
  async init() {
    console.log('🎨 Color Flow starting...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      if (window.appState && window.appState.tools && window.appState.tools.length > 0) {
        this.start();
      } else {
        this.waitForTools();
      }
    }
  }
  
  waitForTools() {
    const check = setInterval(() => {
      if (window.appState && window.appState.tools && window.appState.tools.length > 0) {
        clearInterval(check);
        this.start();
      }
    }, 100);
    
    setTimeout(() => clearInterval(check), 10000);
  }
  
  start() {
    this.canvas = document.getElementById('connection-canvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.setupCanvas();
    this.parseTools();
    this.calculateConnections();
    this.setupScrollObserver();
    this.setupTouchInteractions();
    this.setupLegend();
    this.showOnboardingIfNeeded();
    this.draw();
    
    window.addEventListener('resize', () => this.requestRedraw());
    window.addEventListener('scroll', () => this.requestRedraw(), { passive: true });
    
    console.log('✅ Color Flow ready!', this.tools.length, 'tools');
  }
  
  setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = document.documentElement.scrollHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = document.documentElement.scrollHeight + 'px';
    this.ctx.scale(dpr, dpr);
  }
  
  parseTools() {
    const toolElements = document.querySelectorAll('.card-square');
    this.tools = Array.from(toolElements).map(el => ({
      id: el.dataset.toolId || el.querySelector('.square-title-large')?.textContent,
      element: el,
      category: el.dataset.category || 'other',
      position: null,
      connections: []
    }));
  }
  
  calculateConnections() {
    this.tools.forEach((tool1, i) => {
      this.tools.slice(i + 1).forEach(tool2 => {
        if (tool1.category === tool2.category) {
          const color = this.colors[tool1.category] || this.colors.other;
          tool1.connections.push({ tool: tool2, type: 'alternative', color, strength: 0.8 });
          tool2.connections.push({ tool: tool1, type: 'alternative', color, strength: 0.8 });
        }
      });
    });
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.tools.forEach(tool => {
      tool.position = this.getToolCenter(tool.element);
    });
    
    this.tools.forEach(tool => {
      tool.connections.forEach(conn => this.drawConnection(tool, conn));
    });
  }
  
  drawConnection(tool, connection) {
    const pos1 = tool.position;
    const pos2 = connection.tool.position;
    if (!pos1 || !pos2) return;
    
    const inViewport = this.isToolInViewport(tool) || this.isToolInViewport(connection.tool);
    let opacity = 0.1;
    
    if (this.focusedTool === tool.id || this.focusedTool === connection.tool.id) {
      opacity = 0.7;
    } else if (inViewport) {
      opacity = 0.25;
    }
    
    this.ctx.beginPath();
    this.ctx.moveTo(pos1.x, pos1.y);
    
    const midX = (pos1.x + pos2.x) / 2;
    const midY = (pos1.y + pos2.y) / 2;
    this.ctx.quadraticCurveTo(midX, midY - 30, pos2.x, pos2.y);
    
    this.ctx.lineWidth = connection.strength * 2;
    this.ctx.setLineDash(connection.type === 'alternative' ? [] : [10, 5]);
    
    const color = connection.color;
    this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
    
    if (opacity > 0.5) {
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`;
    } else {
      this.ctx.shadowBlur = 0;
    }
    
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.shadowBlur = 0;
  }
  
  getToolCenter(element) {
    const rect = element.getBoundingClientRect();
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    return {
      x: rect.left + scrollX + rect.width / 2,
      y: rect.top + scrollY + rect.height / 2
    };
  }
  
  isToolInViewport(tool) {
    const rect = tool.element.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    return center > window.innerHeight * 0.2 && center < window.innerHeight * 0.8;
  }
  
  setupScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const toolId = entry.target.dataset.toolId || 
                         entry.target.querySelector('.square-title-large')?.textContent;
          if (this.focusedTool !== toolId) {
            this.focusedTool = toolId;
            this.requestRedraw();
          }
        }
      });
    }, { threshold: [0.5], rootMargin: '-20% 0px -20% 0px' });
    
    this.tools.forEach(tool => observer.observe(tool.element));
  }
  
  setupTouchInteractions() {
    this.tools.forEach(tool => {
      tool.element.addEventListener('click', (e) => {
        if (!e.target.closest('a, button')) {
          e.preventDefault();
          this.showToolConnections(tool);
        }
      });
    });
  }
  
  showToolConnections(tool) {
    this.focusedTool = tool.id;
    this.draw();
    tool.element.classList.add('connection-active');
    
    setTimeout(() => {
      tool.element.classList.remove('connection-active');
      this.focusedTool = null;
      this.draw();
    }, 3000);
  }
  
  setupLegend() {
    const toggleBtn = document.querySelector('.legend-toggle');
    const panel = document.getElementById('legend-panel');
    const closeBtn = panel?.querySelector('.legend-close');
    
    if (!toggleBtn || !panel) return;
    
    toggleBtn.addEventListener('click', () => panel.classList.add('active'));
    if (closeBtn) closeBtn.addEventListener('click', () => panel.classList.remove('active'));
    panel.addEventListener('click', (e) => { if (e.target === panel) panel.classList.remove('active'); });
  }
  
  showOnboardingIfNeeded() {
    if (localStorage.getItem('colorflow-seen')) return;
    
    setTimeout(() => {
      const toast = document.createElement('div');
      toast.className = 'onboarding-toast';
      toast.innerHTML = `
        <div class="toast-content">
          <span class="toast-icon">💡</span>
          <div class="toast-text">
            <strong>Tipp:</strong>
            <small>Linien zeigen Tool-Beziehungen! Tippe auf ein Tool für Details.</small>
          </div>
        </div>
      `;
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('visible'));
      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
      }, 4000);
      localStorage.setItem('colorflow-seen', 'true');
    }, 1000);
  }
  
  requestRedraw() {
    if (this.updateTimeout) return;
    this.updateTimeout = setTimeout(() => {
      this.setupCanvas();
      this.draw();
      this.updateTimeout = null;
    }, 100);
  }
}

const colorFlow = new SmartColorFlow();
colorFlow.init();
