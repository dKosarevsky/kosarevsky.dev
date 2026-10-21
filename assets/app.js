import { projects, filterProjects } from './projects.js';
import { initOrb } from './orb.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* Private mode works without persistence. */ } },
};
const actionLabels = { play: 'Play game', read: 'Read the book', launch: 'Open project', source: 'View source' };
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
    const action = actionLabels[project.action];
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
    description.textContent = project.description;
    const links = document.createElement('div');
    links.className = 'card-links';
    const mainLink = externalLink(project.url, `${action} ↗`);
    mainLink.setAttribute('aria-label', `${action}: ${project.name}`);
    links.append(mainLink);
    if (project.url !== project.source) {
      const sourceLink = externalLink(project.source, 'GitHub ↗', 'source');
      sourceLink.setAttribute('aria-label', `Source code: ${project.name}`);
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
  $('#project-count').textContent = `${String(filtered.length).padStart(2, '0')} ${filtered.length === 1 ? 'PROJECT' : 'PROJECTS'}`;
}

function renderMotion() {
  document.body.classList.toggle('motion-off', !motionEnabled);
  document.documentElement.classList.toggle('motion-off', !motionEnabled);
  $('#motion-toggle').setAttribute('aria-pressed', String(motionEnabled));
  $('#motion-label').textContent = motionEnabled ? 'MOTION ON' : 'MOTION OFF';
  orb?.setMotion(motionEnabled);
}

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
  $('#warp-label').textContent = warpEnabled ? 'RETURN TO ORBIT' : 'WARP MODE';
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
  player.title = 'Anima Dao on Spotify';
  player.width = '100%';
  player.height = '352';
  player.allow = 'encrypted-media; fullscreen; picture-in-picture';
  player.referrerPolicy = 'strict-origin-when-cross-origin';
  $('#load-player').hidden = true;
  $('#music-player').prepend(player);
  $('#player-status').textContent = 'If the player doesn’t load, use the Spotify or YouTube Music links above.';
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
renderProjects();
renderMotion();
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
