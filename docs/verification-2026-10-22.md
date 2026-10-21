# Studio verification — 2026-10-22

## Automated

- `node --experimental-vm-modules scripts/check.mjs`: PASS with bundled Node 24.19.0. Three complete locales, six current projects, locale precedence/fallback, filter data, local preview paths, anchors, JavaScript syntax and motion/accessibility hooks.
- All existing particle renderer lifecycle checks: PASS (fallback, reduced motion, controls, resize, visibility, intersection and cleanup).
- `node scripts/build.mjs`: PASS. Seven public entries copied into dist.
- `git diff --check`: PASS.
- HTML and all local assets total 284.5 KiB; three local project screenshots total 204.5 KiB. Spotify is outside this budget and loads only on activation.

## Chrome browser

- EN, RU and Simplified Chinese checked at 320px and 1440px; RU additionally at 390px; RU/ZH at 820px. Document scroll width equals viewport width in every checked combination.
- Mobile navigation visible. RU hero is about 654px high at 390px, compared with the old 980px minimum.
- Desktop layout verified as two 644px featured cards and four 310px compact cards at 1440px.
- All three preview files loaded with nonzero natural dimensions. Game previews preserve the whole captured board.
- Filters: games shows A MOVE AGO/Salvo; AI shows book/Aximo/albu-mcp; tools shows ajpegli. Filtering persists across language changes with appropriate localized counts.
- Earlier work disclosure opens all four source links.
- No iframe before activation. Loading Spotify creates one iframe, hides the load button and displays Anima Dao with its track list. Switching locale keeps one iframe and updates its title and fallback note. No audio was played; full-track availability remains Spotify-dependent.
- Chinese document/404 language is zh-Hans; 404 home link preserves zh. Unsupported `?lang=es` returns English even with another saved preference.
- Motion toggle and its saved off state verified; desktop artwork retained. Browser console error collection returned no entries.
- Independent specification and code reviews found no outstanding material issues.

Screenshots in ignored qa/ reflect the user's Chrome profile, including its Dark Reader extension. No global browser settings were changed; temporary viewport overrides were reset.

## Publication boundary

These checks verify the feature branch and local preview. Production remains the prior version until this branch is merged and the Pages deployment succeeds.
