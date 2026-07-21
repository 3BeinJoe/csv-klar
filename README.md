# CSV Klar

Ein kostenloser, lokaler CSV-Qualitätscheck als MVP für ein späteres Datenbereinigungsprodukt.

## Funktionen

- CSV-Dateien vollständig lokal im Browser analysieren
- UTF-8-Dekodierungsfehler verständlich melden
- Dateien bis maximal 10 MiB akzeptieren
- Komma, Semikolon, Tabulator und Pipe als Trennzeichen erkennen
- leere Werte zählen
- exakte doppelte Datenzeilen erkennen
- Zeilen mit abweichender Spaltenzahl melden
- Spaltenübersicht mit Leer- und Eindeutigkeitswerten anzeigen
- Prüfbericht als JSON herunterladen

## Lokal starten

```bash
cd /Users/lucasch/data-quality-checker
npm test
npm run build
npm run serve
```

Danach `http://127.0.0.1:8080` im Browser öffnen.

## Datenschutz

Die CSV-Verarbeitung geschieht im Browser. Es gibt in diesem MVP kein Backend, keine Datenbank und keine Analyse- oder Trackingsoftware.

## Projektstruktur

- `index.html` – Produktoberfläche
- `styles.css` – responsives Design
- `src/analyzer.js` – getestete CSV- und Qualitätslogik
- `src/app.js` – Browserinteraktionen und Berichtsdarstellung
- `test/analyzer.test.js` – automatisierte Tests
- `scripts/build-site.mjs` – erzeugt das kuratierte Pages-Artefakt in `dist/`
- `sample.csv` – Beispieldaten
- `PRODUCT_VALIDATION.md` – Validierungs- und Veröffentlichungsplan
- `ALPHA_TEST.md` – Leitfaden für fünf beobachtete Nutzertests
- `LAUNCH_CHECKLIST.md` – Voraussetzungen für den öffentlichen Alpha-Start
- `content/series-01.md` – erste Serie mit zehn Kurzvideo-Skripten
- `content/video-01/` – Plan, Render-Skript und fertiger Pilotclip

## Veröffentlichung über GitHub Pages

Der Workflow `.github/workflows/deploy.yml` führt vor jeder Veröffentlichung die Tests aus und veröffentlicht ausschließlich das kuratierte `dist/`-Artefakt. Nach Erstellung eines öffentlichen GitHub-Repositorys und Aktivierung von Pages wird jeder Push auf `main` automatisch veröffentlicht.
