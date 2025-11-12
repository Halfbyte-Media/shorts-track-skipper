# Website & Marketing Checklist

Goal: ship a small marketing/documentation site inspired by Return YouTube Dislike’s landing page and docs hub.

## Foundation
- [ ] Choose stack (Astro, Next.js, Hugo, etc.) and scaffold `website/`.
- [ ] Set up shared theme (colors, typography, spacing) consistent with the extension UI.
- [ ] Establish localisation strategy (e.g., `website/_locales` matching extension locales).

## Pages
- [ ] Landing page with hero, benefits list, CTA buttons for Chrome/Edge/manual install.
- [ ] “How it works” section with illustrated steps or short GIF.
- [ ] Testimonials / social proof (placeholder quotes until we have real ones).
- [ ] FAQ page synced with `docs/faq.md`.
- [ ] Docs index replicating `docs/` markdown via MDX/markdown importer.
- [ ] `/pay` or “Support the project” page with sponsor links.
- [ ] `/stats` page showing live counters (skips, blocked tracks, active users) once telemetry exists.

## Assets
- [ ] Export consistent SVG/PNG icons for web use (`website/static/ui/*`).
- [ ] Generate QR codes for quick mobile install (like RYD’s `static/qrs`).
- [ ] Prepare meta tags/social preview images.

## Deployment
- [ ] Integrate CI workflow to build + deploy website (`.github/workflows/website.yml`).
- [ ] Configure hosting (GitHub Pages, Cloudflare Pages, or Netlify) with custom domain if desired.
- [ ] Add uptime monitoring / analytics (Plausible, etc.) respecting privacy.

## Maintenance
- [ ] Document how to add new docs/pages in `website/README.md`.
- [ ] Set up scheduled job to pull latest skip stats for `/stats`.
- [ ] Ensure localisation files stay in sync with extension translations.
