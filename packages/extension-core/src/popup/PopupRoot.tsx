import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { BrowserTarget } from '../shared/types';
import { palette } from '@ext/ui';
import {
  DEFAULT_STATS,
  DEFAULT_SYNC_STATE,
  ExtensionStats,
  ExtensionSyncState,
  getChromeRuntime,
  getManifestVersion,
  readStats,
  readSyncState,
  writeSyncState,
} from '../shared/state';

export interface PopupRootProps {
  target: BrowserTarget;
}

const pageStyle: CSSProperties = {
  minWidth: 320,
  margin: 0,
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
  background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentAlt})`,
  padding: 18,
  color: palette.text,
};

const cardStyle: CSSProperties = {
  background: palette.surface,
  borderRadius: 20,
  boxShadow: '0 22px 45px rgba(20, 23, 45, 0.3)',
  overflow: 'hidden',
};

const heroStyle: CSSProperties = {
  background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentAlt})`,
  color: '#fff',
  padding: 18,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const bodyStyle: CSSProperties = {
  padding: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const toggleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  borderRadius: 16,
  border: '1px solid rgba(31, 37, 58, 0.08)',
  background: palette.surfaceAlt,
  gap: 12,
};

const switchTrack: CSSProperties = {
  width: 46,
  height: 26,
  borderRadius: 999,
  background: '#d4d8e6',
  position: 'relative',
  transition: 'background 0.2s ease',
};

const switchDot: CSSProperties = {
  content: '""',
  width: 22,
  height: 22,
  borderRadius: '50%',
  background: '#fff',
  position: 'absolute',
  top: 2,
  left: 2,
  transition: 'transform 0.2s ease',
  boxShadow: '0 4px 10px rgba(24, 32, 56, 0.25)',
};

const statCardStyle: CSSProperties = {
  borderRadius: 16,
  padding: '12px 14px',
  border: '1px solid rgba(31, 37, 58, 0.08)',
  background: palette.surfaceAlt,
};

const primaryButton: CSSProperties = {
  border: 'none',
  borderRadius: 999,
  padding: 12,
  fontSize: '0.95rem',
  fontWeight: 600,
  color: '#fff',
  background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentAlt})`,
  cursor: 'pointer',
  boxShadow: '0 15px 30px rgba(255, 71, 87, 0.35)',
  transition: 'transform 0.2s ease',
};

export function PopupRoot({ target }: PopupRootProps) {
  const [syncState, setSyncState] = useState<ExtensionSyncState>(DEFAULT_SYNC_STATE);
  const [stats, setStats] = useState<ExtensionStats>(DEFAULT_STATS);
  const [version, setVersion] = useState<string>(() => getManifestVersion());

  const blockedCount = syncState.blockedTracks.length;
  const skippedShorts = stats.skippedShorts ?? 0;

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      try {
        const [initialSync, initialStats] = await Promise.all([readSyncState(), readStats()]);
        if (!mounted) return;
        setSyncState(initialSync);
        setStats(initialStats);
        setVersion(getManifestVersion());
      } catch (error) {
        console.error('[ext] Failed to load popup state', error);
      }
    }

    void loadInitial();

    const runtime = getChromeRuntime();
    if (!runtime?.storage) {
      return () => {
        mounted = false;
      };
    }

    const handler: Parameters<typeof runtime.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (!mounted) return;
      if (areaName === 'sync') {
        if (changes.blockedTracks) {
          const next = changes.blockedTracks.newValue as string[] | undefined;
          setSyncState((prev) => ({ ...prev, blockedTracks: Array.isArray(next) ? next : [] }));
        }
        if (changes.enabled) {
          setSyncState((prev) => ({ ...prev, enabled: changes.enabled.newValue !== false }));
        }
      }
      if (areaName === 'local' && changes.stats) {
        const nextStats = (changes.stats.newValue as ExtensionStats | undefined) ?? DEFAULT_STATS;
        setStats({ ...DEFAULT_STATS, ...nextStats });
      }
    };

    runtime.storage.onChanged.addListener(handler);

    return () => {
      mounted = false;
      runtime.storage.onChanged.removeListener(handler);
    };
  }, []);

  const handleToggle = (checked: boolean) => {
    setSyncState((prev) => ({ ...prev, enabled: checked }));
    void writeSyncState({ enabled: checked });
  };

  const handleOpenOptions = () => {
    const runtime = getChromeRuntime();
    if (runtime?.runtime?.openOptionsPage) {
      runtime.runtime.openOptionsPage();
    } else {
      window.open('https://www.youtube.com/shorts', '_blank');
    }
  };

  const iconUrl = useMemo(() => getChromeRuntime()?.runtime?.getURL('icons/icon48.png') ?? '', []);

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={heroStyle}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
            }}
          >
            {iconUrl ? <img src={iconUrl} alt="Shorts Track Skipper" style={{ width: '100%', height: '100%' }} /> : null}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Shorts Track Skipper</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.9 }}>Keep Shorts playlists fresh</p>
          </div>
        </div>

        <div style={bodyStyle}>
          <label style={toggleStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Auto-skip enabled</span>
              <small style={{ fontSize: '0.78rem', color: palette.muted }}>Automatically skip blocked tracks</small>
            </div>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={syncState.enabled}
                onChange={(event) => handleToggle(event.target.checked)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              />
              <span
                style={{
                  ...switchTrack,
                  background: syncState.enabled
                    ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentAlt})`
                    : switchTrack.background,
                }}
              >
                <span
                  style={{
                    ...switchDot,
                    transform: syncState.enabled ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
              </span>
            </div>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <div style={statCardStyle}>
              <span style={{ display: 'block', fontSize: '0.78rem', color: palette.muted, marginBottom: 6 }}>
                Blocked tracks
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 600, color: palette.accent }}>{blockedCount}</span>
            </div>
            <div style={statCardStyle}>
              <span style={{ display: 'block', fontSize: '0.78rem', color: palette.muted, marginBottom: 6 }}>
                Shorts skipped
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 600, color: palette.accent }}>{skippedShorts}</span>
            </div>
          </div>

          <button type="button" style={primaryButton} onClick={handleOpenOptions}>
            Manage tracks
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.78rem', color: palette.muted }}>
            v{version} · Running in {target}
          </div>
        </div>
      </div>
    </div>
  );
}
