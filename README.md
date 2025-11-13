# Shorts Track Skipper

<p align="center">
  <img src="extensions/icons/icon.svg" alt="Shorts Track Skipper icon" width="128" height="128">
</p>

Shorts Track Skipper is a Chrome/Edge MV3 extension that automatically jumps past YouTube Shorts that reuse music you've already muted. It adds a lightweight "Block track" button to the Shorts action bar (next to Like/Dislike), remembers every track you add, and keeps all data local to your browser profile.

## Features
- Auto-skip Shorts that match any track in your personal block list
- One-click "Block track" button embedded directly in the Shorts action bar controls
- Optional auto-dislike before skipping, plus an “auto-skip after block” toggle
- Track counter and skip statistics visible in both the popup and the options page
- Quick search helpers (YouTube + Spotify) next to every blocked entry
- Debug logging, a one-button "reset all data" fallback, and a storage model that never sends data anywhere outside of chrome.storage

## Installation (Chrome Web Store)
- Install via the [Chrome Web Store](https://chromewebstore.google.com/detail/shorts-track-skipper/aogdhhkkmflljjkknajmgjjdkafplhnh). The same listing works for Chrome, Edge, Brave, and Opera; Firefox/Safari builds are on the roadmap.

## Installation (unpacked)
1. Download or clone this repository.
2. Open `chrome://extensions` (or the equivalent in your Chromium-based browser).
3. Enable **Developer mode**.
4. Choose **Load unpacked** and point it at the `extensions/` directory in this repo.

Whenever you make local code changes, return to `chrome://extensions` and click **Reload** on Shorts Track Skipper.

## Development Notes
- Manifest V3: background logic is implemented directly inside the content/options scripts-there's no persistent background page.
- Icons now live under `extensions/icons/`; use `scripts/create-icons.js` (Node + `canvas`) if you need to regenerate the PNG set.
- The landing page under `website/` is a lightweight showcase you can deploy to GitHub Pages/Netlify to demo the extension.
- No build step is required; the extension ships as plain HTML/CSS/JS. Linting/formatting is currently manual.

## Testing
- `npm run test:unit` runs the Selenium + Mocha UI harnesses for the popup and options pages.
- `npm run test:playwright` runs a real Chromium session against YouTube Shorts to verify the block button flow, option toggles, and skip counter updates. The first time you run it, install the browsers with `npx playwright install chromium`.
- `npm test` executes both suites sequentially.

## Resetting the Extension
If you run into corrupt storage or simply want a fresh start, open the options page and use **Reset All Data**. This clears blocked tracks, skip counts, and every toggle back to defaults.
