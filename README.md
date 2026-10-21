# kosarevsky.dev

A personal studio for software, games, agent architecture and AI-assisted music as Anima Dao. Static HTML, CSS and JavaScript modules; no package dependencies.

## Content and behavior

- Six selected projects: A MOVE AGO, Agent Architecture, Salvo, Aximo, albu-mcp and ajpegli. The first two have larger cards; the older four projects remain under Earlier work.
- English is the default; Russian and Simplified Chinese are available through the language buttons or `?lang=ru` / `?lang=zh`. Unsupported language links and saved Spanish preferences fall back to English. Chinese uses `lang="zh-Hans"`.
- Language and motion choices are saved locally when storage is available. The interactive particle knot responds to the pointer, clicks and warp control; rendering pauses when offscreen or in a background tab and respects reduced motion.
- Anima Dao includes Spotify and YouTube Music links. Spotify receives no request until the visitor clicks Load Spotify player. The embedded artist player does not autoplay; available playback depends on Spotify. Direct links remain visible if the embed is blocked.
- No third-party fonts, analytics or runtime project API. Local project previews are lazy-loaded.

[PROJECTS.md](PROJECTS.md) records public sources and editorial limits. Edit `assets/projects.js` and `assets/i18n.js` for projects and translations. The 404 page has its own small dictionary.

## Local development

Use Node.js 22+ and Python 3:

```sh
npm run check
npm run build
python3 -m http.server 4173 --directory dist --bind 127.0.0.1
```

Open <http://localhost:4173>. The build copies only public files into `dist/`; documentation, tests and QA screenshots are excluded. `npm run dev` serves the source directory for development.

## Validation

`npm run check` validates complete locale dictionaries, locale fallback and precedence, project/filter data, public source owners, local previews, anchors, external link attributes, JavaScript syntax, payload size, and motion/accessibility hooks. It also runs the particle renderer lifecycle checks. Browser review covers desktop/mobile layout, language/filter transitions, the music player, 404, console errors and horizontal overflow.

## Publication

Repository: <https://github.com/dKosarevsky/kosarevsky.dev>. Production: <https://kosarevsky.dev/>.

Changes are prepared on feature branches and reviewed through pull requests. The GitHub Actions workflow checks and builds pull requests without deploying them. A push to `main` or a manual workflow run checks, builds and deploys `dist/` to GitHub Pages. Verify the Actions result and the live page after deployment.

The initial version was deployed with HTTPS and both apex/www verified on 2026-10-22. This studio refresh is a feature-branch update until merged. DNS does not need changing for content releases.

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
