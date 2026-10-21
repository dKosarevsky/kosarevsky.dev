import { translations } from './i18n.js';
import { projects, filterProjects } from './projects.js';
import { initOrb } from './orb.js';
import { resolveLocale, documentLanguage } from './locale.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* Private mode works without persistence. */ } },
};
const queryLocale = new URL(location.href).searchParams.get('lang');
const savedLocale = storage.get('kosarevsky-language');
let locale = resolveLocale(queryLocale, savedLocale);
let activeFilter = 'all';
let warpEnabled = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let motionEnabled = storage.get('kosarevsky-motion') !== 'off' && !reduced.matches;
let orb;

const art = {
  aximo: '<div class="technical-art"><span class="technical-label">VOICE → TEXT</span><div class="signal-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="technical-code">Rust / HTTP / WebSocket</span></div>',
  jpeg: '<div class="technical-art"><span class="technical-label">JPEG ↔ NUMPY</span><div class="jpeg-stack"><i></i><i></i><i></i></div><span class="technical-code">decode · encode · inspect</span></div>',
  mcp: '<div class="technical-art"><span class="technical-label">PREVIEW → REFINE → EXPORT</span><div class="pixel-grid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="technical-code">AlbumentationsX × MCP</span></div>',
};

function t(key) { return translations[locale][key] ?? translations.en[key] ?? key; }
function externalLink(href, label, className = '') {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = className;
  a.textContent = label;
  return a;
}

function renderProjects() {
  const fragment = document.createDocumentFragment();
  const filtered = filterProjects(activeFilter);
  for (const project of filtered) {
    const card = document.createElement('article');
    card.className = `project-card${project.featured ? ' featured' : ''}`;
    card.dataset.project = project.id;
    const action = t(project.action);
    const visual = externalLink(project.url, '', `card-visual visual-${project.id}`);
    visual.setAttribute('aria-label', `${action}: ${project.name}`);
    if (project.preview) {
      const preview = document.createElement('img');
      preview.src = project.preview;
      preview.alt = '';
      preview.loading = 'lazy';
      preview.decoding = 'async';
      preview.width = 1200;
      preview.height = 800;
      preview.className = 'project-preview';
      visual.append(preview);
    } else {
      const illustration = document.createElement('div');
      illustration.setAttribute('aria-hidden', 'true');
      illustration.innerHTML = art[project.id] ?? '';
      visual.append(illustration);
    }
    const body = document.createElement('div');
    body.className = 'card-body';
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = project.tags.join(' / ');
    const heading = document.createElement('h3');
    heading.id = `project-${project.id}`;
    heading.append(externalLink(project.url, project.name));
    card.setAttribute('aria-labelledby', heading.id);
    const description = document.createElement('p');
    description.textContent = project.description[locale];
    const links = document.createElement('div');
    links.className = 'card-links';
    const mainLink = externalLink(project.url, `${action} ↗`);
    mainLink.setAttribute('aria-label', `${action}: ${project.name}`);
    links.append(mainLink);
    if (project.url !== project.source) {
      const sourceLink = externalLink(project.source, 'GitHub ↗', 'source');
      sourceLink.setAttribute('aria-label', `${t('source')}: ${project.name}`);
      links.append(sourceLink);
    } else {
      const sourceLabel = document.createElement('span');
      sourceLabel.className = 'source';
      sourceLabel.textContent = 'GitHub';
      links.append(sourceLabel);
    }
    body.append(meta, heading, description, links);
    card.append(visual, body);
    fragment.append(card);
  }
  $('#project-grid').replaceChildren(fragment);
  $('#project-grid').dataset.filter = activeFilter;
  const plural = new Intl.PluralRules(locale).select(filtered.length);
  const countKey = plural === 'one' ? 'countOne' : plural === 'few' ? 'countFew' : 'count';
  $('#project-count').textContent = t(countKey).replace('{n}', String(filtered.length).padStart(2, '0'));
}

