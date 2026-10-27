import assert from 'node:assert/strict';
import { readFile, readdir, stat, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SourceTextModule } from 'node:vm';
import { projects, filterProjects } from '../assets/projects.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => readFile(path.join(root, name), 'utf8');
const html = await read('index.html');
assert.match(html, /<html lang="en">/, 'The site must be in English');
const app = await read('assets/app.js');
const css = await read('assets/style.css');
const notFound = await read('404.html');
assert.match(notFound, /<html lang="en">/, 'The 404 page must be in English');
assert.doesNotMatch(html + notFound + app + css, /data-(?:lang|i18n)\b|kosarevsky-language|lang=(?:ru|zh)|(?:i18n|locale)\.js/, 'Language switching must be removed');
assert.doesNotMatch(html + notFound + app, /[\p{Script=Cyrillic}\p{Script=Han}]/u, 'Public copy must be English only');
assert.equal(projects.length, 9);
assert.deepEqual(projects.map((p) => p.id), ['chess', 'book', 'fortran', 'teleport', 'auric', 'salvo', 'aximo', 'mcp', 'jpeg']);
assert.match(html, /<sup>09<\/sup>/);
assert.match(html, /id="project-count">09 PROJECTS</);
assert.equal(new Set(projects.map((p) => p.id)).size, projects.length, 'Project IDs must be unique');
for (const project of projects) {
  assert.ok(['tools', 'games', 'ai', 'research'].includes(project.category));
  assert.ok(!/hackathon/i.test(JSON.stringify(project)), 'Hackathon project detected');
  assert.equal(typeof project.description, 'string', `${project.id}: expected one English description`);
  assert.ok(project.description.trim(), `${project.id}: description is empty`);
  assert.doesNotMatch(project.description, /[\p{Script=Cyrillic}\p{Script=Han}]/u);
  if (project.privateSource) {
    assert.ok(!project.source, `${project.id}: private source repositories must not be linked publicly`);
  }
  if (project.url) {
    assert.ok(['play', 'read', 'research', 'launch', 'source'].includes(project.action));
    assert.equal(new URL(project.url).protocol, 'https:');
  } else {
    assert.ok(project.privateSource, `${project.id}: a public project needs a destination`);
  }
  if (project.source) {
    assert.equal(new URL(project.source).hostname, 'github.com');
    assert.ok(/^\/(dKosarevsky|agent-axiom)\//.test(new URL(project.source).pathname));
  }
  if (project.preview) await access(path.join(root, project.preview));
}
assert.equal(filterProjects('all').length, projects.length);
for (const category of ['tools', 'games', 'ai', 'research']) {
  assert.ok(filterProjects(category).length > 0);
  assert.ok(filterProjects(category).every((p) => p.category === category));
}
assert.deepEqual(filterProjects('invalid'), []);
assert.equal(filterProjects('games').length, 3);
assert.equal(projects.find((p) => p.id === 'teleport').url, 'https://blackhole.kosarevsky.dev/');
assert.equal(projects.find((p) => p.id === 'auric').url, 'https://auricoath.kosarevsky.dev/');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML IDs');
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const reference = match[1];
  if (reference.startsWith('#')) assert.ok(ids.includes(reference.slice(1)), `Broken anchor ${reference}`);
  if (reference.startsWith('./') && reference !== './') await access(path.join(root, reference));
}
for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
  assert.match(match[0], /rel="[^"]*noopener/, 'External link missing noopener');
}
for (const file of (await readdir(path.join(root, 'assets'))).filter((name) => name.endsWith('.js'))) {
  const source = await read(`assets/${file}`);
  new SourceTextModule(source, { identifier: file });
  for (const match of source.matchAll(/from ['"](\.\/[^'"]+)['"]/g)) {
    await access(path.resolve(root, 'assets', match[1]));
  }
}
assert.doesNotMatch(html, /<iframe\b/i, 'External music player must require activation');
assert.match(html, /https:\/\/open.spotify.com\/artist\/4YO7ubezcs9vHJLGZD9omg/);
assert.match(html, /https:\/\/music.youtube.com\/channel\/UC1dlgl7NCDtOh9qnW3jdHfA/);
assert.match(html, /id="load-player"/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /:focus-visible/);
assert.equal((await read('CNAME')).trim(), 'kosarevsky.dev');
assert.match(await read('.github/workflows/pages.yml'), /path: \.\/dist/);
async function directoryBytes(directory) {
  let size = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    size += entry.isDirectory() ? await directoryBytes(file) : (await stat(file)).size;
  }
  return size;
}
const bytes = (await stat(path.join(root, 'index.html'))).size + await directoryBytes(path.join(root, 'assets'));
assert.ok(bytes < 1_000_000, `Static payload unexpectedly large: ${bytes}`);
console.log(`PASS: English-only pages, ${projects.length} curated projects, working filter data, local assets/anchors/imports, JS syntax, motion/accessibility hooks.`);
console.log(`HTML + all local assets: ${(bytes / 1024).toFixed(1)} KiB. Project previews are lazy; Spotify requires a click.`);
await import('./check-orb.mjs');
