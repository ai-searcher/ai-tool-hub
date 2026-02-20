const fs = require('fs');

const BASE_URL = 'https://ai-searcher.github.io/ai-tool-hub';
const DATA_FILE = './data.json';
const OUTPUT_FILE = './sitemap.xml';

// Daten laden
const raw = fs.readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(raw);
const tools = data.tools || [];
const lastUpdated = data.meta?.last_updated || new Date().toISOString().split('T')[0];

// Sitemap aufbauen
let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

// Hauptseite
sitemap += `  <url>\n`;
sitemap += `    <loc>${BASE_URL}/</loc>\n`;
sitemap += `    <lastmod>${lastUpdated}</lastmod>\n`;
sitemap += `    <changefreq>weekly</changefreq>\n`;
sitemap += `    <priority>1.0</priority>\n`;
sitemap += `  </url>\n`;

// Jedes Tool als eigene Seite
tools.forEach(tool => {
  const toolDate = tool.added ? tool.added.split('T')[0] : lastUpdated;
  sitemap += `  <url>\n`;
  sitemap += `    <loc>${BASE_URL}/detail.html?id=${tool.id}</loc>\n`;
  sitemap += `    <lastmod>${toolDate}</lastmod>\n`;
  sitemap += `    <changefreq>monthly</changefreq>\n`;
  sitemap += `    <priority>0.8</priority>\n`;
  sitemap += `  </url>\n`;
});

sitemap += '</urlset>';

// Datei schreiben
fs.writeFileSync(OUTPUT_FILE, sitemap);
console.log(`✅ Sitemap mit ${tools.length + 1} URLs erfolgreich unter ${OUTPUT_FILE} erstellt!`);