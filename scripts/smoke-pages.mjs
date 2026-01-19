import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3001';
const TIMEOUT_MS = Number.parseInt(process.env.TIMEOUT_MS || '', 10) || 60000;
const PAGES_DIR = path.resolve(process.cwd(), 'src/pages');

const IGNORE_FILES = new Set(['_app.js', '_document.js', '_error.js']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full)));
      continue;
    }
    if (e.isFile()) out.push(full);
  }
  return out;
}

function toRoute(fileAbs) {
  const rel = path.relative(PAGES_DIR, fileAbs).replaceAll(path.sep, '/');
  if (!rel.endsWith('.js')) return null;
  if (rel.startsWith('api/')) return null;
  if (rel.includes('[')) return null; // skip dynamic routes

  const base = rel.slice(0, -'.js'.length); // strip extension
  const fileName = path.posix.basename(rel);
  if (IGNORE_FILES.has(fileName)) return null;

  // Next: index.js => /
  if (base === 'index') return '/';

  // folders: foo/index.js => /foo
  if (base.endsWith('/index')) return `/${base.slice(0, -'/index'.length)}`;

  // sitemap.xml.js => /sitemap.xml
  return `/${base}`;
}

async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, url: res.url, bytes: Buffer.byteLength(text) };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  // Ensure pages dir exists
  try {
    const s = await stat(PAGES_DIR);
    if (!s.isDirectory()) throw new Error('src/pages is not a directory');
  } catch (e) {
    console.error(`[smoke] Cannot access ${PAGES_DIR}:`, e?.message || e);
    process.exit(2);
  }

  const files = await walk(PAGES_DIR);
  const routes = files
    .map(toRoute)
    .filter(Boolean)
    .filter((r) => r !== '/404') // 404 is served for non-existent paths; skip direct check
    .sort();

  const uniqueRoutes = [...new Set(routes)];
  console.log(`[smoke] BASE_URL=${BASE_URL}`);
  console.log(`[smoke] TIMEOUT_MS=${TIMEOUT_MS}`);
  console.log(`[smoke] Routes (${uniqueRoutes.length}):`);
  for (const r of uniqueRoutes) console.log(` - ${r}`);

  const failures = [];
  for (const route of uniqueRoutes) {
    const url = `${BASE_URL}${route}`;
    const started = Date.now();
    try {
      const r = await fetchWithTimeout(url);
      const ms = Date.now() - started;
      const bad = r.status >= 500;
      console.log(
        `[smoke] ${bad ? 'FAIL' : 'OK  '} ${String(r.status).padStart(3, ' ')} ${String(ms).padStart(
          5,
          ' '
        )}ms ${route} (bytes=${r.bytes}${r.url !== url ? ` final=${r.url}` : ''})`
      );
      if (bad) failures.push({ route, status: r.status, finalUrl: r.url });
    } catch (e) {
      const ms = Date.now() - started;
      console.log(`[smoke] FAIL --- ${String(ms).padStart(5, ' ')}ms ${route} (${e?.name || 'Error'}: ${
        e?.message || e
      })`);
      failures.push({ route, error: e?.message || String(e) });
    }
  }

  if (failures.length) {
    console.log(`\n[smoke] Failures (${failures.length}):`);
    for (const f of failures) console.log(` - ${f.route}: ${f.status || f.error}`);
    process.exit(1);
  }

  console.log('\n[smoke] All routes passed (no 5xx / timeouts).');
}

await main();

