const assert = require("assert");
const { By, until } = require("selenium-webdriver");
const { buildDriver, loadFixture } = require("../helpers/selenium");

describe("Options page (selenium)", function () {
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

  async function waitForText(selector, expected) {
    await driver.wait(async () => {
      const text = await driver.findElement(By.css(selector)).getText();
      return text === expected;
    }, 5000, `Timed out waiting for ${selector} to equal "${expected}"`);
    return driver.findElement(By.css(selector)).getText();
  }

  it("loads stored toggles, stats, and version", async () => {
    await loadFixture(driver, "options.test.html", {
      sync: {
        blockedTracks: ["Alpha", "Beta"],
        enabled: false,
        autoDislike: true,
        autoSkipAfterBlock: false,
        debugLogs: true
      },
      local: {
        stats: { skippedShorts: 42 }
      },
      runtime: { version: "1.2.3-test" }
    });

    await waitForText("#trackCount", "2");
    assert.strictEqual(await driver.findElement(By.id("enabled")).isSelected(), false);
    assert.strictEqual(await driver.findElement(By.id("autoDislike")).isSelected(), true);
    assert.strictEqual(await driver.findElement(By.id("autoSkipAfterBlock")).isSelected(), false);
    assert.strictEqual(await driver.findElement(By.id("debugLogs")).isSelected(), true);
    assert.strictEqual(await driver.findElement(By.id("skippedCount")).getText(), "42");
    assert.strictEqual(await driver.findElement(By.id("version")).getText(), "1.2.3-test");

    const items = await driver.findElements(By.css("#list li.track-item"));
    assert.strictEqual(items.length, 2, "blocked track list should render two entries");
  });

  it("adds a new track via the UI and stores it", async () => {
    await loadFixture(driver, "options.test.html", {
      sync: { blockedTracks: [] }
    });

    const input = await driver.findElement(By.id("track"));
    await input.clear();
    await input.sendKeys("Z");
    await driver.findElement(By.id("add")).click();

    await driver.wait(
      async () => {
        const items = await driver.findElements(By.css("#list li.track-item"));
        return items.length === 1;
      },
      5000,
      "blocked track did not render"
    );

    await waitForText("#trackCount", "1");

    const trackName = await driver.findElement(By.css("#list li .track-name")).getText();
    assert.strictEqual(trackName, "Z");

    const actionLinks = await driver.findElements(By.css("#list li .track-actions a"));
    assert.strictEqual(actionLinks.length, 2, "expected YouTube + Spotify action links");

    const state = await driver.executeScript("return window.__chromeStorage.getState();");
    assert.deepStrictEqual(state.sync.blockedTracks, ["Z"]);
  });
});
