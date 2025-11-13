# Publishing to Chrome Web Store

## Automated Build Process

The GitHub Action automatically creates a release package whenever you push a version tag. No API credentials needed!

## Publishing a New Version

### Option 1: Auto-bump version (Recommended)

1. Go to your GitHub repo → **Actions** → **Bump Version**
2. Click **Run workflow**
3. Choose bump type:
   - **patch**: 1.3.0 → 1.3.1 (bug fixes)
   - **minor**: 1.3.0 → 1.4.0 (new features)
   - **major**: 1.3.0 → 2.0.0 (breaking changes)
4. Click **Run workflow**

The action will automatically:
- Update `extensions/manifest.json` version
- Create extension.zip package
- Commit the version change
- Create a GitHub release with the zip file

### Option 2: Manual tag

1. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add new features"
   ```
2. Create and push a version tag:
   ```bash
   git tag v1.4.0
   git push origin main
   git push origin v1.4.0
   ```

The GitHub Action will build and create a release automatically.

## Upload to Chrome Web Store

Once the GitHub Action completes:

1. Go to your [GitHub Releases](https://github.com/TheJaysH/shorts-music-block-skipper/releases)
2. Download the `extension.zip` from the latest release
3. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Click your extension → **Package** → **Upload new package**
5. Upload the `extension.zip` file
6. Update store listing if needed
7. Submit for review

## Testing Before Publishing

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extensions/` directory
5. Test on YouTube Shorts

## First-Time Store Submission Checklist

- [ ] Generate PNG icons (use `generate-icons.html`)
- [ ] Update `extensions/manifest.json` with final version
- [ ] Test all features thoroughly
- [ ] Prepare screenshots for store listing
- [ ] Write store description
- [ ] Create privacy policy (if collecting data)
- [ ] Pay one-time $5 developer registration fee
- [ ] Submit for review (can take a few days)
