/** A flight owns its completion; finish() is safe for both pause and visibility events. */
export function createTransit({ duration = 2.35, universeCount = 3 } = {}) {
  if (!Number.isInteger(universeCount) || universeCount < 2) {
    throw new RangeError('universeCount must be an integer of at least 2');
  }
  let active = false;
  let elapsed = 0;
  let completedCount = 0;

  function snapshot() {
    const progress = elapsed / duration;
    const phase = !active && progress === 0 ? 'idle'
      : progress < 0.23 ? 'align'
        : progress < 0.43 ? 'open'
          : progress < 0.79 ? 'transfer' : 'arrive';
    return {
      active, progress, phase, completedCount,
      currentUniverse: completedCount % universeCount,
      destinationUniverse: (completedCount + 1) % universeCount,
    };
  }

  function finish() {
    if (active) {
      active = false;
      elapsed = duration;
      completedCount += 1;
    }
    return snapshot();
  }

  return {
    start({ instant = false } = {}) {
      if (active) return false;
      active = true;
      elapsed = 0;
      if (instant) finish();
      return true;
    },
    advance(deltaSeconds) {
      if (active && Number.isFinite(deltaSeconds)) {
        elapsed = Math.min(duration, elapsed + Math.max(0, deltaSeconds));
        if (elapsed >= duration) finish();
      }
      return snapshot();
    },
    finish,
    snapshot,
  };
}

/** Coordinates and the threshold are CSS pixels. Move deltas are per event. */
export function createGesture({ threshold = 7 } = {}) {
  const pointers = new Set();
  let pointer = null;

  function move(id, x, y) {
    if (!pointer || pointer.id !== id) return null;
    const dx = x - pointer.x;
    const dy = y - pointer.y;
    pointer.dragging ||= Math.hypot(x - pointer.startX, y - pointer.startY) >= threshold;
    pointer.x = x;
    pointer.y = y;
    return { dx, dy, dragging: pointer.dragging };
  }

  return {
    begin(id, x, y) {
      if (pointers.has(id)) return false;
      pointers.add(id);
      if (pointers.size > 1) {
        pointer = null;
        return false;
      }
      pointer = { id, startX: x, startY: y, x, y, dragging: false };
      return true;
    },
    move,
    end(id, x, y) {
      pointers.delete(id);
      const result = move(id, x, y);
      if (!result) return null;
      pointer = null;
      return { tap: !result.dragging, dragging: result.dragging };
    },
    cancel() {
      pointer = null;
      pointers.clear();
    },
  };
}
