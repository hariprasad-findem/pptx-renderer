import { createReadStream, readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { resolve } from 'node:path';

const demoBase = '/pptx-renderer/';
const samplePublicFile = 'samples/chart-and-complex.pptx';
const sampleRequestPath = `/${samplePublicFile}`;
const baseSampleRequestPath = `${demoBase.replace(/\/$/, '')}${sampleRequestPath}`;
const docsExampleSamplePath = resolve(__dirname, 'docs/example/1-chart-and-complex/source.pptx');
const pptxMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const demoSampleFromDocsExample = (): Plugin => ({
  name: 'demo-sample-from-docs-example',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const pathname = req.url?.split('?')[0] ?? '';
      if (pathname !== sampleRequestPath && pathname !== baseSampleRequestPath) {
        next();
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', pptxMime);
      createReadStream(docsExampleSamplePath).on('error', next).pipe(res);
    });
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: samplePublicFile,
      source: readFileSync(docsExampleSamplePath),
    });
  },
});

export default defineConfig({
  root: resolve(__dirname, 'demo'),
  base: demoBase,
  publicDir: false,
  plugins: [demoSampleFromDocsExample()],
  build: {
    outDir: resolve(__dirname, 'dist-demo'),
    emptyOutDir: true,
  },
});
