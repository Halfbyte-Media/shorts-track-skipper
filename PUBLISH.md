# Publishing to Chrome Web Store

## Setup GitHub Secrets

To use the automated publishing workflow, you need to set up the following secrets in your GitHub repository:

### 1. Get Chrome Web Store API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the **Chrome Web Store API**
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth 2.0 Client ID**:
   - Application type: **Chrome extension**
   - Add authorized redirect URI: `http://localhost`
6. Note your `Client ID` and `Client Secret`

### 2. Get Refresh Token

Run this command (replace with your credentials):

```bash
curl "https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost"
```

1. Visit the URL in browser
2. Authorize the app
3. Copy the `code` from the redirect URL
4. Exchange code for refresh token:

```bash
curl "https://accounts.google.com/o/oauth2/token" -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&code=YOUR_CODE&grant_type=authorization_code&redirect_uri=http://localhost"
```

5. Copy the `refresh_token` from the response

### 3. Get Extension ID

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Create a new extension (or use existing)
3. Copy the **Extension ID** from the URL or dashboard

### 4. Add Secrets to GitHub

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:
- `CHROME_EXTENSION_ID` - Your extension ID
- `CHROME_CLIENT_ID` - OAuth client ID
- `CHROME_CLIENT_SECRET` - OAuth client secret
- `CHROME_REFRESH_TOKEN` - The refresh token you generated

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
- Update `manifest.json` version
- Commit the change
- Create and push a version tag
- Trigger the publish workflow

### Option 2: Manual tag

1. Update version in `manifest.json` (or let the publish workflow do it)
2. Commit your changes:
   ```bash
   git add .
   git commit -m "Release v1.3.0"
   ```
3. Create and push a version tag:
   ```bash
   git tag v1.3.0
   git push origin main
   git push origin v1.3.0
   ```

The GitHub Action will automatically:
- Package the extension
- Upload to Chrome Web Store
- Publish it (or save as draft if `publish: false`)
- Create a GitHub release with the extension.zip

## Manual Publishing

If you prefer to publish manually:

1. Create a zip file of all extension files:
   ```bash
   # Exclude dev files
   zip -r extension.zip . -x "*.git*" -x "*generate-icons.html*" -x "*node_modules*"
   ```

2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Click your extension → **Package** → **Upload new package**
4. Upload the zip file
5. Fill in store listing details
6. Submit for review

## Testing Before Publishing

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the extension directory
5. Test on YouTube Shorts

## First-Time Store Submission Checklist

- [ ] Generate PNG icons (use `generate-icons.html`)
- [ ] Update `manifest.json` with final version
- [ ] Test all features thoroughly
- [ ] Prepare screenshots for store listing
- [ ] Write store description
- [ ] Create privacy policy (if collecting data)
- [ ] Pay one-time $5 developer registration fee
- [ ] Submit for review (can take a few days)
