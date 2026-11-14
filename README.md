# kosarevsky.dev

A personal studio for software, games, agent architecture and AI-assisted music as Anima Dao. Static HTML, CSS and JavaScript modules, with a locally bundled Three.js scene.

## Content and behavior

- Ten selected projects: A MOVE AGO, Agent Architecture, microGPT in Fortran, Axiom Spacetime, Orbita, AURIC OATH, Salvo, Aximo, albu-mcp and ajpegli. The first four have larger cards. Research includes Axiom Spacetime and Orbita, an interactive Solar System atlas at orbit.kosarevsky.dev. Orbita uses a local abstract orbit illustration. Axiom Spacetime links to its public manuscript, derivation and interactive plots, with a Private solver label and no code link. Fortran remains a Private project without links. AURIC OATH links to the playable six-mission platformer; its source repository has not been verified. Axiom Spacetime and AURIC OATH use screenshots of the public research site and actual gameplay. The older four projects remain under Earlier experiments.
- The site and 404 page are English only. Old language links and saved language preferences no longer change the page.
- Motion choices are saved locally when storage is available. Multiverse Node supports pointer and keyboard rotation and sends a probe between two portals. Rendering pauses when offscreen or in a background tab and respects reduced motion; paused jumps resolve instantly. A local still preview remains visible while loading or if 3D rendering fails.
- Anima Dao includes Spotify and YouTube Music links. Spotify receives no request until the visitor clicks Load Spotify player. The embedded artist player does not autoplay; available playback depends on Spotify. Direct links remain visible if the embed is blocked.
- No third-party fonts, analytics or runtime project API. Local project previews are lazy-loaded.

[PROJECTS.md](PROJECTS.md) records public sources and editorial limits. Edit `index.html` for page copy, `404.html` for the missing-page message, and `assets/projects.js` for project descriptions. Dynamic control labels live in `assets/app.js` and `assets/multiverse.js`.

## Local development

Use Node.js 22+ and Python 3:

```sh
npm ci --ignore-scripts
npm run check
npm run dev
```

Open <http://127.0.0.1:4173>. `npm run dev` builds and serves `dist/`; run it again after editing. The build copies only public files and bundles `src/multiverse/scene.js` into `dist/assets/multiverse-scene.js`. Documentation, source modules, prototypes, dependencies, tests and QA screenshots are excluded. Three.js and esbuild are pinned build dependencies; the browser loads the scene locally on demand, without a runtime CDN.

The homepage and [isolated prototype](prototypes/multiverse/README.md) share `src/multiverse/` for scene construction, portal effects and transit state. `npm run prototype` serves the prototype at <http://127.0.0.1:4174>; `npm run prototype:build` builds it without serving.

## Validation

`npm run check` validates English-only pages, project/filter data, public source owners, local previews, anchors, module imports, external link attributes, JavaScript syntax, source payload size, and motion/accessibility hooks. It also checks scene loading and lifecycle behavior and runs the shared transit, gesture and geometry/raycast tests.

Run `npm run build && npm run check:dist` before publication. The output check parses the delivered modules, verifies the scene export and all local HTML/CSS/module references, rejects external runtime imports and non-public output, and enforces budgets of 1,500,000 bytes for built HTML plus assets and 220 KiB gzip for the scene. The source HTML plus assets budget remains 1,000,000 bytes. Browser review covers desktop/mobile layout, scene controls and fallback, project filters, the music player, 404, console errors, horizontal overflow and English behavior with old language links/preferences.

## Publication

Repository: <https://github.com/dKosarevsky/kosarevsky.dev>. Production: <https://kosarevsky.dev/>.

Changes are prepared on feature branches and reviewed through pull requests. GitHub Actions installs the locked dependencies, runs source/runtime tests, builds and validates the delivered output for every pull request. A push to `main` or a manual workflow run performs the same checks and deploys `dist/` to GitHub Pages. Verify the Actions result and the live page after deployment.

The studio refresh was deployed with HTTPS and both apex/www verified on 2026-10-22. The English-only update was merged through [PR #2](https://github.com/dKosarevsky/kosarevsky.dev/pull/2) on 2026-10-23. Further content changes remain on feature branches until merged. DNS does not need changing for content releases.

## Domain configuration

GitHub Pages uses custom domain `kosarevsky.dev` with Enforce HTTPS enabled. Cloudflare records are DNS-only:

| Name | Type | Value |
| --- | --- | --- |
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |
| `www` | CNAME | `dkosarevsky.github.io` |

Preserve unrelated mail, verification and project subdomain records. See the [GitHub custom domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
