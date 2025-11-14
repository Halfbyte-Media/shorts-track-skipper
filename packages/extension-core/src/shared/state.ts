export interface ExtensionSyncState {
  blockedTracks: string[];
  enabled: boolean;
  autoDislike: boolean;
  autoSkipAfterBlock: boolean;
  debugLogs: boolean;
}

export interface ExtensionStats {
  skippedShorts: number;
}

export const DEFAULT_SYNC_STATE: ExtensionSyncState = {
  blockedTracks: [],
  enabled: true,
  autoDislike: false,
  autoSkipAfterBlock: true,
  debugLogs: false,
};

export const DEFAULT_STATS: ExtensionStats = {
  skippedShorts: 0,
};

type ChromeRuntime = typeof chrome;

let statsUpdateChain: Promise<ExtensionStats> = Promise.resolve(DEFAULT_STATS);

export function getChromeRuntime(): ChromeRuntime | undefined {
  return (globalThis as typeof globalThis & { chrome?: ChromeRuntime }).chrome;
}

export function hasExtensionContext(): boolean {
  const runtime = getChromeRuntime();
  return Boolean(runtime?.runtime?.id);
}

export async function readSyncState(): Promise<ExtensionSyncState> {
  const runtime = getChromeRuntime();
  if (!runtime?.storage?.sync) {
    return { ...DEFAULT_SYNC_STATE };
  }

  return new Promise<ExtensionSyncState>((resolve) => {
    runtime.storage.sync.get(DEFAULT_SYNC_STATE, (data) => {
      resolve({ ...DEFAULT_SYNC_STATE, ...(data as Partial<ExtensionSyncState>) });
    });
  });
}

export async function writeSyncState(payload: Partial<ExtensionSyncState>): Promise<void> {
  const runtime = getChromeRuntime();
  if (!runtime?.storage?.sync) {
    return;
  }

  await new Promise<void>((resolve) => {
    runtime.storage.sync.set(payload, () => {
      const err = getChromeRuntime()?.runtime?.lastError;
      if (err) {
        console.warn('[ext] Failed to persist sync state', err);
      }
      resolve();
    });
  });
}

export async function readStats(): Promise<ExtensionStats> {
  const runtime = getChromeRuntime();
  if (!runtime?.storage?.local) {
    return { ...DEFAULT_STATS };
  }

  return new Promise<ExtensionStats>((resolve) => {
    runtime.storage.local.get({ stats: DEFAULT_STATS }, (data) => {
      resolve({ ...DEFAULT_STATS, ...((data?.stats as ExtensionStats | undefined) ?? {}) });
    });
  });
}

export async function writeStats(stats: ExtensionStats): Promise<void> {
  const runtime = getChromeRuntime();
  if (!runtime?.storage?.local) {
    return;
  }

  await new Promise<void>((resolve) => {
    runtime.storage.local.set({ stats }, () => {
      const err = getChromeRuntime()?.runtime?.lastError;
      if (err) {
        console.warn('[ext] Failed to persist stats', err);
      }
      resolve();
    });
  });
}

export async function incrementStat<K extends keyof ExtensionStats>(key: K): Promise<ExtensionStats> {
  const runtime = getChromeRuntime();
  if (!runtime?.storage?.local) {
    return { ...DEFAULT_STATS };
  }

  statsUpdateChain = statsUpdateChain.catch(() => DEFAULT_STATS).then(
    () =>
      new Promise<ExtensionStats>((resolve) => {
        runtime.storage.local.get({ stats: DEFAULT_STATS }, (data) => {
          const current = { ...DEFAULT_STATS, ...((data?.stats as ExtensionStats | undefined) ?? {}) };
          current[key] = (current[key] ?? 0) + 1;
          runtime.storage.local.set({ stats: current }, () => {
            const err = getChromeRuntime()?.runtime?.lastError;
            if (err) {
              console.warn('[ext] Failed to increment stat', err);
            }
            resolve(current);
          });
        });
      })
  );

  return statsUpdateChain;
}

export function getManifestVersion(): string {
  const runtime = getChromeRuntime();
  return runtime?.runtime?.getManifest?.().version ?? 'dev';
}
