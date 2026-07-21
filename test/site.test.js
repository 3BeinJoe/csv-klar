import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const feedbackUrl = 'https://github.com/3BeinJoe/csv-klar/issues/new?template=alpha-feedback.yml';

function listFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory()
      ? listFiles(new URL(`${entry.name}/`, directory), relative)
      : [relative];
  });
}

function verifyFeedbackLink(html) {
  const anchor = html.match(/<a\b[^>]*issues\/new\?template=alpha-feedback\.yml[^>]*>/)?.[0];
  assert.ok(anchor, 'Feedback-Link fehlt');
  assert.match(anchor, new RegExp(`\\bhref="${feedbackUrl.replace(/[.?]/g, '\\$&')}"`));
  assert.match(anchor, /\btarget="_blank"/);

  const rel = anchor.match(/\brel="([^"]*)"/)?.[1].split(/\s+/) ?? [];
  assert.ok(rel.includes('noopener'));
  assert.ok(rel.includes('noreferrer'));
  assert.match(html, /Feedback auf GitHub/);
  assert.match(html, /kein Tracking und keine Übertragung der ausgewählten CSV/i);
}

test('Quellseite verlinkt das öffentliche Alpha-Feedbackformular sicher', () => {
  verifyFeedbackLink(readFileSync(new URL('index.html', root), 'utf8'));
});

test('Build enthält denselben sicheren Feedback-Link', () => {
  verifyFeedbackLink(readFileSync(new URL('dist/index.html', root), 'utf8'));
});

test('Build enthält ausschließlich die neun erlaubten Dateien', () => {
  assert.deepEqual(listFiles(new URL('dist/', root)).sort(), [
    '.nojekyll',
    'favicon.svg',
    'index.html',
    'robots.txt',
    'sample.csv',
    'site.webmanifest',
    'src/analyzer.js',
    'src/app.js',
    'styles.css'
  ]);
});
