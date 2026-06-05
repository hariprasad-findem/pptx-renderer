import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const demoPath = resolve(__dirname, '../../../demo/index.html');
const devPagePath = resolve(__dirname, '../../pages/index.html');
const demoViteConfigPath = resolve(__dirname, '../../../vite.config.demo.ts');
const docsExampleSamplePath = resolve(
  __dirname,
  '../../../docs/example/1-chart-and-complex/source.pptx',
);
const duplicatePublicSamplePath = resolve(
  __dirname,
  '../../../demo/public/samples/chart-and-complex.pptx',
);
const demoHtml = readFileSync(demoPath, 'utf-8');
const devHtml = readFileSync(devPagePath, 'utf-8');
const demoViteConfig = readFileSync(demoViteConfigPath, 'utf-8');

const pages = [
  ['public demo', demoHtml],
  ['dev preview page', devHtml],
] as const;

describe('public demo feature surface', () => {
  it('exposes model text search controls and viewer search API usage', () => {
    for (const [label, html] of pages) {
      expect(html, label).toContain('id="search-input"');
      expect(html, label).toContain('viewer.searchText');
      expect(html, label).toContain('search-results');
      expect(html, label).toContain('id="search-prev"');
      expect(html, label).toContain('id="search-next"');
      expect(html, label).toContain('id="search-position"');
      expect(html, label).toContain('id="search-match-case"');
      expect(html, label).toContain('title="Match case"');
      expect(html, label).toContain('matchCase: searchMatchCase.checked');
      expect(html, label).toContain("searchMatchCase.addEventListener('change', runSearch)");
      expect(html, label).toContain('activateSearchResult');
      expect(html, label).toContain('renderHighlightedSnippet');
      expect(html, label).toContain('viewer.highlightSearchResult');
      expect(html, label).toContain('viewer.clearSearchHighlights');
    }
  });

  it('exposes lazy scaled slide thumbnail previews', () => {
    for (const [label, html] of pages) {
      expect(html, label).toContain('thumbnail-list');
      expect(html, label).toContain('IntersectionObserver');
      expect(html, label).toContain('renderThumbnailToContainer');
      expect(html, label).toContain('cleanupThumbnails');
      expect(html, label).toContain('width: 96px');
      expect(html, label).toContain('height: 54px');
      expect(html, label).toContain('width: 112px');
      expect(html, label).toContain('min-width: 112px');
      expect(html, label).toContain('max-width: 112px');
      expect(html, label).toContain('box-sizing: border-box');
      expect(html, label).toContain('padding: 6px');
      expect(html, label).toContain('{ width: 96 }');
    }
  });

  it('keeps thumbnail selection highlight layout-stable', () => {
    for (const [label, html] of pages) {
      expect(html, label).toContain('box-shadow: inset 0 0 0 2px var(--accent)');
      expect(html, label).not.toContain(
        '.search-result:hover,\n      .search-result.active,\n      .thumbnail-item.active',
      );
      expect(html, label).not.toContain('.thumbnail-item.active {\n        border-color');
      expect(html, label).not.toContain('box-shadow 120ms ease');
    }
  });

  it('uses the viewer node-level search highlight API without renderer text rewriting', () => {
    for (const [label, html] of pages) {
      expect(html, label).toContain('search-highlight-overlay');
      expect(html, label).not.toContain('function showSearchHighlight');
      expect(html, label).not.toContain('function clearSearchHighlight');
      expect(html, label).not.toContain('textContent.replace');
    }
  });

  it('serves the public demo sample from the docs example source deck', () => {
    expect(existsSync(docsExampleSamplePath)).toBe(true);
    expect(existsSync(duplicatePublicSamplePath)).toBe(false);
    expect(demoHtml).toContain('data-file="samples/chart-and-complex.pptx"');
    expect(demoViteConfig).toContain('docs/example/1-chart-and-complex/source.pptx');
    expect(demoViteConfig).toContain('fileName: samplePublicFile');
    expect(demoViteConfig).toContain('publicDir: false');
  });

  it('keeps the public demo empty state visually anchored', () => {
    const previewCss = demoHtml.match(/\.empty-slide-preview\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(demoHtml).toContain('empty-slide-preview');
    expect(demoHtml).toContain('empty-feature-icon');
    expect(demoHtml).toContain('Open a deck or launch the sample');
    expect(previewCss).toContain('width: 100%;');
  });
});
