# kosarevsky.dev

A personal studio for software, games, agent architecture and AI-assisted music as Anima Dao. Static HTML, CSS and JavaScript modules; no package dependencies.

## Content and behavior

- Nine selected projects: A MOVE AGO, Agent Architecture, microGPT in Fortran, Axiom Spacetime, AURIC OATH, Salvo, Aximo, albu-mcp and ajpegli. The first four have larger cards. Axiom Spacetime links to its public manuscript, derivation and interactive plots, with a Private solver label and no code link. Fortran remains a Private project without links. AURIC OATH links to the playable six-mission platformer; its source repository has not been verified. Axiom Spacetime and AURIC OATH use screenshots of the public research site and actual gameplay. The older four projects remain under Earlier experiments.
- The site and 404 page are English only. Old language links and saved language preferences no longer change the page.
- Motion choices are saved locally when storage is available. The interactive particle knot responds to the pointer, clicks and warp control; rendering pauses when offscreen or in a background tab and respects reduced motion.
- Anima Dao includes Spotify and YouTube Music links. Spotify receives no request until the visitor clicks Load Spotify player. The embedded artist player does not autoplay; available playback depends on Spotify. Direct links remain visible if the embed is blocked.
- No third-party fonts, analytics or runtime project API. Local project previews are lazy-loaded.

[PROJECTS.md](PROJECTS.md) records public sources and editorial limits. Edit `index.html` for page copy, `404.html` for the missing-page message, and `assets/projects.js` for project descriptions. Dynamic control labels live in `assets/app.js`.

## Local development

Use Node.js 22+ and Python 3:

```sh
npm run check
npm run build
python3 -m http.server 4173 --directory dist --bind 127.0.0.1
```

Open <http://localhost:4173>. The build copies only public files into `dist/`; documentation, tests and QA screenshots are excluded. `npm run dev` serves the source directory for development.

## Validation

`npm run check` validates English-only pages, project/filter data, public source owners, local previews, anchors, module imports, external link attributes, JavaScript syntax, payload size, and motion/accessibility hooks. It also runs the particle renderer lifecycle checks. Browser review covers desktop/mobile layout, project filters, the music player, 404, console errors, horizontal overflow and English behavior with old language links/preferences.

## Publication

Repository: <https://github.com/dKosarevsky/kosarevsky.dev>. Production: <https://kosarevsky.dev/>.

Changes are prepared on feature branches and reviewed through pull requests. The GitHub Actions workflow checks and builds pull requests without deploying them. A push to `main` or a manual workflow run checks, builds and deploys `dist/` to GitHub Pages. Verify the Actions result and the live page after deployment.

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
