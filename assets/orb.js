/**
 * A small, dependency-free 3D knot renderer. Geometry is projected onto a
 * transparent 2D canvas so the surrounding page remains the background.
 */
export function initOrb(canvas, { onModeChange } = {}) {
  const context = canvas?.getContext?.('2d', { alpha: true });
  const noop = () => {};
  if (!context) return { setMotion: noop, setMode: noop, pulse: noop, destroy: noop };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionEnabled = !reducedMotion.matches;
  let inView = true;
  let destroyed = false;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let width = 640;
  let height = 640;
  let mode = 'orbit';
  let warp = 0;
  let pulseTime = -10;
  let points = [];
  let projected = [];
  let segments = 160;
  let sides = 8;
  const pointer = { x: 0, y: 0, currentX: 0, currentY: 0 };
  const TAU = Math.PI * 2;

  function createGeometry() {
    segments = width < 520 ? 100 : 160;
    sides = width < 520 ? 5 : 8;
    points = [];
    for (let i = 0; i < segments; i += 1) {
      const t = (i / segments) * TAU;
      const radial = 1.52 + 0.51 * Math.cos(3 * t);
      const center = [
        radial * Math.cos(2 * t),
        radial * Math.sin(2 * t),
        0.7 * Math.sin(3 * t),
      ];
      const derivative = [
        -1.53 * Math.sin(3 * t) * Math.cos(2 * t) - 2 * radial * Math.sin(2 * t),
        -1.53 * Math.sin(3 * t) * Math.sin(2 * t) + 2 * radial * Math.cos(2 * t),
        2.1 * Math.cos(3 * t),
      ];
      const length = Math.hypot(...derivative);
      const tangent = derivative.map((value) => value / length);
      const normalLength = Math.hypot(tangent[0], tangent[1]);
      const normal = [-tangent[1] / normalLength, tangent[0] / normalLength, 0];
      const binormal = [
        tangent[1] * normal[2] - tangent[2] * normal[1],
        tangent[2] * normal[0] - tangent[0] * normal[2],
        tangent[0] * normal[1] - tangent[1] * normal[0],
      ];
      for (let j = 0; j < sides; j += 1) {
        const angle = (j / sides) * TAU;
        const tube = 0.255 + 0.035 * Math.sin(t * 5);
        points.push({
          x: center[0] + tube * (Math.cos(angle) * normal[0] + Math.sin(angle) * binormal[0]),
          y: center[1] + tube * (Math.cos(angle) * normal[1] + Math.sin(angle) * binormal[1]),
          z: center[2] + tube * (Math.cos(angle) * normal[2] + Math.sin(angle) * binormal[2]),
          t,
          stripe: j,
          seed: Math.sin(i * 67.13 + j * 17.37) * 0.5 + 0.5,
        });
      }
    }
    projected = new Array(points.length);
  }

  function render() {
    if (destroyed) return;
    context.clearRect(0, 0, width, height);
    const scale = Math.min(width, height) * 0.184;
    const cx = width * 0.5;
    const cy = height * 0.49;
    const rotationY = elapsed * 0.11 + pointer.currentX * 0.42 + 0.28;
    const rotationX = -0.48 + Math.sin(elapsed * 0.13) * 0.13 + pointer.currentY * 0.3;
    const rotationZ = elapsed * 0.035 - 0.24;
    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);
    const cosZ = Math.cos(rotationZ);
    const sinZ = Math.sin(rotationZ);
    const pulseAge = elapsed - pulseTime;
    const pulseStrength = pulseAge >= 0 && pulseAge < 2.2
      ? Math.sin(pulseAge * Math.PI / 2.2) * Math.exp(-pulseAge * 1.1)
      : 0;

    // A faint halo lets the bright structure sit in space without a hard disk.
    const glow = context.createRadialGradient(cx, cy, scale * 0.1, cx, cy, scale * 2.8);
    glow.addColorStop(0, `rgba(159,216,73,${0.035 + warp * 0.025})`);
    glow.addColorStop(0.5, 'rgba(144,204,77,0.025)');
    glow.addColorStop(1, 'rgba(144,204,77,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    for (let i = 0; i < points.length; i += 1) {
      const point = points[i];
      const expansion = 1 + warp * (0.12 + point.seed * 0.8)
        + pulseStrength * Math.sin(point.t * 4 - pulseAge * 5) * 0.18;
      const wave = warp * Math.sin(elapsed * 1.2 + point.t * 7) * 0.12;
      const px = point.x * expansion;
      const py = point.y * expansion;
      const pz = point.z * expansion + wave;
      const x1 = px * cosY + pz * sinY;
      const z1 = -px * sinY + pz * cosY;
      const y1 = py * cosX - z1 * sinX;
      const z2 = py * sinX + z1 * cosX;
      const x2 = x1 * cosZ - y1 * sinZ;
      const y2 = x1 * sinZ + y1 * cosZ;
      const perspective = 6 / (6 - z2);
      projected[i] = {
        x: cx + x2 * scale * perspective,
        y: cy + y2 * scale * perspective,
        z: z2,
        alpha: Math.max(0.12, Math.min(1, (z2 + 2.6) / 4.7)),
        size: perspective,
      };
    }

    // Longitudinal filaments make a continuous, sculptural surface.
    context.lineWidth = 0.65;
    for (let i = 0; i < points.length; i += 1) {
      const point = projected[i];
      const next = projected[(i + sides) % points.length];
      const intensity = (point.alpha + next.alpha) * 0.5;
      context.strokeStyle = points[i].stripe % 3 === 0
        ? `rgba(223,245,196,${intensity * 0.52 * (1 - warp * 0.48)})`
        : `rgba(174,238,91,${intensity * 0.38 * (1 - warp * 0.48)})`;
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(next.x, next.y);
      context.stroke();
      if (Math.floor(i / sides) % 3 === 0) {
        const ringNext = projected[Math.floor(i / sides) * sides + (i + 1) % sides];
        context.strokeStyle = `rgba(198,255,112,${intensity * 0.18 * (1 - warp * 0.7)})`;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(ringNext.x, ringNext.y);
        context.stroke();
      }
    }

    // Depth sorting prevents the brightest front points being flattened by
    // a dim rear surface. Separate halos avoid costly per-point shadowBlur.
    const order = projected.map((point, index) => ({ ...point, index }))
      .sort((a, b) => a.z - b.z);
    for (const point of order) {
      const seed = points[point.index].seed;
      const brightness = point.alpha * (0.65 + seed * 0.35);
      const radius = Math.max(0.45, point.size * (0.62 + seed * 0.48 + warp * 0.28));
      if (seed > 0.88 && brightness > 0.5) {
        context.fillStyle = `rgba(183,255,92,${brightness * 0.11})`;
        context.beginPath();
        context.arc(point.x, point.y, radius * 4, 0, TAU);
        context.fill();
      }
      context.fillStyle = seed > 0.72
        ? `rgba(242,255,223,${brightness})`
        : `rgba(191,255,99,${brightness * 0.9})`;
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, TAU);
      context.fill();
    }

    // Sparse satellites are deterministic and remain still when motion is off.
    for (let i = 0; i < 24; i += 1) {
      const angle = i * 2.399 + elapsed * (i % 2 ? 0.013 : -0.009);
      const radius = scale * (2.6 + Math.sin(i * 3.17) * 0.55);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.85;
      context.fillStyle = `rgba(214,244,178,${0.1 + (i % 4) * 0.04})`;
      context.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
  }

  function shouldAnimate() {
    return motionEnabled && inView && !document.hidden && !destroyed;
  }

  function tick(now) {
    frame = 0;
    if (!shouldAnimate()) return;
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    elapsed += delta;
    const smoothing = 1 - Math.exp(-delta * 3.8);
    pointer.currentX += (pointer.x - pointer.currentX) * smoothing;
    pointer.currentY += (pointer.y - pointer.currentY) * smoothing;
    warp += ((mode === 'warp' ? 1 : 0) - warp) * smoothing;
    render();
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    if (destroyed) return;
    if (shouldAnimate()) {
      if (!frame) {
        lastTime = 0;
        frame = requestAnimationFrame(tick);
      }
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      render();
    }
  }

  function resize() {
    if (destroyed) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    createGeometry();
    render();
  }

  function move(event) {
    if (!motionEnabled) return;
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
  }

  function leave() {
    pointer.x = 0;
    pointer.y = 0;
  }

  function pulse() {
    if (destroyed || !motionEnabled) return;
    pulseTime = elapsed;
    sync();
  }

  function setMotion(enabled) {
    if (destroyed) return;
    motionEnabled = Boolean(enabled);
    if (!motionEnabled) {
      warp = mode === 'warp' ? 1 : 0;
      pulseTime = -10;
    }
    sync();
  }

  function setMode(nextMode) {
    if (destroyed) return;
    const next = nextMode === 'warp' ? 'warp' : 'orbit';
    if (next === mode) return;
    mode = next;
    if (!motionEnabled) warp = mode === 'warp' ? 1 : 0;
    onModeChange?.(mode);
    sync();
  }

  canvas.addEventListener('pointermove', move, { passive: true });
  canvas.addEventListener('pointerleave', leave, { passive: true });
  canvas.addEventListener('click', pulse);
  document.addEventListener('visibilitychange', sync);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  }, { rootMargin: '80px' });
  intersectionObserver.observe(canvas);
  resize();
  sync();

  return {
    setMotion,
    setMode,
    pulse,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('click', pulse);
      document.removeEventListener('visibilitychange', sync);
    },
  };
}
