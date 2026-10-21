import assert from 'node:assert/strict';
import { readFile, readdir, stat, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SourceTextModule, Script } from 'node:vm';
import { translations } from '../assets/i18n.js';
import { projects, filterProjects } from '../assets/projects.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => readFile(path.join(root, name), 'utf8');
const html = await read('index.html');
assert.match(html, /<html lang="en">/, 'English must be the first-visit default');
assert.deepEqual(Object.keys(translations).sort(), ['en', 'es', 'ru']);
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
assert.equal(new Set(projects.map((p) => p.id)).size, projects.length, 'Project IDs must be unique');
for (const project of projects) {
  assert.ok(['tools', 'games', 'ai'].includes(project.category));
  assert.ok(!/hackathon/i.test(JSON.stringify(project)), 'Hackathon project detected');
  for (const locale of ['en', 'ru', 'es']) assert.ok(project.description[locale], `${project.id}: missing ${locale}`);
  assert.equal(new URL(project.source).hostname, 'github.com');
  assert.ok(new URL(project.source).pathname.startsWith('/dKosarevsky/'));
  assert.equal(new URL(project.url).protocol, 'https:');
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
for (const [locale, number, key] of [['en', 1, 'countOne'], ['ru', 2, 'countFew'], ['es', 1, 'countOne']]) {
  const plural = new Intl.PluralRules(locale).select(number);
  assert.equal(plural === 'one' ? 'countOne' : plural === 'few' ? 'countFew' : 'count', key);
  assert.ok(translations[locale][key].includes('{n}'));
}
const css = await read('assets/style.css');
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /:focus-visible/);
assert.equal((await read('CNAME')).trim(), 'kosarevsky.dev');
assert.match(await read('.github/workflows/pages.yml'), /path: \.\/dist/);
let bytes = (await stat(path.join(root, 'index.html'))).size;
for (const file of await readdir(path.join(root, 'assets'))) bytes += (await stat(path.join(root, 'assets', file))).size;
assert.ok(bytes < 500_000, `Static payload unexpectedly large: ${bytes}`);
console.log(`PASS: 3 complete locales, ${projects.length} curated projects, working filter data, local assets/anchors, JS syntax, motion/accessibility hooks.`);
console.log(`Initial HTML + all assets: ${(bytes / 1024).toFixed(1)} KiB. No dependencies or external runtime requests.`);
await import('./check-orb.mjs');
