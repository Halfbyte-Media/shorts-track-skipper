const assert = require("assert");
const { By } = require("selenium-webdriver");
const { buildDriver, loadFixture } = require("../helpers/selenium");

describe("Popup page (selenium)", function () {
  this.timeout(40000);
  let driver;

  beforeEach(async () => {
    driver = await buildDriver();
  });

  afterEach(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  async function waitForCount(expected) {
    await driver.wait(async () => {
      const text = await driver.findElement(By.id("count")).getText();
      return text === expected;
    }, 5000);
  }

  it("reflects stored stats on load", async () => {
    await loadFixture(driver, "popup.test.html", {
      sync: { blockedTracks: ["One", "Two", "Three"], enabled: true },
      local: { stats: { skippedShorts: 7 } },
      runtime: { version: "0.9.0" }
    });

    await waitForCount("3");
    assert.strictEqual(await driver.findElement(By.id("enabled")).isSelected(), true);
    assert.strictEqual(await driver.findElement(By.id("skipped")).getText(), "7");
    assert.strictEqual(await driver.findElement(By.id("version")).getText(), "0.9.0");
  });

  it("updates storage when toggled and reacts to storage pushes", async () => {
    await loadFixture(driver, "popup.test.html", {
      sync: { blockedTracks: [], enabled: true },
      local: { stats: { skippedShorts: 0 } }
    });

    const enabled = await driver.findElement(By.id("enabled"));
    await enabled.click();

    await driver.wait(async () => {
      const state = await driver.executeScript("return window.__chromeStorage.getState();");
      return state.sync.enabled === false;
    }, 5000, "sync enabled flag never updated");

    await driver.executeScript("chrome.storage.sync.set({ blockedTracks: arguments[0] });", [
      "Fresh",
      "Track"
    ]);
    await waitForCount("2");

    await driver.executeScript("chrome.storage.local.set({ stats: { skippedShorts: 99 } });");
    await driver.wait(async () => {
      const text = await driver.findElement(By.id("skipped")).getText();
      return text === "99";
    }, 5000);

    await driver.findElement(By.id("opts")).click();
    const events = await driver.executeScript("return window.__chromeEvents;");
    assert.deepStrictEqual(events, ["openOptionsPage"]);
  });
});
