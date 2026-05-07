# Erasmus Partner Scraping Engine

Professionelle Scraping-Engine für Erasmus-Partnerschaften von Universitäts-Mobilitätsportalen (z.B. MoveOn Publisher).

## Installation

Die benötigten Abhängigkeiten sind bereits in `package.json` enthalten:
- `puppeteer` - Für JavaScript-renderte Seiten
- `cheerio` - Für HTML-Parsing

Installation mit:
```bash
npm install
```

## Verwendung

### Test-Modus (Empfohlen für erste Tests)

Generiert 50 Test-Partner für die TUM:

```bash
node scripts/scrape-erasmus.js --test
```

### Normale Verwendung

Scraping von einer echten URL:

```bash
node scripts/scrape-erasmus.js <URL> [options]
```

**Beispiele:**
```bash
# Scrape alle Partner von einer URL
node scripts/scrape-erasmus.js https://mobility.example.edu/partners

# Limit auf 100 Partner
node scripts/scrape-erasmus.js https://mobility.example.edu/partners --limit 100

# Custom Output-Datei
node scripts/scrape-erasmus.js https://mobility.example.edu/partners --output data/my_partners.json
```

## Optionen

- `--test` - Test-Modus: Generiert 50 Test-Partner für TUM
- `--limit <number>` - Limitierung der Anzahl zu scrapender Partner
- `--output <file>` - Pfad zur Output-Datei (Standard: `src/data/erasmus_partners.json`)

## Features

### 1. Generisches HTML-Table-Scraping
- Funktioniert mit MoveOn Publisher und ähnlichen Systemen
- Multiple Scraping-Strategien für maximale Kompatibilität
- Automatische Erkennung von Tabellenstrukturen

### 2. Data Enrichment
- **Automatische Länderzuordnung zu Erasmus-Förderstufen:**
  - **Tier 1 (€390/Monat)**: Höhere Lebenskostenländer
    - Österreich, Belgien, Dänemark, Finnland, Frankreich, Island, Irland, Italien, Liechtenstein, Luxemburg, Niederlande, Norwegen, Schweden, Schweiz, Vereinigtes Königreich
  - **Tier 2 (€330/Monat)**: Mittlere und niedrigere Lebenskostenländer
    - Alle anderen EU/EEA Länder (Zypern, Tschechien, Griechenland, Malta, Portugal, Slowenien, Spanien, Bulgarien, Kroatien, Estland, Ungarn, Lettland, Litauen, Polen, Rumänien, Slowakei)

### 3. Integritäts-Check
- **Automatische cost_index Validierung:**
  - Vergleicht extrahierte Städte mit vorhandenem `cost_index`
  - Wenn Stadt neu ist: Erstellt geschätzten Kosten-Eintrag basierend auf Landesdurchschnitt
  - Fallback-Werte für unbekannte Länder (800€/Monat Standard)

### 4. Intelligente Datenverarbeitung
- Normalisierung von Ländernamen
- Erkennung deutscher Universitäten aus URL oder Seiteninhalt
- Automatische Generierung von Erasmus-Codes (Platzhalter-Format)
- Duplikatserkennung beim Mergen in bestehende Datenbank

## Datenstruktur

Jeder gescrapte Partner enthält:

```json
{
  "id": "TUM_1",
  "german_uni_id": "TUM",
  "partner_uni_name": "University of Example",
  "partner_city": "Example City",
  "partner_country": "United Kingdom",
  "subject_area": "Computer Science",
  "erasmus_code": "UK EXA123",
  "cost_index": 1100,
  "_metadata": {
    "cost_index_source": "existing",
    "scraped_at": "2026-01-08T17:00:00.000Z",
    "scraped_from": "https://example.com/partners"
  }
}
```

## Unterstützte Universitäten

Automatisch erkannte deutsche Universitäten:

- **TUM** - Technical University of Munich
  - Keywords: `tum.de`, `tum.edu`, `TU München`
  
- **LMU** - Ludwig Maximilian University of Munich
  - Keywords: `lmu.de`, `uni-muenchen.de`
  
- **HU Berlin** - Humboldt University of Berlin
  - Keywords: `hu-berlin.de`, `huberlin.de`
  
- **RWTH Aachen** - RWTH Aachen University
  - Keywords: `rwth-aachen.de`, `rwth.de`
  
- **Uni Köln** - University of Cologne
  - Keywords: `uni-koeln.de`

## Hinweise

1. **Respektiere robots.txt**: Prüfe die robots.txt der Ziel-Website vor dem Scraping
2. **Rate Limiting**: Implementiere angemessene Delays zwischen Requests
3. **Fehlerbehandlung**: Das Skript behandelt Netzwerkfehler und Timeouts automatisch
4. **Datenqualität**: Überprüfe die gescrapten Daten vor dem Einsatz in Produktion

## Troubleshooting

### "No table found"
- Die Ziel-Website verwendet möglicherweise eine andere Tabellenstruktur
- Versuche, die Selektoren in `scrape-erasmus.js` anzupassen

### "Could not load existing database"
- Stelle sicher, dass die Output-Datei existiert oder das Verzeichnis schreibbar ist
- Prüfe Dateiberechtigungen

### Puppeteer-Installation Probleme
- Stelle sicher, dass alle System-Abhängigkeiten installiert sind
- Für Linux: `sudo apt-get install -y chromium-browser`
- Für macOS: Chromium wird automatisch mit Puppeteer installiert

## Erweiterung

Um das Skript für neue Universitäten oder Tabellenformate anzupassen:

1. **Neue Universitäts-IDs**: Füge Einträge zu `GERMAN_UNI_MAPPING` hinzu
2. **Neue Tabellenselektoren**: Erweitere `tableSelectors` Array
3. **Angepasste Parsing-Logik**: Modifiziere die `scrapePartnersFromTable` Funktion

## Lizenz

Internes Tool für mystudycosts.com

