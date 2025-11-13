const fs = require("fs/promises");
const fsSync = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const AdmZip = require("adm-zip");

require("chromedriver");

const DEFAULT_EXTENSION_ROOT = path.resolve(__dirname, "..", "..", "extensions");
const DEFAULT_EXTENSION_FILES = [
  "manifest.json",
  "background.js",
  "content.js",
  "options.js",
  "options.html",
  "popup.js",
  "popup.html",
  "icons"
];

function normalizeEntryName(entry) {
  return entry.replace(/\\/g, "/");
}

function packExtension(extensionRoot = DEFAULT_EXTENSION_ROOT, entries = DEFAULT_EXTENSION_FILES) {
  const zip = new AdmZip();
  entries.forEach(entry => {
    const absPath = path.resolve(extensionRoot, entry);
    const normalized = normalizeEntryName(entry);
    const stats = fsSync.statSync(absPath);
    if (stats.isDirectory()) {
      zip.addLocalFolder(absPath, normalized);
    } else {
      zip.addLocalFile(absPath, normalized);
    }
  });
  const zipPath = path.join(os.tmpdir(), `sts-extension-${Date.now()}.zip`);
  zip.writeZip(zipPath);
  return zipPath;
}

function createChromeOptions({
  headless = true,
  allowFileAccess = false,
  extensionArchive = null,
  userDataDir = null
} = {}) {
  const options = new chrome.Options();
  if (headless) {
    options.addArguments("--headless=new");
  }
  options.addArguments("--disable-gpu", "--window-size=1280,800", "--no-sandbox");
  if (allowFileAccess) {
    options.addArguments("--allow-file-access-from-files");
  }
  if (userDataDir) {
    options.addArguments(`--user-data-dir=${userDataDir}`);
  }
  if (extensionArchive) {
    options.addExtensions(extensionArchive);
  }
  return options;
}

async function buildDriver({
  withExtension = false,
  headless = true,
  extensionRoot = DEFAULT_EXTENSION_ROOT
} = {}) {
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "sts-chrome-profile-"));
  let extensionArchive = null;
  if (withExtension) {
    extensionArchive = packExtension(extensionRoot);
  }
  const options = createChromeOptions({
    headless,
    extensionArchive,
    userDataDir: profileDir,
    allowFileAccess: !withExtension
  });
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  driver.__profileDir = profileDir;
  driver.__extensionArchive = extensionArchive;
  driver.__extensionName = "Shorts Track Skipper";
  const originalQuit = driver.quit.bind(driver);
  driver.quit = async () => {
    try {
      return await originalQuit();
    } finally {
      if (extensionArchive) {
        await fs.rm(extensionArchive, { force: true }).catch(() => {});
      }
      await fs.rm(profileDir, { recursive: true, force: true }).catch(() => {});
    }
  };
  return driver;
}

async function loadFixture(driver, fixtureName, initialState = {}) {
  await driver.get("about:blank");
  await driver.executeScript(
    "window.name = arguments[0];",
    JSON.stringify({ __chromeStorageInitialState: initialState })
  );

  const fixturePath = path.resolve(__dirname, "..", "fixtures", fixtureName);
  const fileUrl = pathToFileURL(fixturePath).href;
  await driver.get(fileUrl);
}

module.exports = {
  buildDriver,
  loadFixture
};
