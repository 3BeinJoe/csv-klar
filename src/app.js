import { detectDelimiter, parseCSV, analyzeTable, validateFile, validateTextEncoding } from './analyzer.js';

const elements = {
  dropzone: document.querySelector('#dropzone'),
  fileInput: document.querySelector('#file-input'),
  chooseButton: document.querySelector('#choose-button'),
  sampleButton: document.querySelector('#sample-button'),
  fileError: document.querySelector('#file-error'),
  results: document.querySelector('#results'),
  resultTitle: document.querySelector('#result-title'),
  resultMeta: document.querySelector('#result-meta'),
  summary: document.querySelector('#summary'),
  issues: document.querySelector('#issues'),
  issueCount: document.querySelector('#issue-count'),
  columns: document.querySelector('#columns'),
  downloadButton: document.querySelector('#download-button'),
  newFileButton: document.querySelector('#new-file-button')
};

let currentReport = null;
let currentFileName = '';

function showError(message) {
  elements.fileError.textContent = message;
  elements.fileError.hidden = false;
}

function clearError() {
  elements.fileError.textContent = '';
  elements.fileError.hidden = true;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderSummary(report) {
  const metrics = [
    [report.rowCount.toLocaleString('de-DE'), 'Datenzeilen'],
    [report.columnCount.toLocaleString('de-DE'), 'Spalten'],
    [report.emptyCells.toLocaleString('de-DE'), 'Leere Werte'],
    [report.duplicateRows.toLocaleString('de-DE'), 'Doppelte Zeilen']
  ];

  elements.summary.replaceChildren(...metrics.map(([value, label]) => {
    const stat = createElement('div', 'stat');
    stat.append(createElement('strong', '', value), createElement('span', '', label));
    return stat;
  }));
}

function renderIssues(report) {
  const issues = [];
  if (report.emptyCells > 0) {
    issues.push({
      title: `${report.emptyCells} leere Werte`,
      detail: 'Prüfe, ob diese Felder absichtlich leer sind oder beim Export verloren gingen.',
      severity: 'warning'
    });
  }
  if (report.duplicateRows > 0) {
    issues.push({
      title: `${report.duplicateRows} doppelte Zeilen`,
      detail: 'Exakt übereinstimmende Datenzeilen können Auswertungen und Importe verfälschen.',
      severity: 'danger'
    });
  }
  if (report.malformedRows.length > 0) {
    const rowNumbers = report.malformedRows.slice(0, 5).map((item) => item.row).join(', ');
    issues.push({
      title: `${report.malformedRows.length} strukturell auffällige Zeilen`,
      detail: `Abweichende Spaltenzahl in Zeile ${rowNumbers}${report.malformedRows.length > 5 ? ' …' : ''}.`,
      severity: 'danger'
    });
  }

  const total = report.emptyCells + report.duplicateRows + report.malformedRows.length;
  elements.issueCount.textContent = `${total} Hinweis${total === 1 ? '' : 'e'}`;

  if (issues.length === 0) {
    elements.issues.replaceChildren(createElement('div', 'empty-state', 'Keine offensichtlichen Strukturprobleme gefunden.'));
    return;
  }

  elements.issues.replaceChildren(...issues.map((item) => {
    const issue = createElement('div', `issue ${item.severity === 'danger' ? 'danger' : ''}`);
    const dot = createElement('span', 'issue-dot');
    const copy = createElement('div');
    copy.append(createElement('strong', '', item.title), createElement('p', '', item.detail));
    issue.append(dot, copy);
    return issue;
  }));
}

function renderColumns(report) {
  elements.columns.replaceChildren(...report.columns.map((column) => {
    const row = document.createElement('tr');
    row.append(
      createElement('td', '', column.name),
      createElement('td', '', column.emptyCount.toLocaleString('de-DE')),
      createElement('td', '', column.uniqueCount.toLocaleString('de-DE'))
    );
    return row;
  }));
}

function analyzeText(text, fileName) {
  try {
    clearError();
    validateTextEncoding(text);
    const delimiter = detectDelimiter(text);
    const rows = parseCSV(text, delimiter);
    const report = analyzeTable(rows);
    currentFileName = fileName;
    currentReport = {
      fileName,
      analyzedAt: new Date().toISOString(),
      delimiter: delimiter === '\t' ? 'Tabulator' : delimiter,
      ...report
    };

    elements.resultTitle.textContent = fileName;
    elements.resultMeta.textContent = `Trennzeichen: ${currentReport.delimiter} · Analyse vollständig lokal ausgeführt`;
    renderSummary(report);
    renderIssues(report);
    renderColumns(report);
    elements.results.hidden = false;
    elements.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Die Datei konnte nicht analysiert werden.');
  }
}

function readFile(file) {
  if (!file) return;
  try {
    clearError();
    validateFile(file.name, file.size);
  } catch (error) {
    showError(error.message);
    return;
  }
  const reader = new FileReader();
  reader.addEventListener('load', () => analyzeText(String(reader.result), file.name));
  reader.addEventListener('error', () => showError('Die Datei konnte nicht gelesen werden.'));
  reader.readAsText(file);
}

elements.chooseButton.addEventListener('click', (event) => {
  event.stopPropagation();
  elements.fileInput.click();
});
elements.dropzone.addEventListener('click', () => elements.fileInput.click());
elements.dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    elements.fileInput.click();
  }
});
elements.fileInput.addEventListener('change', () => readFile(elements.fileInput.files[0]));

for (const eventName of ['dragenter', 'dragover']) {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropzone.classList.add('dragging');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove('dragging');
  });
}
elements.dropzone.addEventListener('drop', (event) => readFile(event.dataTransfer.files[0]));

elements.sampleButton.addEventListener('click', async () => {
  try {
    clearError();
    const response = await fetch('./sample.csv');
    if (!response.ok) throw new Error('Beispieldatei konnte nicht geladen werden.');
    analyzeText(await response.text(), 'beispiel-kundendaten.csv');
  } catch (error) {
    showError(error.message);
  }
});

elements.newFileButton.addEventListener('click', () => {
  elements.fileInput.value = '';
  elements.fileInput.click();
});

elements.downloadButton.addEventListener('click', () => {
  if (!currentReport) return;
  const blob = new Blob([JSON.stringify(currentReport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentFileName.replace(/\.csv$/i, '')}-qualitaetsbericht.json`;
  link.click();
  URL.revokeObjectURL(url);
});
