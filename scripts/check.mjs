import assert from 'node:assert/strict';
import { readFile, readdir, stat, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SourceTextModule, Script } from 'node:vm';
import { translations } from '../assets/i18n.js';
import { projects, filterProjects } from '../assets/projects.js';
import { resolveLocale, documentLanguage } from '../assets/locale.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => readFile(path.join(root, name), 'utf8');
const html = await read('index.html');
assert.match(html, /<html lang="en">/, 'English must be the first-visit default');
assert.deepEqual(Object.keys(translations).sort(), ['en', 'ru', 'zh']);
for (const [query, saved, expected] of [
  [null, null, 'en'], [null, 'ru', 'ru'], [null, 'zh', 'zh'], [null, 'es', 'en'],
  ['zh', 'ru', 'zh'], ['en', 'zh', 'en'], ['es', 'ru', 'en'], ['invalid', 'zh', 'en'],
]) assert.equal(resolveLocale(query, saved), expected);
assert.equal(documentLanguage('zh'), 'zh-Hans');
assert.equal(documentLanguage('ru'), 'ru');
const enKeys = Object.keys(translations.en).sort();
const htmlKeys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((match) => match[1]);
for (const [locale, dict] of Object.entries(translations)) {
  assert.deepEqual(Object.keys(dict).sort(), enKeys, `${locale}: translation keys differ`);
  for (const key of htmlKeys) assert.ok(dict[key], `${locale}: missing ${key}`);
  for (const [key, value] of Object.entries(dict)) {
    assert.equal(typeof value, 'string');
    assert.ok(value.length > 0, `${locale}.${key} is empty`);
    assert.ok(!/<(?:script|iframe)|on\w+=|javascript:/i.test(value), `${locale}.${key}: unsafe HTML`);
  }
  assert.ok(dict.count.includes('{n}'), `${locale}: count placeholder missing`);
}
assert.equal(projects.length, 6);
assert.deepEqual(projects.map((p) => p.id), ['chess', 'book', 'salvo', 'aximo', 'mcp', 'jpeg']);
assert.equal(new Set(projects.map((p) => p.id)).size, projects.length, 'Project IDs must be unique');
for (const project of projects) {
  assert.ok(['tools', 'games', 'ai'].includes(project.category));
  assert.ok(!/hackathon/i.test(JSON.stringify(project)), 'Hackathon project detected');
  for (const locale of ['en', 'ru', 'zh']) assert.ok(project.description[locale], `${project.id}: missing ${locale}`);
  assert.deepEqual(Object.keys(project.description).sort(), ['en', 'ru', 'zh']);
  assert.ok(['play', 'read', 'launch', 'source'].includes(project.action));
  for (const dict of Object.values(translations)) assert.ok(dict[project.action]);
  assert.equal(new URL(project.source).hostname, 'github.com');
  assert.ok(/^\/(dKosarevsky|agent-axiom)\//.test(new URL(project.source).pathname));
  assert.equal(new URL(project.url).protocol, 'https:');
  if (project.preview) await access(path.join(root, project.preview));
}
assert.equal(filterProjects('all').length, projects.length);
for (const category of ['tools', 'games', 'ai']) {
  assert.ok(filterProjects(category).length > 0);
  assert.ok(filterProjects(category).every((p) => p.category === category));
}
assert.deepEqual(filterProjects('invalid'), []);
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
  new SourceTextModule(await read(`assets/${file}`), { identifier: file });
}
for (const script of (await read('404.html')).matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script[1]);
for (const [locale, number, key] of [['en', 1, 'countOne'], ['ru', 2, 'countFew'], ['zh', 1, 'count']]) {
  const plural = new Intl.PluralRules(locale).select(number);
  assert.equal(plural === 'one' ? 'countOne' : plural === 'few' ? 'countFew' : 'count', key);
  assert.ok(translations[locale][key].includes('{n}'));
}
const css = await read('assets/style.css');
const notFound = await read('404.html');
for (const locale of ['en', 'ru', 'zh']) assert.match(notFound, new RegExp(`data-lang="${locale}"`));
assert.doesNotMatch(html + css + notFound, /data-lang="es"|lang=es|Español/);
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
console.log(`PASS: 3 complete locales, ${projects.length} curated projects, working filter data, local assets/anchors, JS syntax, motion/accessibility hooks.`);
console.log(`HTML + all local assets: ${(bytes / 1024).toFixed(1)} KiB. Project previews are lazy; Spotify requires a click.`);
await import('./check-orb.mjs');
