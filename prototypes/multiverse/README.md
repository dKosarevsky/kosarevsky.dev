# Multiverse Node — prototype 0.1

A standalone study for the kosarevsky.dev hero: one universe, eight machined shell fragments, and a probe that crosses two linked portal mouths. It shares the scene implementation in `src/multiverse/` with the homepage; the prototype itself is excluded from the public build.

From the repository root, using Node 22 or later:

```sh
npm ci
npm run prototype:check
npm run prototype
```

Open <http://127.0.0.1:4174/>. The preview watches source files; reload the browser after changes. `npm run prototype:build` bundles without starting a server. Generated files under `dist/` are ignored.

- Drag to rotate; hover to lift a fragment. Arrow keys rotate the focused artwork.
- Tap the black core or press **Teleport**. A jump takes about 2.35 seconds. Both mouths remain visible, and the same probe emerges from the exit.
- **Pause motion** stops the animation loop and inertia. Rotation remains manual; explicit jumps finish instantly. The initial setting follows `prefers-reduced-motion` without changing the portfolio's saved preference.
- Pausing, hiding the tab, or scrolling the scene out of view finishes a current jump exactly once. Repeated activation during a jump is ignored.
- Phones retain vertical scrolling and pinch zoom. **Reset view** restores the front aperture.
- A still illustration remains available while loading or if WebGL 2 is unavailable. **Reload preview** retries a failed scene.

All geometry, textures and shaders are procedural. Three.js and esbuild are pinned development dependencies; no remote assets, trackers or external music players load in the prototype. The teleportation is an interaction metaphor, not a physical simulation.

The state/gesture checks exercise transition guards, cancellation, pause completion and multiple pointers. The portal checks use Three.js raycasting to verify that transparent glow cannot intercept clicks on the shell. Browser verification covers desktop rotation, keyboard controls, animated and paused jumps, pause during a jump, and a 390px layout. Physical phone performance and GPU failure recovery still need device testing before homepage integration.
