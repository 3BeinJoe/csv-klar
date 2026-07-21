import test from 'node:test';
import assert from 'node:assert/strict';
import { detectDelimiter, parseCSV, analyzeTable, validateFile, validateTextEncoding } from '../src/analyzer.js';

test('validateTextEncoding erkennt beschädigte UTF-8-Dekodierung', () => {
  assert.throws(() => validateTextEncoding('M\uFFFDrchen'), /UTF-8/i);
  assert.doesNotThrow(() => validateTextEncoding('Märchen'));
});

test('validateFile lehnt Nicht-CSV-Dateien ab', () => {
  assert.throws(() => validateFile('kunden.xlsx', 128), /CSV-Datei/i);
});

test('validateFile begrenzt Dateien auf 10 MiB', () => {
  assert.throws(() => validateFile('kunden.csv', 10 * 1024 * 1024 + 1), /10 MB/i);
  assert.doesNotThrow(() => validateFile('kunden.csv', 10 * 1024 * 1024));
});

test('detectDelimiter erkennt Semikolon in deutschen CSV-Dateien', () => {
  const csv = 'Name;Alter;Stadt\nAda;31;Berlin\nLinus;28;Köln';
  assert.equal(detectDelimiter(csv), ';');
});

test('detectDelimiter berücksichtigt mehrere Datensätze', () => {
  const csv = 'Export vom 14.07.2026\nName;Alter;Stadt\nAda;31;Berlin\nLinus;28;Köln';
  assert.equal(detectDelimiter(csv), ';');
});

test('parseCSV entfernt eine UTF-8-BOM am Dateianfang', () => {
  assert.deepEqual(parseCSV('\uFEFFName,Stadt\nAda,Berlin'), [
    ['Name', 'Stadt'],
    ['Ada', 'Berlin']
  ]);
});

test('parseCSV verarbeitet Anführungszeichen, Kommas und Zeilenumbrüche', () => {
  const csv = 'Name,Notiz\nAda,"Hallo, Welt"\nLinus,"Zeile 1\nZeile 2"';
  assert.deepEqual(parseCSV(csv), [
    ['Name', 'Notiz'],
    ['Ada', 'Hallo, Welt'],
    ['Linus', 'Zeile 1\nZeile 2']
  ]);
});

test('parseCSV behält einen quoted leeren einspaltigen Datensatz', () => {
  assert.deepEqual(parseCSV('Header\n""'), [
    ['Header'],
    ['']
  ]);
});

test('parseCSV behält physisch leere einspaltige Datensätze', () => {
  assert.deepEqual(parseCSV('Header\n\nValue'), [
    ['Header'],
    [''],
    ['Value']
  ]);
});

test('parseCSV behält explizit leere Datensätze', () => {
  assert.deepEqual(parseCSV('A,B,C\n,,\n1,2,3'), [
    ['A', 'B', 'C'],
    ['', '', ''],
    ['1', '2', '3']
  ]);
});

test('parseCSV lehnt Anführungszeichen mitten im Feld ab', () => {
  assert.throws(() => parseCSV('Name,Code\nAda,ab"cd"'), /Anführungszeichen/i);
});

test('parseCSV lehnt nicht geschlossene Anführungszeichen ab', () => {
  assert.throws(() => parseCSV('Name,Notiz\nAda,"offen'), /Anführungszeichen/i);
});

test('analyzeTable zählt leere Werte und exakte Dubletten', () => {
  const rows = [
    ['Name', 'E-Mail', 'Stadt'],
    ['Ada', 'ada@example.org', 'Berlin'],
    ['Linus', '', 'Köln'],
    ['Ada', 'ada@example.org', 'Berlin']
  ];
  const report = analyzeTable(rows);
  assert.equal(report.rowCount, 3);
  assert.equal(report.columnCount, 3);
  assert.equal(report.emptyCells, 1);
  assert.equal(report.duplicateRows, 1);
  assert.equal(report.columns[1].emptyCount, 1);
});

test('analyzeTable meldet Zeilen mit inkonsistenter Spaltenzahl', () => {
  const rows = [
    ['A', 'B', 'C'],
    ['1', '2', '3'],
    ['4', '5']
  ];
  const report = analyzeTable(rows);
  assert.deepEqual(report.malformedRows, [{ row: 3, cells: 2, expected: 3 }]);
});

test('analyzeTable skaliert mit vorhandenen statt fehlenden Zellen', () => {
  const headers = Array.from({ length: 1000 }, (_, index) => `Spalte ${index + 1}`);
  let numericReads = 0;
  const shortRow = new Proxy(['Wert'], {
    get(target, property, receiver) {
      if (/^\d+$/.test(String(property)) && ++numericReads > 10) {
        throw new Error('Zu viele Zugriffe auf fehlende Zellen');
      }
      return Reflect.get(target, property, receiver);
    }
  });

  const report = analyzeTable([headers, shortRow]);
  assert.equal(report.emptyCells, 999);
  assert.equal(report.columns[999].emptyCount, 1);
});

test('analyzeTable behandelt eine leere Datei kontrolliert', () => {
  assert.throws(() => analyzeTable([]), /keine Daten/i);
});
