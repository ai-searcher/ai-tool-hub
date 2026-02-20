// build-sitemap.js – Erzeugt eine vollständige Sitemap mit allen 34 Tools
// Dieses Skript sollte nach jeder Änderung an data.json ausgeführt werden.
// Für die Automatisierung nutze den bereits beschriebenen GitHub Actions Workflow.

const fs = require('fs');
const path = require('path');

// ===== KONFIGURATION =====
const BASE_URL = 'https://ai-searcher.github.io/ai-tool-hub/';
const DATA_FILE = './data.json';
const OUTPUT_FILE = './sitemap.xml';

// ===== DATEN LADEN =====
const raw = fs.readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(raw);
const tools = data.tools || [];
const lastUpdated = data.meta?.last_updated || new Date().toISOString().split('T')[0];

// ===== SITEMAP AUFBAUEN =====
let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

// Hauptseite
sitemap += `  <url>\n`;
sitemap += `    <loc>${BASE_URL}/</loc>\n`;
sitemap += `    <lastmod>${lastUpdated}</lastmod>\n`;
sitemap += `    <changefreq>weekly</changefreq>\n`;
sitemap += `    <priority>1.0</priority>\n`;
sitemap += `  </url>\n`;

// Jede Tool-Detailseite (aktuell 34)
tools.forEach(tool => {
  // Falls es kein added-Datum gibt, verwende lastUpdated
  const toolDate = tool.added ? tool.added.split('T')[0] : lastUpdated;
  sitemap += `  <url>\n`;
  sitemap += `    <loc>${BASE_URL}/detail.html?id=${tool.id}</loc>\n`;
  sitemap += `    <lastmod>${toolDate}</lastmod>\n`;
  sitemap += `    <changefreq>monthly</changefreq>\n`;
  sitemap += `    <priority>0.8</priority>\n`;
  sitemap += `  </url>\n`;
});

sitemap += '</urlset>';

// ===== DATEI SCHREIBEN =====
fs.writeFileSync(OUTPUT_FILE, sitemap);
console.log(`✅ Sitemap mit ${tools.length + 1} URLs erfolgreich unter ${OUTPUT_FILE} erstellt!`);
