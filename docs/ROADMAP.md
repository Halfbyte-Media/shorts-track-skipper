# High-Level Roadmap

This roadmap mirrors the structure we liked from Return YouTube Dislike. Each phase has references to the detailed TODO lists under `docs/tasks/`.

## Phase 1 — Repository Restructure & Automation
- [ ] Finalise new directory layout (`extensions/`, `docs/`, `website/`, `tools/`, `icons/`).
- [ ] Move the current Chrome MV3 extension into a shared `core/` package that feeds all builds.
- [ ] Update build/test scripts, GitHub workflows, and docs to use the new paths.
- [ ] Document the publishing workflow in `PUBLISH.md` (mirroring the new structure).

## Phase 2 — Documentation & Community Hygiene
- [ ] Rewrite root README with hero section, badges, and platform install buttons.
- [ ] Add `docs/platforms/*.md` guides for Chrome/Edge + manual installation.
- [ ] Create `docs/troubleshooting.md` and `docs/faq.md`.
- [ ] Add `.github/ISSUE_TEMPLATE` forms for bug reports, feature requests, and translations.
- [ ] Introduce `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.

## Phase 3 — Marketing Website
- [ ] Scaffold `website/` (Astro/Vite/Hugo) with shared components and theming.
- [ ] Build landing page sections: hero, CTA buttons, how-it-works, testimonials, FAQ.
- [ ] Mirror docs pages onto the site (`/docs/*`) with navigation + search.
- [ ] Add `/stats` page fed by skip/block counters.
- [ ] Configure deployment (GitHub Pages or Cloudflare Pages) with CI workflow.

## Phase 4 — Multi-Platform & Localisation
- [ ] Introduce `_locales` and translation pipeline for UI strings.
- [ ] Explore Firefox port / Manifest V2 fallback inside `extensions/firefox`.
- [ ] Publish user script variant for non-Chromium browsers.
- [ ] Expand documentation + website to highlight new platforms/languages.

## Phase 5 — Community & Funding
- [ ] Add support channels (Discord/Matrix/Reddit links) to README + site.
- [ ] Set up GitHub Sponsors / OpenCollective page.
- [ ] Highlight telemetry (skips blocked, tracks shared) on README + site.
- [ ] Run A/B messaging tests on landing page to grow adoption.
