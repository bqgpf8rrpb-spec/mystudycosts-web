#!/usr/bin/env node

/**
 * Downloads official EU Erasmus+ Mobility Raw Data (XLSX) from the European Commission.
 * Source: https://data.europa.eu/data/datasets/erasmus-mobility-raw-data
 *
 * Downloads KA1 (Key Action 1 - Learning Mobility) data for the specified year range.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const RAW_DIR = path.join(__dirname, '..', 'data', 'raw');

const BASE_URL = 'https://ec.europa.eu/assets/eac/erasmus-plus/statistics/mobility';

const KA1_YEARS = [2019, 2020, 2021, 2022, 2023, 2024];

function getDownloadUrl(year) {
  return `${BASE_URL}/Erasmus-KA1-Mobility-Data-${year}.xlsx`;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const pct = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r  Progress: ${pct}% (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB)`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        process.stdout.write('\n');
        resolve(destPath);
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });

    request.setTimeout(300000, () => {
      request.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

async function main() {
  console.log('=== Erasmus+ Mobility Data Downloader ===\n');

  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
  }

  const downloaded = [];

  for (const year of KA1_YEARS) {
    const url = getDownloadUrl(year);
    const filename = `Erasmus-KA1-Mobility-Data-${year}.xlsx`;
    const destPath = path.join(RAW_DIR, filename);

    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      if (ageHours < 24 * 7) {
        console.log(`[SKIP] ${filename} (downloaded ${Math.round(ageHours)}h ago)`);
        downloaded.push({ year, path: destPath });
        continue;
      }
    }

    console.log(`[DOWNLOAD] ${filename} from EU Open Data...`);
    try {
      await downloadFile(url, destPath);
      const stats = fs.statSync(destPath);
      console.log(`  Saved: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
      downloaded.push({ year, path: destPath });
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      console.log(`  Skipping year ${year}`);
    }
  }

  console.log(`\nDownloaded ${downloaded.length}/${KA1_YEARS.length} files.`);

  const manifest = {
    downloadedAt: new Date().toISOString(),
    files: downloaded,
  };
  fs.writeFileSync(
    path.join(RAW_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('Manifest written to data/raw/manifest.json');
  return downloaded;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
