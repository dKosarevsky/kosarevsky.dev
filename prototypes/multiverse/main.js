import { createNode } from '../../src/multiverse/scene.js';

const element = id => document.getElementById(id);
const canvas = element('scene');
const viewport = element('viewport');
const teleportButton = element('teleport');
const motionButton = element('motion');
const resetButton = element('reset');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let motion = !preference.matches;
let manualPreference = false;
let ready = false;
let node;

const phaseCopy = {
  align: ['ALIGNING THE NODE', 'The shell opens. The two mouths find each other.'],
  open: ['LINK OPEN', 'Follow the bright probe through the gateway.'],
  transfer: ['IN TRANSIT', 'One probe. Two mouths. A shortcut through spacetime.'],
  arrive: ['SIGNAL RECEIVED', 'The same probe, safely on the other side.'],
};
function updateMotion() {
  motionButton.setAttribute('aria-pressed', String(!motion));
  element('motion-label').textContent = motion ? 'Pause motion' : 'Resume motion';
  element('motion-icon').textContent = motion ? 'Ⅱ' : '▷';
  element('gesture-hint').textContent = motion ? 'DRAG TO ROTATE · TAP THE CORE' : 'MOTION PAUSED · YOU CAN STILL ROTATE';
}
function fallback() {
  ready = false;
  viewport.dataset.ready = 'false';
  viewport.setAttribute('aria-busy', 'false');
  canvas.tabIndex = -1;
  canvas.setAttribute('aria-hidden', 'true');
  element('poster').removeAttribute('aria-hidden');
  teleportButton.disabled = motionButton.disabled = resetButton.disabled = true;
  element('status-title').textContent = 'STILL PREVIEW';
  element('status').textContent = 'The 3D scene is unavailable. Reload to try again.';
  element('reload').hidden = false;
}
updateMotion();
try {
  node = createNode({
    canvas, motion,
    onReady() {
      ready = true;
      viewport.dataset.ready = 'true';
      viewport.setAttribute('aria-busy', 'false');
      canvas.tabIndex = 0;
      canvas.removeAttribute('aria-hidden');
      element('poster').setAttribute('aria-hidden', 'true');
      canvas.setAttribute('aria-label', 'Multiverse Node. Drag or use arrow keys to rotate. Use the Teleport button to send the probe.');
      teleportButton.disabled = motionButton.disabled = resetButton.disabled = false;
    },
    onStatus(state) {
      if (!ready) return;
      const [title, copy] = state.active ? phaseCopy[state.phase] : ['LINK STABLE',
        `You are in ${state.universeName}. ${motion ? `Inside the portal: ${state.destinationName}.` : 'Motion is paused; jumps resolve instantly.'}`];
      element('status-title').textContent = title;
      element('status').textContent = copy;
      element('jump-count').textContent = String(state.completedCount).padStart(3, '0');
      element('teleport-label').textContent = state.active ? 'In transit…' : 'Teleport';
      teleportButton.disabled = resetButton.disabled = state.active;
      teleportButton.setAttribute('aria-busy', String(state.active));
      teleportButton.setAttribute('aria-label', `Teleport to ${state.destinationName}`);
      element('universe-number').textContent = String(state.currentUniverse + 1).padStart(2, '0');
      element('universe-name').textContent = state.universeName;
      element('world-coordinate').textContent = `U—${String(state.currentUniverse + 1).padStart(2, '0')} / ${state.universeName.toUpperCase()}`;
      element('entry-label').textContent = `→ ${state.destinationName.toUpperCase()}`;
    },
    onFrame(state) {
      element('transit-progress').style.transform = `scaleX(${state.active ? state.progress : 0})`;
      element('entry-label').style.transform = `translate(${state.entry.x - 120}px, ${state.entry.y + 88}px)`;
      element('exit-label').style.transform = `translate(${state.exit.x - 15}px, ${state.exit.y - 59}px)`;
    },
    onError: fallback,
  });
} catch { fallback(); }

teleportButton.addEventListener('click', () => node?.teleport());
resetButton.addEventListener('click', () => node?.reset());
motionButton.addEventListener('click', () => {
  manualPreference = true;
  motion = !motion;
  updateMotion();
  node?.setMotion(motion);
});
element('reload').addEventListener('click', () => location.reload());
preference.addEventListener('change', event => {
  if (manualPreference) return;
  motion = !event.matches;
  updateMotion();
  node?.setMotion(motion);
});