function renderMotion() {
  document.body.classList.toggle('motion-off', !motionEnabled);
  document.documentElement.classList.toggle('motion-off', !motionEnabled);
  $('#motion-toggle').setAttribute('aria-pressed', String(motionEnabled));
  $('#motion-label').textContent = t(motionEnabled ? 'motionOn' : 'motionOff');
  orb?.setMotion(motionEnabled);
}

function setLanguage(nextLocale, updateUrl = false) {
  if (!Object.hasOwn(translations, nextLocale)) return;
  locale = nextLocale;
  document.documentElement.lang = documentLanguage(locale);
  document.title = t('title');
  $$('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    // Translation dictionaries are checked-in editorial content, never user input.
    element.innerHTML = t(key);
  });
  $$('[data-i18n-aria]').forEach((element) => element.setAttribute('aria-label', t(element.dataset.i18nAria)));
  $$('[data-lang]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === locale)));
  $('meta[name="description"]').content = t('metaDescription');
  $('meta[property="og:description"]').content = t('metaDescription');
  $('meta[property="og:title"]').content = t('title');
  $('#warp [data-i18n]').textContent = t(warpEnabled ? 'warpActive' : 'warp');
  if ($('#spotify-player')) $('#spotify-player').title = t('playerTitle');
  if (updateUrl) {
    storage.set('kosarevsky-language', locale);
    const url = new URL(location.href);
    if (locale === 'en') url.searchParams.delete('lang');
    else url.searchParams.set('lang', locale);
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }
  renderProjects();
  renderMotion();
}

$$('[data-lang]').forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.lang, true)));
$$('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    $$('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    renderProjects();
  });
});
$('#warp').addEventListener('click', () => {
  warpEnabled = !warpEnabled;
  $('#warp').setAttribute('aria-pressed', String(warpEnabled));
  $('#warp [data-i18n]').textContent = t(warpEnabled ? 'warpActive' : 'warp');
  orb?.setMode(warpEnabled ? 'warp' : 'orbit');
});
$('#motion-toggle').addEventListener('click', () => {
  motionEnabled = !motionEnabled;
  storage.set('kosarevsky-motion', motionEnabled ? 'on' : 'off');
  renderMotion();
});
reduced.addEventListener('change', () => {
  motionEnabled = !reduced.matches && storage.get('kosarevsky-motion') !== 'off';
  renderMotion();
});
$('#back-top').addEventListener('click', (event) => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: motionEnabled ? 'smooth' : 'instant' });
});
$('#year').textContent = new Date().getFullYear();
$('#load-player').addEventListener('click', () => {
  if ($('#spotify-player')) return;
  const player = document.createElement('iframe');
  player.id = 'spotify-player';
  player.className = 'spotify-player';
  player.src = 'https://open.spotify.com/embed/artist/4YO7ubezcs9vHJLGZD9omg?utm_source=generator&theme=0';
  player.title = t('playerTitle');
  player.width = '100%';
  player.height = '352';
  player.allow = 'encrypted-media; fullscreen; picture-in-picture';
  player.referrerPolicy = 'strict-origin-when-cross-origin';
  $('#load-player').hidden = true;
  $('#music-player').prepend(player);
  $('#player-status').dataset.i18n = 'playerLoaded';
  $('#player-status').textContent = t('playerLoaded');
  player.focus();
});
let scrollFrame = 0;
function updateProgress() {
  const total = document.documentElement.scrollHeight - innerHeight;
  $('.page-progress').style.width = `${total > 0 ? Math.min(100, scrollY / total * 100) : 0}%`;
  scrollFrame = 0;
}
addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress);
}, { passive: true });
setLanguage(locale);
updateProgress();
try {
  const canvas = $('#orb');
  orb = initOrb(canvas);
  if (canvas.getContext('2d')) document.body.classList.add('canvas-ready');
  orb.setMotion(motionEnabled);
} catch (error) {
  // The static orbital illustration remains visible when canvas is unavailable.
  console.warn('Interactive artwork is unavailable; showing the static illustration.', error);
}
