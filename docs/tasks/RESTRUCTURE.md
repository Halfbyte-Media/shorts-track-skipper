# Repository Restructure Checklist

Goal: mirror the Return YouTube Dislike layout so the extension, docs, website, and tooling are clearly separated.

## Directory Layout
- [x] Introduce a shared `core/` package that holds the canonical extension source.
- [x] Move current extension files (`manifest.json`, `content.js`, `options.*`, `popup.*`, `icons/`) into `core/`.
- [ ] Add `core/README.md` with build/test instructions for that package.
- [ ] Move SVG sources into `icons/src/` and keep generated PNGs in `core/icons/`.
- [x] Introduce `manifests/` directory for per-browser overrides.
- [ ] Introduce `tools/` for Selenium/Playwright helpers, publish scripts, and asset generators.

## Build & Test Updates
- [x] Update `package.json` scripts to point to the new paths (e.g., `core/content.js`) and add a build step.
- [x] Fix Selenium fixtures to reference `core/options.html`.
- [x] Update Playwright harness to load the extension from the new directory.
- [x] Adjust GitHub workflows (`publish.yml`, `bump-version.yml`) to use the built artifacts.
- [x] Update `PUBLISH.md` with the new commands and paths.

## Git Hygiene
- [ ] Add `.github/ISSUE_TEMPLATE/*` mirroring the reference repo.
- [ ] Create `.github/FUNDING.yml` (optional) for future sponsorships.
- [ ] Add CODEOWNERS once the structure is stable.
