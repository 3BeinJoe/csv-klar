const DELIMITERS = [',', ';', '\t', '|'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateFile(fileName, fileSize) {
  if (!fileName.toLowerCase().endsWith('.csv')) {
    throw new Error('Bitte wähle eine CSV-Datei aus.');
  }
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error('Die CSV-Datei darf höchstens 10 MB groß sein.');
  }
}

export function validateTextEncoding(text) {
  if (text.includes('\uFFFD')) {
    throw new Error('Die Datei ist nicht gültig als UTF-8 lesbar. Bitte exportiere sie als UTF-8-CSV.');
  }
}

export function detectDelimiter(text) {
  const rows = [];
  let counts = new Map(DELIMITERS.map((delimiter) => [delimiter, 0]));
  let quoted = false;

  for (let index = 0; index < text.length && rows.length < 20; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && counts.has(character)) {
      counts.set(character, counts.get(character) + 1);
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      rows.push(counts);
      counts = new Map(DELIMITERS.map((delimiter) => [delimiter, 0]));
    }
  }
  if ([...counts.values()].some((count) => count > 0)) rows.push(counts);

  function score(delimiter) {
    const positiveCounts = rows.map((row) => row.get(delimiter)).filter((count) => count > 0);
    if (positiveCounts.length === 0) return [0, 0, 0];

    const frequencies = new Map();
    positiveCounts.forEach((count) => frequencies.set(count, (frequencies.get(count) ?? 0) + 1));
    const [modeCount, modeFrequency] = [...frequencies.entries()]
      .sort((left, right) => right[1] - left[1] || right[0] - left[0])[0];
    return [modeFrequency, modeCount, positiveCounts.reduce((sum, count) => sum + count, 0)];
  }

  return [...DELIMITERS].sort((left, right) => {
    const leftScore = score(left);
    const rightScore = score(right);
    for (let index = 0; index < leftScore.length; index += 1) {
      if (leftScore[index] !== rightScore[index]) return rightScore[index] - leftScore[index];
    }
    return 0;
  })[0];
}

export function parseCSV(text, delimiter = detectDelimiter(text)) {
  const source = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let quotedFieldClosed = false;
  let recordStarted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === '"') {
      if (quoted) {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          quotedFieldClosed = true;
        }
      } else if (field.length === 0 && !quotedFieldClosed) {
        quoted = true;
        recordStarted = true;
      } else {
        throw new Error('Die CSV-Datei enthält ein Anführungszeichen mitten in einem Feld.');
      }
    } else if (character === delimiter && !quoted) {
      row.push(field);
      field = '';
      quotedFieldClosed = false;
      recordStarted = true;
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      quotedFieldClosed = false;
      recordStarted = false;
    } else {
      if (quotedFieldClosed) {
        throw new Error('Nach einem schließenden Anführungszeichen wurde unerwarteter Text gefunden.');
      }
      field += character;
      recordStarted = true;
    }
  }

  if (quoted) {
    throw new Error('Die CSV-Datei enthält ein nicht geschlossenes Anführungszeichen.');
  }

  row.push(field);
  if (recordStarted) rows.push(row);
  return rows;
}

export function analyzeTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Die Datei enthält keine Daten.');
  }

  const headers = rows[0].map((header, index) => header.trim() || `Spalte ${index + 1}`);
  const dataRows = rows.slice(1);
  const columnCount = headers.length;
  const malformedRows = [];
  const filledCounts = Array(columnCount).fill(0);
  const uniqueValues = Array.from({ length: columnCount }, () => new Set());
  const seenRows = new Set();
  let duplicateRows = 0;

  dataRows.forEach((row, rowIndex) => {
    if (row.length !== columnCount) {
      malformedRows.push({ row: rowIndex + 2, cells: row.length, expected: columnCount });
    }

    const availableCells = Math.min(row.length, columnCount);
    for (let columnIndex = 0; columnIndex < availableCells; columnIndex += 1) {
      const value = (row[columnIndex] ?? '').trim();
      if (value) {
        filledCounts[columnIndex] += 1;
        uniqueValues[columnIndex].add(value);
      }
    }

    const key = JSON.stringify(row.map((cell) => cell.trim()));
    if (seenRows.has(key)) duplicateRows += 1;
    else seenRows.add(key);
  });

  const columns = headers.map((name, index) => ({
    name,
    emptyCount: dataRows.length - filledCounts[index],
    uniqueCount: uniqueValues[index].size
  }));

  return {
    rowCount: dataRows.length,
    columnCount,
    emptyCells: columns.reduce((sum, column) => sum + column.emptyCount, 0),
    duplicateRows,
    malformedRows,
    columns
  };
}
