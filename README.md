# LAST STAND — Warzone Arcade

A fast, browser-playable top-down survival shooter. Hold the frontline, take down escalating waves of hostiles, and see how long you can survive.

## Play

Open `index.html` in a modern browser, or serve this folder with any static web server. No build step, package installation, or backend is needed.

- **Move:** `W`, `A`, `S`, `D` or arrow keys
- **Aim:** mouse
- **Fire:** left mouse button or spacebar
- **Pause/resume:** `P`
- **Mobile:** use the left virtual stick to move and the FIRE button to shoot. Aim is automatic toward the nearest hostile.

Survive each wave to receive a small health refill. Armored units take multiple hits. The sound toggle enables lightweight synthesized firing and hit effects.

## Deploy to GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys the static site on each push to `main` and supports manual runs. In the repository's **Settings → Pages**, set the build and deployment source to **GitHub Actions**. After the first successful workflow run, GitHub Pages will publish the game at the repository's Pages URL.

The game is self-contained and uses no build pipeline. Google Fonts are an optional visual enhancement; the page falls back to system fonts if they cannot be loaded.
