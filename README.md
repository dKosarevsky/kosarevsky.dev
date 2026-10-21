# kosarevsky.dev

Personal homepage with selected projects and games. Static HTML, CSS, and JavaScript; no package dependencies. English is the default language.

English, Russian, and Spanish are included. The site remembers language and motion preferences and supports direct `?lang=ru` / `?lang=es` links. A projected 3D particle knot responds to pointer movement and clicks, with a warp control and motion toggle. Rendering pauses off screen and in background tabs. The whole site is self-contained, without third-party fonts, analytics, or runtime scripts.

See [PROJECTS.md](PROJECTS.md) for the six selected projects and editorial sources. Edit `assets/projects.js` and `assets/i18n.js` to maintain the collection and translations.

**Publication status:** the local site and GitHub Pages configuration are prepared. A successful production deployment has not yet been verified.

Local validation covers translation completeness, project/filter data, asset paths, anchors and JavaScript syntax. A connected browser was unavailable in the authoring session; responsive layouts and visual effects still need a real-browser review before calling browser QA complete.

## Run locally

Use Node.js 22+ and Python 3:

```sh
npm run check
npm run build
npm run dev
```

Open <http://localhost:4173>. The build copies only public site files into `dist/`.

## Publish

The target is a separate public repository, `dKosarevsky/kosarevsky.dev`. Authenticate GitHub CLI as `dKosarevsky`, commit the site on `main`, then run:

```sh
bash scripts/publish.sh
```

The script checks authentication and repository history, creates the repository when absent, pushes `main`, configures Pages to use GitHub Actions, assigns `kosarevsky.dev`, and requests deployment. It refuses unrelated origins or divergent remote history. It does not change DNS.

Subsequent pushes to `main` run validation, build `dist/`, and deploy through `.github/workflows/pages.yml`. Check the Actions result and the live site before considering a publication complete.

## Domain

Assign `kosarevsky.dev` in repository **Settings → Pages → Custom domain** before changing DNS. The publish script performs that Pages setting through the API. With an Actions deployment, the `CNAME` file alone does not configure the domain.

At the domain's DNS provider, point the apex to GitHub Pages:

| Name | Type | Value |
| --- | --- | --- |
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |
| `www` | CNAME | `dkosarevsky.github.io` |

Keep unrelated mail, verification, and project subdomain records. An apex ALIAS/ANAME pointing to `dkosarevsky.github.io` is an alternative to the A records. Once GitHub has issued the certificate, enable **Enforce HTTPS** in Pages settings.

Current DNS and certificate readiness have not been verified. See the official [custom domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) and [Pages API documentation](https://docs.github.com/en/rest/pages/pages).
