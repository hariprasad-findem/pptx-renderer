import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagesDir = resolve(__dirname, '../../pages');

function readPage(name: string): string {
  return readFileSync(resolve(pagesDir, name), 'utf-8');
}

describe('test pages ZIP limits', () => {
  it('uses trusted local ZIP limits on pages that parse repository testdata PPTX files', () => {
    for (const page of ['render-slide.html', 'export.html', 'e2e-compare.html']) {
      expect(readPage(page), `${page} should use TRUSTED_TESTDATA_ZIP_LIMITS`).toContain(
        'TRUSTED_TESTDATA_ZIP_LIMITS',
      );
    }
  });

  it('keeps the upload preview page on recommended ZIP limits for arbitrary PPTX input', () => {
    for (const page of ['index.html']) {
      expect(readPage(page), `${page} should use RECOMMENDED_ZIP_LIMITS`).toContain(
        'RECOMMENDED_ZIP_LIMITS',
      );
    }
  });

  it('defines trusted testdata limits by extending recommended limits only for large local decks', () => {
    const helper = readPage('zipLimits.ts');

    expect(helper).toContain('RECOMMENDED_ZIP_LIMITS');
    expect(helper).toContain('TRUSTED_TESTDATA_ZIP_LIMITS');
    expect(helper).toMatch(/maxEntryUncompressedBytes:\s*96\s*\*\s*1024\s*\*\s*1024/);
    expect(helper).toMatch(/maxMediaBytes:\s*384\s*\*\s*1024\s*\*\s*1024/);
    expect(helper).toMatch(/maxTotalUncompressedBytes:\s*512\s*\*\s*1024\s*\*\s*1024/);
  });

  it('keeps the single-slide preview from flex-shrinking and clipping wide slides', () => {
    expect(readPage('render-slide.html')).toMatch(
      /#slide-container\s+\.slide-wrapper\s*\{[^}]*flex:\s*0\s+0\s+auto/s,
    );
  });
});
