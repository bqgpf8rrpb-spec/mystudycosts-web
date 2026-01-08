const fs = require('fs');
const path = require('path');
const https = require('https');

// KORRIGIERTE URL (Main Branch, High Quality)
const URL = 'https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/1_deutschland/2_hoch.geo.json';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'maps');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'germany.json');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`Lade Karte von ${URL} ...`);

https.get(URL, (res) => {
  if (res.statusCode !== 200) {
    console.error(`❌ Fehler: HTTP ${res.statusCode} - URL möglicherweise falsch.`);
    return;
  }

  const file = fs.createWriteStream(OUTPUT_FILE);
  res.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('✅ Erfolg! Datei gespeichert unter: public/maps/germany.json');
  });
}).on('error', (err) => {
  console.error('❌ Netzwerkfehler:', err.message);
});
