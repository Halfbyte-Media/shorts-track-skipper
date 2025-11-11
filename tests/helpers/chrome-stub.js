(() => {
  const defaultState = {
    sync: {
      blockedTracks: [],
      enabled: true,
      autoDislike: false,
      autoSkipAfterBlock: true,
      debugLogs: false
    },
    local: {
      stats: {
        skippedShorts: 0
      }
    }
  };

  function safeClone(value) {
    if (value === undefined || value === null) {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  function mergeArea(target, source = {}) {
    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") {
        mergeArea(target[key], value);
      } else {
        target[key] = safeClone(value);
      }
    });
  }

  function readInitialState() {
    try {
      const parsed = JSON.parse(window.name || "{}");
      if (parsed && typeof parsed === "object" && parsed.__chromeStorageInitialState) {
        return parsed.__chromeStorageInitialState;
      }
    } catch (_) {
      // Ignore malformed JSON
    }
    return null;
  }

  const initialState = readInitialState();
  const runtimeInfo = {
    version: "9.9.9-test",
    ...(initialState && initialState.runtime ? initialState.runtime : {})
  };

  const state = {
    sync: safeClone(defaultState.sync),
    local: safeClone(defaultState.local)
  };

  if (initialState) {
    if (initialState.sync) {
      mergeArea(state.sync, initialState.sync);
    }
    if (initialState.local) {
      mergeArea(state.local, initialState.local);
    }
  }

  const changeListeners = [];

  function extract(areaName, keys) {
    const area = state[areaName];
    if (keys === null || keys === undefined) {
      return safeClone(area);
    }
    if (Array.isArray(keys)) {
      return keys.reduce((acc, key) => {
        if (key in area) {
          acc[key] = safeClone(area[key]);
        }
        return acc;
      }, {});
    }
    if (typeof keys === "string") {
      return { [keys]: safeClone(area[keys]) };
    }
    if (typeof keys === "object") {
      const result = { ...keys };
      Object.keys(keys).forEach(key => {
        if (key in area) {
          result[key] = safeClone(area[key]);
        }
      });
      return result;
    }
    return {};
  }

  function triggerChange(areaName, changes) {
    if (!Object.keys(changes).length) return;
    changeListeners.forEach(listener => {
      try {
        listener(safeClone(changes), areaName);
      } catch (err) {
        console.error("chrome-stub listener failed", err);
      }
    });
  }

  function makeStorageArea(areaName) {
    return {
      get(keys, callback = () => {}) {
        setTimeout(() => callback(extract(areaName, keys)), 0);
      },
      set(items, callback = () => {}) {
        setTimeout(() => {
          const area = state[areaName];
          const changes = {};
          Object.entries(items || {}).forEach(([key, value]) => {
            const oldValue = safeClone(area[key]);
            area[key] = safeClone(value);
            changes[key] = { oldValue, newValue: safeClone(value) };
          });
          triggerChange(areaName, changes);
          callback();
        }, 0);
      }
    };
  }

  window.__chromeEvents = [];
  window.__chromeStorage = {
    getState() {
      return {
        sync: safeClone(state.sync),
        local: safeClone(state.local),
        runtime: safeClone(runtimeInfo)
      };
    },
    resetAreas(newState = {}) {
      ["sync", "local"].forEach(area => {
        state[area] = safeClone(defaultState[area]);
        if (newState[area]) {
          mergeArea(state[area], newState[area]);
        }
      });
    },
    setRuntime(overrides = {}) {
      mergeArea(runtimeInfo, overrides);
    }
  };

  window.chrome = {
    storage: {
      sync: makeStorageArea("sync"),
      local: makeStorageArea("local"),
      onChanged: {
        addListener(fn) {
          if (typeof fn === "function") {
            changeListeners.push(fn);
          }
        }
      }
    },
    runtime: {
      getManifest() {
        return safeClone(runtimeInfo);
      },
      openOptionsPage() {
        window.__chromeEvents.push("openOptionsPage");
      }
    }
  };
})();
