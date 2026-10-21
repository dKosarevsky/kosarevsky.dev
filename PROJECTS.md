# Editorial sources

Selection and copy updated from project-source research dated 2026-10-22. The homepage presents a personal studio: software, games, an open practical book and the Anima Dao music project. Repository documentation and project pages inform the descriptions; the site makes no popularity, store-availability or comparative performance claims.

## Current projects

The main collection contains these six projects in this order.

| Project | Source | Destination and editorial scope |
| --- | --- | --- |
| A MOVE AGO | [Repository](https://github.com/agent-axiom/a-move-ago) | [Retrochess game](https://chess.kosarevsky.dev/): reconstruct the move that just happened. Daily puzzles, an archive and training are documented. |
| Agent Architecture | [Repository](https://github.com/agent-axiom/agent-arch) | [Read online](https://agent-axiom.github.io/agent-arch/). An open, practical book about AI agent architecture. The description does not claim a published print edition. |
| Salvo | [Repository](https://github.com/agent-axiom/agents-salvo) | [Play online](https://agent-axiom.github.io/agents-salvo/). Battleship with local play, online matches and an agent mode. |
| Aximo | [Repository](https://github.com/agent-axiom/aximo) | [Interactive API demo](https://ifif-aximo.hf.space/docs/). A local, CPU-first speech recognition API written in Rust, with HTTP and WebSocket access. It is not an AI agent framework. |
| albu-mcp | [Repository](https://github.com/dKosarevsky/albu-mcp) | Community MCP integration for AlbumentationsX, with image-augmentation previews, visual refinement and pipeline export. The project is not presented as an official AlbumentationsX product. |
| ajpegli | [Repository](https://github.com/dKosarevsky/ajpegli) | JPEG-to-NumPy loading with Google jpegli. The copy makes no speed comparison with other libraries. |

A MOVE AGO and Agent Architecture are the two featured entries. A MOVE AGO, Agent Architecture and Salvo have preview-image paths in the project data. Each project retains a link to its source repository. Aximo's primary link opens an interactive API demo; albu-mcp and ajpegli link directly to their repositories.

## Music

Anima Dao is the owner's music project, created with AI. Its name remains unchanged in all three languages. The site does not assign an unverified genre, claim playback is available in every region, or promise full-track playback in the embedded player.

The Spotify player loads only after an explicit click. The explanatory copy says Spotify may offer previews, and direct Spotify and YouTube Music links provide another way to open the artist's music. The music section is separate from the six software, game and book entries.

## Earlier experiments

These projects have moved out of the main collection and into the earlier-work section:

- [AI Talks](https://github.com/dKosarevsky/AI-Talks): Streamlit interface to the ChatGPT API.
- [Spherical Snake](https://github.com/dKosarevsky/spherical-snake): a Snake game on a sphere.
- [Video Downloader](https://github.com/dKosarevsky/video_downloader): a focused video-download utility.
- [albu-tta](https://github.com/dKosarevsky/albu-tta): experiments with learned test-time augmentation.

This is an editorial change on the website. It does not mean the repositories have been archived on GitHub.

## Updating

Edit `assets/projects.js` to maintain the six selected projects and their English, Russian and Simplified Chinese descriptions. Edit `assets/i18n.js` for interface copy. All three dictionaries must have the same keys. Project descriptions use the locale keys `en`, `ru` and `zh`; rendered Chinese pages use the document language `zh-Hans`.

The homepage and 404 page default to English, remember an explicit language choice, and accept `?lang=en`, `?lang=ru` and `?lang=zh`. An explicit unsupported or empty language query falls back to English. Without a language query, an unsupported saved value, including the former Spanish locale `es`, also falls back to English.
