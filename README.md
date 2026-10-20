# LAST STAND — Warzone Arcade

A browser-playable, online two-player co-op survival shooter. Team up to hold the frontline against escalating waves of hostiles.

## Play

Open the GitHub Pages URL in a modern browser, or serve this folder with any static web server. No build step or package installation is needed.

- **Play online together:** one player selects **Create co-op room** and shares the six-character code or invite link; the other selects **Join a friend** and pastes either one. The host starts the match after the connection is ready.
- **Move:** `W`, `A`, `S`, `D`
- **Aim:** mouse
- **Fire:** left mouse button or spacebar
- **Pause/resume:** `P` (host)
- **Mobile:** use the left virtual stick to move and the FIRE button to shoot. Aim is automatic toward the nearest hostile.

Both players share one arena, wave progression, and elimination score, with separate health bars. Enemies target the closest active operator. Survive each wave to receive a small health refill; armored units take multiple hits.

Online rooms use PeerJS for WebRTC signaling and direct peer-to-peer data. Both players need an internet connection and a browser that permits WebRTC. PeerJS is loaded from its CDN. If clipboard access is blocked, the share text is selected in a manual-copy field.

## Interactive portfolio

Open [`portfolio.html`](portfolio.html) for Md. Reazul Islam's responsive, reference-inspired portfolio page. It includes his LinkedIn profile portrait, education and experience details, direct LinkedIn/Behance/Facebook links, and clickable 3D cards. The skills section uses local SVG software marks from [Devicon](https://devicon.dev/) (MIT license).

## Deploy to GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys the static site on each push to `main` and supports manual runs. In the repository's **Settings → Pages**, set the build and deployment source to **GitHub Actions**. After the first successful workflow run, GitHub Pages will publish the game at the repository's Pages URL.

The game uses no build pipeline. Google Fonts are an optional visual enhancement; the page falls back to system fonts if they cannot be loaded.
