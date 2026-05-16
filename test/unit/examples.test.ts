import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../..');

function contentTypeFor(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

describe('example pages smoke', () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl = '';

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      const rawPath = (req.url ?? '/').split('?')[0];
      const reqPath = rawPath === '/' ? '/examples/standalone.html' : rawPath;
      const normalizedPath = reqPath.startsWith('/') ? reqPath : `/${reqPath}`;
      const filePath = resolve(repoRoot, `.${normalizedPath}`);

      if (!filePath.startsWith(repoRoot)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      try {
        const body = await readFile(filePath);
        res.statusCode = 200;
        res.setHeader('Content-Type', contentTypeFor(filePath));
        res.end(body);
      } catch {
        res.statusCode = 404;
        res.end('Not found');
      }
    });

    await new Promise<void>((resolvePromise) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Failed to bind smoke-test server.');
        }
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolvePromise();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.close((err) => {
        if (err) rejectPromise(err);
        else resolvePromise();
      });
    });
  });

  it('serves standalone example with map initialization', async () => {
    const response = await fetch(`${baseUrl}/examples/standalone.html`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('id="map"');
    expect(html).toContain('RcpchImdMap.createImdMap');
    expect(html).toContain('../dist/umd/rcpch-imd-map.min.js');
  });

  it('serves patient example with patient and lead centre plotting hooks', async () => {
    const response = await fetch(`${baseUrl}/examples/standalone-with-patients.html`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('map.setPatients(patients);');
    expect(html).toContain('map.setLeadCentre(leadCentre);');
    expect(html).toContain('switchNation');
  });
});
