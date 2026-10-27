# Editorial sources

Selection and copy updated from project-source research dated 2026-10-27. The homepage presents a personal studio: software, games, research, an open practical book and the Anima Dao music project. Repository documentation and project pages inform the descriptions; the site makes no popularity, store-availability or comparative performance claims.

## Current projects

The English-only main collection contains nine projects in this order.

| Project | Source | Destination and editorial scope |
| --- | --- | --- |
| A MOVE AGO | [Repository](https://github.com/agent-axiom/a-move-ago) | [Retrochess game](https://chess.kosarevsky.dev/): reconstruct the move that just happened. Daily puzzles, an archive and training are documented. |
| Agent Architecture | [Repository](https://github.com/agent-axiom/agent-arch) | [Read online](https://agent-axiom.github.io/agent-arch/). An open, practical book about AI agent architecture. The description does not claim a published print edition. |
| microgpt-fortran | Private repository | A tiny character-level GPT in modern Fortran, with training, saving, sampling and evaluation. Its current scope is short ASCII names. Show a brief public summary and local abstract artwork, with no source or demo button. |
| Axiom Spacetime | Private research repository and solver | [Explore research](https://blackhole.kosarevsky.dev/). Explore the mathematics of a wormhole mouth through a public manuscript, detailed derivation and interactive plots. The card uses a screenshot of the public site and shows a Private solver label, with no code link. |
| AURIC OATH | No verified repository link | [Play online](https://auricoath.kosarevsky.dev/). A side-view action platformer with six citadel missions, hidden relics, moving platforms and the Ash Warden boss. The card uses a real gameplay screenshot and links to the playable site, with no guessed source link. |
| Salvo | [Repository](https://github.com/agent-axiom/agents-salvo) | [Play online](https://agent-axiom.github.io/agents-salvo/). Battleship with local play, online matches and an agent mode. |
| Aximo | [Repository](https://github.com/agent-axiom/aximo) | [Interactive API demo](https://ifif-aximo.hf.space/docs/). A local, CPU-first speech recognition API written in Rust, with HTTP and WebSocket access. It is not an AI agent framework. |
| albu-mcp | [Repository](https://github.com/dKosarevsky/albu-mcp) | Community MCP integration for AlbumentationsX, with image-augmentation previews, visual refinement and pipeline export. The project is not presented as an official AlbumentationsX product. |
| ajpegli | [Repository](https://github.com/dKosarevsky/ajpegli) | JPEG-to-NumPy loading with Google jpegli. The copy makes no speed comparison with other libraries. |

A MOVE AGO, Agent Architecture, microgpt-fortran and Axiom Spacetime are the four featured entries. A MOVE AGO, Agent Architecture, Axiom Spacetime, AURIC OATH and Salvo use screenshots. The Fortran project uses local abstract artwork. Public source links are included where verified; a public project site does not require a source-repository link. Aximo's primary link opens an interactive API demo, while albu-mcp and ajpegli link directly to their repositories.

The Fortran source remains private, so its card shows Private project without a source or demo link. Keep its description specific to its current small model and short ASCII-name task; do not present it as a general-purpose chatbot.

Axiom Spacetime has a public research site with a public website repository. The research repository and numerical solver remain private. Its manuscript, detailed derivation and data are public, and the site includes interactive plots. Endorsement is pending. The portfolio describes the mathematical work without claiming physical teleportation has been established or that the manuscript has completed endorsement. Do not expose private repository URLs, solver code or private documentation.

AURIC OATH's public homepage and runtime establish the branding and six-mission platformer campaign. Its web manifest still uses the older Assault Course subtitle; the portfolio follows the current game. No repository link was found in the inspected public site, so source visibility is unverified rather than assumed private or public.

## Music

Anima Dao is the owner's music project, created with AI. The site does not assign an unverified genre, claim playback is available in every region, or promise full-track playback in the embedded player.

The Spotify player loads only after an explicit click. The explanatory copy says Spotify may offer previews, and direct Spotify and YouTube Music links provide another way to open the artist's music. The music section is separate from the nine project entries.

## Editorial shortlist

These are candidates for a future selection, not entries displayed on the homepage:

- **Agent Anvil:** CI evaluations for tool-using agents; a candidate for showing practical agent development work.
- **keys-214:** working educational flashcards; a candidate for a directly usable learning tool.
- **Astro Courier:** a playable game; a candidate for expanding the games selection.

Recheck their current state, public access and destinations before adding them to the active collection.

## Earlier experiments

These projects have moved out of the main collection and into the earlier-work section:

- [AI Talks](https://github.com/dKosarevsky/AI-Talks): Streamlit interface to the ChatGPT API.
- [Spherical Snake](https://github.com/dKosarevsky/spherical-snake): a Snake game on a sphere.
- [Video Downloader](https://github.com/dKosarevsky/video_downloader): a focused video-download utility.
- [albu-tta](https://github.com/dKosarevsky/albu-tta): experiments with learned test-time augmentation.

This is an editorial change on the website. It does not mean the repositories have been archived on GitHub.

## Updating

Edit `assets/projects.js` to maintain the nine selected projects and their English descriptions. Edit `index.html` for homepage copy and `assets/app.js` for generated action labels, controls and player status. Edit `404.html` for the not-found page.

Treat the public destination and source visibility separately. A project may have a public `url` without a `source` field. Set `privateSource` only when the source is known to be private; the renderer labels this Private source when a public destination exists, or Private project when no destination is available.

The homepage and 404 page are English only. Language controls, translation dictionaries and saved-language handling have been removed. Keep the tone concise, friendly and direct, addressing the visitor as “you.”
