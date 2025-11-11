# Shorts Track Skipper

<p align="center">
  <img src="icons/icon.svg" alt="Shorts Track Skipper icon" width="128" height="128">
</p>

Shorts Track Skipper is a Chrome/Edge MV3 extension that automatically jumps past YouTube Shorts that use music you have blocked. It adds a lightweight “Block” button to the Shorts player, remembers every track you add, and keeps the UI out of your way while you scroll.

## Features
- Auto-skip Shorts that match any track in your personal block list
- One-click “Block this track” button embedded in the Shorts controls
- Optional auto-dislike before skipping, plus an “auto-skip after block” toggle
- Track counter and skip statistics visible in both the popup and the options page
- Quick search helpers (YouTube + Spotify) next to every blocked entry
- Debug logging and a one-button “reset all data” fallback for troubleshooting

## Installation (unpacked)
1. Download or clone this repository.
2. Open `chrome://extensions` (or the equivalent in your Chromium-based browser).
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the project directory.

Whenever you make local code changes, return to `chrome://extensions` and click **Reload** on Shorts Track Skipper.

## Development Notes
- Manifest V3: background logic is implemented directly inside the content/options scripts—there’s no persistent background page.
- Icons live under `icons/`; `create-icons.js` can be used with Node + `canvas` if you ever need to regenerate them.
- No build step is required; the extension ships as plain HTML/CSS/JS. Linting/formatting is currently manual.

## Testing
- `npm run test:unit` runs the Selenium + Mocha UI harnesses for the popup and options pages.
- `npm run test:playwright` runs a real Chromium session against YouTube Shorts to verify the block button flow, option toggles, and skip counter updates. The first time you run it, install the browsers with `npx playwright install chromium`.
- `npm test` executes both suites sequentially.

## Resetting the Extension
If you run into corrupt storage or simply want a fresh start, open the options page and use **Reset All Data**. This clears blocked tracks, skip counts, and every toggle back to defaults.
