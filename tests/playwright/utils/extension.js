const fs = require("fs/promises");
const path = require("path");

const DEFAULT_SYNC_STATE = {
  blockedTracks: [],
  enabled: true,
  autoDislike: false,
  autoSkipAfterBlock: true,
  debugLogs: false
};

const DEFAULT_LOCAL_STATE = {
  stats: { skippedShorts: 0 }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForExtensionId(userDataDir, { extensionName = "Shorts Track Skipper", timeout = 15000 } = {}) {
  const prefPath = path.join(userDataDir, "Default", "Preferences");
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const raw = await fs.readFile(prefPath, "utf-8");
      const prefs = JSON.parse(raw);
      const settings = prefs?.extensions?.settings || {};
      for (const [extId, data] of Object.entries(settings)) {
        if (data?.manifest?.name === extensionName) {
          return extId;
        }
      }
    } catch (err) {
      // Preferences file may not exist yet; ignore until Chrome writes it.
    }
    await delay(200);
  }
  throw new Error(`Timed out waiting for extension "${extensionName}" to register`);
}

async function withExtensionPage(context, extensionId, relativePath, fn) {
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/${relativePath}`);
    await page.waitForLoadState("domcontentloaded");
    return await fn(page);
  } finally {
    await page.close();
  }
}

async function resetExtensionStorage(context, extensionId) {
  return withExtensionPage(context, extensionId, "options.html", page =>
    page.evaluate(({ syncState, localState }) => {
      return new Promise(resolve => {
        chrome.storage.sync.set(syncState, () => {
          chrome.storage.local.set(localState, resolve);
        });
      });
    }, { syncState: DEFAULT_SYNC_STATE, localState: DEFAULT_LOCAL_STATE })
  );
}

async function updateSyncState(context, extensionId, patch = {}) {
  return withExtensionPage(context, extensionId, "options.html", page =>
    page.evaluate(patchValues => {
      return new Promise(resolve => {
        chrome.storage.sync.get(null, current => {
          chrome.storage.sync.set({ ...current, ...patchValues }, resolve);
        });
      });
    }, patch)
  );
}

async function getSyncState(context, extensionId) {
  return withExtensionPage(context, extensionId, "options.html", page =>
    page.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.sync.get(null, resolve);
      });
    })
  );
}

async function getLocalState(context, extensionId) {
  return withExtensionPage(context, extensionId, "options.html", page =>
    page.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.get(null, resolve);
      });
    })
  );
}

async function setCheckboxValue(context, extensionId, checkboxId, value) {
  return withExtensionPage(context, extensionId, "options.html", page =>
    page.evaluate(({ id, checked }) => {
      return new Promise(resolve => {
        const input = document.getElementById(id);
        if (!input) {
          throw new Error(`Checkbox "${id}" not found in options UI.`);
        }
        if (input.checked !== checked) {
          input.checked = checked;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        resolve();
      });
    }, { id: checkboxId, checked: value })
  );
}

module.exports = {
  DEFAULT_SYNC_STATE,
  DEFAULT_LOCAL_STATE,
  waitForExtensionId,
  withExtensionPage,
  resetExtensionStorage,
  updateSyncState,
  getSyncState,
  getLocalState,
  setCheckboxValue
};
