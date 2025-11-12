const enabledEl = document.getElementById("enabled");
const opts = document.getElementById("opts");
const countEl = document.getElementById("count");
const skippedEl = document.getElementById("skipped");
const versionEl = document.getElementById("version");

const DEFAULT_STATS = { skippedShorts: 0 };

function load() {
  chrome.storage.sync.get({enabled: true, blockedTracks: []}, v => {
    enabledEl.checked = !!v.enabled;
    const count = v.blockedTracks ? v.blockedTracks.length : 0;
    countEl.textContent = count;
  });

  chrome.storage.local.get({stats: DEFAULT_STATS}, data => {
    updateStats(data.stats || DEFAULT_STATS);
  });
  
  // Get version from manifest
  const manifest = chrome.runtime.getManifest();
  versionEl.textContent = manifest.version;
}

enabledEl.addEventListener("change", () => {
  chrome.storage.sync.set({enabled: enabledEl.checked});
});

opts.addEventListener("click", e => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Listen for storage changes to update stats in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync") {
    if (changes.blockedTracks) {
      const count = changes.blockedTracks.newValue ? changes.blockedTracks.newValue.length : 0;
      countEl.textContent = count;
    }
    if (changes.enabled) {
      enabledEl.checked = changes.enabled.newValue;
    }
  }
  if (areaName === "local" && changes.stats) {
    updateStats(changes.stats.newValue || DEFAULT_STATS);
  }
});

document.addEventListener("DOMContentLoaded", load);

function updateStats(stats = DEFAULT_STATS) {
  if (skippedEl) {
    skippedEl.textContent = stats.skippedShorts ?? DEFAULT_STATS.skippedShorts;
  }
}
