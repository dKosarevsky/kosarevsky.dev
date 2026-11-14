import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { build } from 'esbuild';

const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const publicEntries = new Set(['index.html', '404.html', 'assets', 'CNAME', '.nojekyll', 'robots.txt', 'sitemap.xml']);
const privateDirectories = new Set(['src', 'prototypes', 'node_modules', 'docs', 'tests']);
const scenePath = path.join(root, 'assets/multiverse-scene.js');
const cacheEdges = new Set([
  'index.html:assets/app.js', 'index.html:assets/style.css',
  'assets/app.js:assets/projects.js', 'assets/app.js:assets/multiverse.js',
  'assets/multiverse.js:assets/multiverse-scene.js',
]);
const checkedCacheEdges = new Set();
const cacheRevisions = new Set();
await access(scenePath);

const files = [];
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Public output must not contain symlinks: ${name}`);
    if (entry.isDirectory()) {
      assert.ok(!privateDirectories.has(entry.name), `Non-public directory in dist/: ${path.relative(root, name)}`);
      await visit(name);
    }
    else {
      assert.ok(entry.isFile(), `Unexpected public output: ${name}`);
      files.push(name);
    }
  }
}
for (const entry of await readdir(root)) {
  assert.ok(publicEntries.has(entry), `Non-public entry in dist/: ${entry}`);
}
for (const entry of publicEntries) await access(path.join(root, entry));
await visit(root);

function isRemote(reference) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference);
}
async function checkReference(reference, owner) {
  if (!reference || reference.startsWith('#') || isRemote(reference)) return;
  const pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  const destination = pathname.startsWith('/')
    ? path.resolve(root, `.${pathname}`)
    : path.resolve(path.dirname(owner), pathname);
  assert.ok(destination === root || destination.startsWith(`${root}${path.sep}`), `Reference escapes dist/: ${reference}`);
  const edge = `${path.relative(root, owner)}:${path.relative(root, destination)}`;
  if (cacheEdges.has(edge)) {
    const revision = /\?v=([a-f\d]{12})$/.exec(reference)?.[1];
    assert.ok(revision, `Missing cache revision for ${edge}`);
    checkedCacheEdges.add(edge);
    cacheRevisions.add(revision);
  }
  let info;
  try { info = await stat(destination); }
  catch { assert.fail(`Missing public reference in ${path.relative(root, owner)}: ${reference}`); }
  if (info.isDirectory()) await access(path.join(destination, 'index.html'));
}
async function checkCss(source, owner) {
  for (const match of source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g)) {
    const reference = match[1] ?? match[2] ?? match[3];
    assert.ok(!/^(?:https?:)?\/\//i.test(reference), `External runtime CSS resource in ${path.relative(root, owner)}`);
    await checkReference(reference, owner);
  }
  for (const match of source.matchAll(/@import\s+["']([^"']+)["']/g)) {
    assert.ok(!isRemote(match[1]), `External runtime CSS in ${path.relative(root, owner)}`);
    await checkReference(match[1], owner);
  }
}

for (const file of files) {
  if (file.endsWith('.html')) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/\b(?:href|src|poster)\s*=\s*["']([^"']*)["']/gi)) {
      await checkReference(match[1], file);
    }
    for (const match of html.matchAll(/\bsrcset\s*=\s*["']([^"']*)["']/gi)) {
      for (const candidate of match[1].split(',')) await checkReference(candidate.trim().split(/\s+/)[0], file);
    }
    for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
      if (match[1].toLowerCase() === 'link' && !/\brel\s*=\s*["'][^"']*\b(?:stylesheet|modulepreload)\b/i.test(match[0])) continue;
      const reference = /\b(?:src|href)\s*=\s*["']([^"']*)["']/i.exec(match[0])?.[1];
      assert.ok(!reference || !isRemote(reference), `External runtime dependency in ${path.relative(root, file)}: ${reference}`);
    }
    await checkCss(html, file);
  } else if (file.endsWith('.css')) {
    await checkCss(await readFile(file, 'utf8'), file);
  }
}

// esbuild parses both static and dynamic imports, as well as the actual exports.
// No browser code is evaluated while validating the delivered module graph.
const modules = await build({
  absWorkingDir: root,
  entryPoints: files.filter(file => file.endsWith('.js')),
  outdir: path.join(root, '__syntax_check__'),
  bundle: false,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  write: false,
  metafile: true,
  logLevel: 'silent',
});
let sceneExports;
for (const output of Object.values(modules.metafile.outputs)) {
  const owner = path.resolve(root, output.entryPoint);
  if (owner === scenePath) sceneExports = output.exports;
  for (const reference of output.imports) {
    assert.ok(reference.path.startsWith('.') || reference.path.startsWith('/'), `Non-local runtime import in ${path.relative(root, owner)}: ${reference.path}`);
    assert.ok(!isRemote(reference.path), `External runtime import in ${path.relative(root, owner)}: ${reference.path}`);
    await checkReference(reference.path, owner);
  }
}
assert.ok(sceneExports?.includes('createNode'), 'The delivered scene must export createNode');
assert.deepEqual(checkedCacheEdges, cacheEdges, 'The complete runtime graph must use cache revisions');
assert.equal(cacheRevisions.size, 1, 'The runtime graph must use the same cache revision');

const bytes = (await stat(path.join(root, 'index.html'))).size + (await Promise.all(files
  .filter(file => file.startsWith(path.join(root, 'assets') + path.sep))
  .map(async file => (await stat(file)).size))).reduce((sum, size) => sum + size, 0);
const sceneGzipBytes = gzipSync(await readFile(scenePath)).length;
assert.ok(bytes <= 1_500_000, `Built HTML + assets exceeds 1,500,000 bytes: ${bytes}`);
assert.ok(sceneGzipBytes <= 220 * 1024, `Scene exceeds 220 KiB gzip: ${sceneGzipBytes}`);
console.log(`PASS: dist/ contains public files, complete local references and a local scene module exporting createNode.`);
console.log(`Built HTML + assets: ${(bytes / 1024).toFixed(1)} KiB; scene: ${(sceneGzipBytes / 1024).toFixed(1)} KiB gzip.`);
