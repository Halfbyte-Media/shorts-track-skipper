const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { test, expect, chromium } = require("@playwright/test");
const { resetExtensionStorage, setCheckboxValue, getSyncState, getLocalState } = require("./utils/extension");

const EXTENSION_PATH = path.resolve(__dirname, "..", "..");
const SHORT_ID = "lsMLLIdCRn8";
const SHORT_URL = `https://www.youtube.com/shorts/${SHORT_ID}?hl=en&gl=US`;

async function launchContextWithExtension() {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "sts-playwright-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--disable-dev-shm-usage",
      "--disable-infobars"
    ],
    viewport: { width: 1280, height: 720 }
  });

  let extensionId = extractExtensionIdFromWorkers(context.serviceWorkers());
  const deadline = Date.now() + 10000;
  while (!extensionId && Date.now() < deadline) {
    try {
      const sw = await context.waitForEvent("serviceworker", { timeout: deadline - Date.now() });
      extensionId = extractExtensionIdFromWorkers([sw]);
    } catch {
      break;
    }
  }
  if (!extensionId) {
    throw new Error("Extension service worker did not register in time.");
  }
  return { context, extensionId, userDataDir };
}

function extractExtensionIdFromWorkers(workers) {
  for (const worker of workers) {
    const url = worker.url();
    if (url && url.startsWith("chrome-extension://")) {
      return new URL(url).host;
    }
  }
  return null;
}

async function closeContext(context, userDataDir) {
  await context.close();
  if (userDataDir) {
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
}

async function acceptYoutubeConsent(page) {
  try {
    const acceptButton = page.locator('button:has-text("Accept all")').first();
    if (await acceptButton.isVisible({ timeout: 2000 })) {
      await acceptButton.click();
      await page.waitForLoadState("domcontentloaded");
    }
  } catch {
    // Dialog not shown, ignore.
  }
}

async function gotoShort(page) {
  await page.goto(SHORT_URL, { waitUntil: "domcontentloaded" });
  await acceptYoutubeConsent(page);
  await page.waitForFunction(() => location.pathname.startsWith("/shorts/"), { timeout: 20000 });
  await page.waitForTimeout(1000);
}

async function getShortId(page) {
  return page.evaluate(() => {
    const segments = location.pathname.split("/");
    return segments[2] || "";
  });
}

async function waitForShortChange(page, previousId, timeout = 15000) {
  await page.waitForFunction(
    prev => {
      const segments = location.pathname.split("/");
      return segments[1] === "shorts" && segments[2] && segments[2] !== prev;
    },
    previousId,
    { timeout }
  );
  return getShortId(page);
}

async function expectShortToRemain(page, expectedId, durationMs = 4000) {
  await page.waitForTimeout(durationMs);
  const current = await getShortId(page);
  expect(current).toBe(expectedId);
}

async function getSkipCount(context, extensionId) {
  const localState = await getLocalState(context, extensionId);
  return localState?.stats?.skippedShorts ?? 0;
}

async function waitForSkipIncrease(context, extensionId, baseline, { delta = 1, timeout = 8000 } = {}) {
  const target = baseline + delta;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const current = await getSkipCount(context, extensionId);
    if (current >= target) {
      return current;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Skip count did not reach ${target} within ${timeout}ms`);
}

async function expectSkipStable(context, extensionId, expected, duration = 1500) {
  const deadline = Date.now() + duration;
  while (Date.now() < deadline) {
    const current = await getSkipCount(context, extensionId);
    if (current !== expected) {
      throw new Error(`Skip count changed from ${expected} to ${current}`);
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}

test.describe.serial("Shorts Track Skipper (Playwright)", () => {
  test("blocks, skips, and honors options toggles", async () => {
    const { context, extensionId, userDataDir } = await launchContextWithExtension();
    try {
      test.setTimeout(180000);

      const existingPages = context.pages();
      const page = existingPages.length ? existingPages[0] : await context.newPage();
      await page.bringToFront();
      await resetExtensionStorage(context, extensionId);

      let skipCount = await getSkipCount(context, extensionId);

      // Initial load: ensure button is present and block the track.
      await gotoShort(page);
      const blockButton = page.locator(".block-track-btn");
      await expect(blockButton).toBeVisible({ timeout: 15000 });

      const initialId = await getShortId(page);
      await blockButton.click();
      const skippedId = await waitForShortChange(page, initialId);
      expect(skippedId).not.toBe(initialId);
      skipCount = await waitForSkipIncrease(context, extensionId, skipCount);

      // Reload the original video; it should auto-skip because the track is blocked.
      await gotoShort(page);
      const autoSkippedId = await waitForShortChange(page, SHORT_ID);
      expect(autoSkippedId).not.toBe(SHORT_ID);
      skipCount = await waitForSkipIncrease(context, extensionId, skipCount);

      // Disable the extension entirely and verify no skip occurs on blocked track.
      await setCheckboxValue(context, extensionId, "enabled", false);
      await gotoShort(page);
      await expectShortToRemain(page, SHORT_ID, 3000);
      await expectSkipStable(context, extensionId, skipCount);

      // Re-enable and ensure it skips again.
      await setCheckboxValue(context, extensionId, "enabled", true);
      await gotoShort(page);
      const postEnableId = await waitForShortChange(page, SHORT_ID);
      expect(postEnableId).not.toBe(SHORT_ID);
      skipCount = await waitForSkipIncrease(context, extensionId, skipCount);

      // Flip other options and verify they persist in storage.
      await setCheckboxValue(context, extensionId, "autoDislike", true);
      await setCheckboxValue(context, extensionId, "autoSkipAfterBlock", false);
      const syncState = await getSyncState(context, extensionId);
      expect(syncState.autoDislike).toBe(true);
      expect(syncState.autoSkipAfterBlock).toBe(false);
    } finally {
      await closeContext(context, userDataDir);
    }
  });
});
