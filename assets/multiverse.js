const loadRuntime = () => import('./multiverse-scene.js');
const phases = { align: 'ALIGNING', open: 'LINK OPEN', transfer: 'IN TRANSIT', arrive: 'SIGNAL RECEIVED' };

/** The page owns motion preferences; this controller owns loading and artwork controls. */
export function initMultiverse(host, { motion = true, loadScene = loadRuntime } = {}) {
  const find = selector => host.querySelector(selector);
  const canvas = find('canvas');
  const teleportButton = find('[data-node-teleport]');
  const resetButton = find('[data-node-reset]');
  const retryButton = find('[data-node-retry]');
  const status = find('[data-node-status]');
  const phase = find('[data-node-phase]');
  const counter = find('[data-node-count]');
  const progress = find('[data-node-progress]');
  const entryLabel = find('[data-node-entry]');
  const exitLabel = find('[data-node-exit]');
  const actionLabel = find('[data-node-action]');
  const worldLabel = find('[data-node-world]');
  let scene, runtime, observer, frame = 0;
  let visible = false, loading = false, ready = false, failed = false, destroyed = false;
  let state = { active: false, phase: 'idle', completedCount: 0 };
  let announcedCount = 0;
  const listeners = [];
  function listen(target, type, callback) {
    target.addEventListener(type, callback);
    listeners.push(() => target.removeEventListener(type, callback));
  }
  function cancelStart() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  function disposeScene() { const previous = scene; scene = null; previous?.destroy(); }
  function updateControls() {
    teleportButton.disabled = resetButton.disabled = !ready || state.active;
    teleportButton.setAttribute('aria-busy', String(state.active));
    if (actionLabel) actionLabel.textContent = state.active ? 'In transit…' : 'Teleport';
    phase.textContent = state.active ? phases[state.phase] : 'LINK STABLE';
    counter.textContent = String(state.completedCount).padStart(3, '0');
    if (state.universeName && worldLabel) worldLabel.textContent = `U—${String(state.currentUniverse + 1).padStart(2, '0')} ${state.universeName.toUpperCase()}`;
    if (state.destinationName) {
      entryLabel.textContent = `→ ${state.destinationName.toUpperCase()}`;
      teleportButton.setAttribute('aria-label', `Teleport to ${state.destinationName}`);
    }
  }
  function describeStillState() {
    if (!ready || state.active) return;
    if (state.universeName && state.destinationName) {
      status.textContent = state.completedCount
        ? `Arrived in ${state.universeName}. ${motion ? `Next: ${state.destinationName}.` : 'Motion paused; jumps resolve instantly.'}`
        : motion ? `Inside the portal: ${state.destinationName}. Drag to explore.` : `Portal to ${state.destinationName}. Motion paused; jumps resolve instantly.`;
    } else {
      status.textContent = state.completedCount
        ? `Jump ${String(state.completedCount).padStart(2, '0')} complete. ${motion ? 'Follow the probe through again.' : 'Motion is paused; jumps resolve instantly.'}`
        : motion ? 'Drag to rotate · tap the core' : 'Motion paused · rotate freely · jumps resolve instantly';
    }
  }
  function fallback() {
    if (destroyed || failed) return;
    failed = true; ready = false;
    cancelStart(); disposeScene();
    host.dataset.scene = 'fallback';
    host.setAttribute('aria-busy', 'false');
    canvas.tabIndex = -1;
    canvas.setAttribute('aria-hidden', 'true');
    teleportButton.disabled = resetButton.disabled = true;
    phase.textContent = 'STILL VIEW';
    if (worldLabel) worldLabel.textContent = 'STILL PREVIEW';
    status.textContent = '3D is unavailable. You can still explore the research.';
    retryButton.hidden = false;
    progress.style.transform = 'scaleX(0)';
  }
  function canStart() { return !destroyed && !failed && visible && !document.hidden; }
  async function start() {
    if (!canStart() || scene || loading) return;
    try {
      if (!runtime) {
        loading = true;
        runtime = await loadScene();
        loading = false;
      }
      if (!canStart()) return;
      const instance = runtime.createNode({
        canvas, motion,
        onReady() {
          if (destroyed || failed) return;
          ready = true;
          host.dataset.scene = 'ready';
          host.setAttribute('aria-busy', 'false');
          canvas.tabIndex = 0;
          canvas.removeAttribute('aria-hidden');
          updateControls(); describeStillState();
        },
        onStatus(next) {
          if (destroyed || failed) return;
          const worldChanged = state.universeName !== next.universeName;
          state = next;
          updateControls();
          if (!next.active && (next.completedCount !== announcedCount || worldChanged)) {
            announcedCount = next.completedCount;
            describeStillState();
          }
        },
        onFrame(next) {
          if (destroyed || failed) return;
          progress.style.transform = `scaleX(${next.active ? next.progress : 0})`;
          entryLabel.style.transform = `translate(${next.entry.x - 80}px, ${next.entry.y + 67}px)`;
          exitLabel.style.transform = `translate(${next.exit.x - 12}px, ${next.exit.y - 49}px)`;
        },
        onError: fallback,
      });
      if (destroyed || failed) instance.destroy();
      else scene = instance;
    } catch { loading = false; fallback(); }
  }
  function queueStart() {
    if (!canStart() || frame || scene) return;
    // Two frames let the static portfolio and poster paint before 3D initialization.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => { frame = 0; void start(); });
    });
  }
  host.dataset.scene = 'loading';
  host.setAttribute('aria-busy', 'true');
  canvas.tabIndex = -1;
  canvas.setAttribute('aria-hidden', 'true');
  teleportButton.disabled = resetButton.disabled = true;
  retryButton.hidden = true;
  const controller = {
    setMotion(enabled) {
      motion = Boolean(enabled);
      if (destroyed || failed) return;
      scene?.setMotion(motion);
      describeStillState();
    },
    teleport() { return ready && !state.active ? scene?.teleport() : false; },
    reset() { if (ready && !state.active) scene?.reset(); },
    destroy() {
      if (destroyed) return;
      destroyed = true; ready = false;
      cancelStart(); observer?.disconnect();
      listeners.forEach(remove => remove());
      disposeScene();
    },
  };
  listen(teleportButton, 'click', controller.teleport);
  listen(resetButton, 'click', controller.reset);
  listen(retryButton, 'click', () => window.location.reload());
  listen(document, 'visibilitychange', () => { if (document.hidden) cancelStart(); else queueStart(); });
  listen(window, 'pagehide', event => { if (!event.persisted) controller.destroy(); });
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) queueStart(); else cancelStart();
    });
    observer.observe(host);
  } else { visible = true; queueStart(); }
  return controller;
}
