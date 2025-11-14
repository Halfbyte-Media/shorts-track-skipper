import { CSSProperties, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  writeStats,
  writeSyncState,
} from '../shared/state';
import { norm } from '../content/dom-utils';

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl60?: string;
  artworkUrl100?: string;
}

type AddStatus = 'idle' | 'added' | 'exists';
type ToggleKey = 'enabled' | 'autoDislike' | 'autoSkipAfterBlock' | 'debugLogs';

const container: CSSProperties = {
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
  background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentAlt} 100%)`,
  minHeight: '100vh',
  padding: '40px 20px',
  margin: 0,
  color: palette.text,
};

const card: CSSProperties = {
  maxWidth: 880,
  margin: '0 auto',
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  overflow: 'hidden',
};

const header: CSSProperties = {
  background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentAlt} 100%)`,
  color: '#fff',
  padding: 32,
  textAlign: 'center',
};

const toggleSection: CSSProperties = {
  background: '#f8f9fa',
  padding: 20,
  borderRadius: 12,
  marginBottom: 24,
};

const switchTrackStyle: CSSProperties = {
  width: 52,
  height: 28,
  borderRadius: 14,
  background: '#ddd',
  position: 'relative',
  transition: 'background 0.3s',
};

const switchThumb: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 12,
  background: '#fff',
  position: 'absolute',
  top: 2,
  left: 2,
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  transition: 'transform 0.3s',
};

export function OptionsRoot() {
  const [syncState, setSyncState] = useState<ExtensionSyncState>(DEFAULT_SYNC_STATE);
  const [stats, setStats] = useState<ExtensionStats>(DEFAULT_STATS);
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<ItunesTrack[]>([]);
  const [autocompleteVisible, setAutocompleteVisible] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [addStatus, setAddStatus] = useState<AddStatus>('idle');
  const [resetting, setResetting] = useState(false);
  const [version, setVersion] = useState(getManifestVersion());

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const [initialSync, initialStats] = await Promise.all([readSyncState(), readStats()]);
        if (!mounted) return;
        setSyncState(initialSync);
        setStats(initialStats);
        setVersion(getManifestVersion());
      } catch (error) {
        console.error('[ext] Failed to load options state', error);
      }
    }

    void bootstrap();

    const runtime = getChromeRuntime();
    if (!runtime?.storage) {
      return () => {
        mounted = false;
      };
    }

    const handler: Parameters<typeof runtime.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (!mounted) return;
      if (areaName === 'sync') {
        const next: Partial<ExtensionSyncState> = {};
        if (changes.blockedTracks) {
          next.blockedTracks = Array.isArray(changes.blockedTracks.newValue)
            ? (changes.blockedTracks.newValue as string[])
            : [];
        }
        if (changes.enabled) {
          next.enabled = changes.enabled.newValue !== false;
        }
        if (changes.autoDislike) {
          next.autoDislike = Boolean(changes.autoDislike.newValue);
        }
        if (changes.autoSkipAfterBlock) {
          next.autoSkipAfterBlock = changes.autoSkipAfterBlock.newValue !== false;
        }
        if (changes.debugLogs) {
          next.debugLogs = Boolean(changes.debugLogs.newValue);
        }
        setSyncState((prev) => ({ ...prev, ...next }));
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

  useEffect(() => {
    if (inputValue.trim().length < 2) {
      setSearchResults([]);
      setAutocompleteVisible(false);
      setSearchLoading(false);
      setSelectedIndex(-1);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(inputValue)}&entity=song&limit=8`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        if (cancelled) return;
        setSearchResults(Array.isArray(data.results) ? data.results : []);
        setAutocompleteVisible(true);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Search error', error);
        if (!cancelled) {
          setSearchResults([]);
          setAutocompleteVisible(false);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [inputValue]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!autocompleteVisible) return;
      const target = event.target as Node;
      if (!inputRef.current?.contains(target) && !autocompleteRef.current?.contains(target)) {
        setAutocompleteVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [autocompleteVisible]);

  const blockedCount = syncState.blockedTracks.length;
  const skippedCount = stats.skippedShorts ?? 0;

  const setAddFeedback = (status: AddStatus) => {
    setAddStatus(status);
    if (status !== 'idle') {
      setTimeout(() => setAddStatus('idle'), 1500);
    }
  };

  const addTrack = () => {
    const value = inputValue.trim();
    if (!value) return;

    const normalizedValue = norm(value);
    if (syncState.blockedTracks.some((track) => norm(track) === normalizedValue)) {
      setAddFeedback('exists');
      return;
    }

    const next = [...syncState.blockedTracks, value];
    setSyncState((prev) => ({ ...prev, blockedTracks: next }));
    setInputValue('');
    setAutocompleteVisible(false);
    setSelectedIndex(-1);
    setSearchResults([]);
    setAddFeedback('added');
    void writeSyncState({ blockedTracks: next });
  };

  const removeTrack = (index: number) => {
    const next = syncState.blockedTracks.filter((_, i) => i !== index);
    setSyncState((prev) => ({ ...prev, blockedTracks: next }));
    void writeSyncState({ blockedTracks: next });
  };

  const handleToggle = (key: ToggleKey) => (checked: boolean) => {
    setSyncState((prev) => ({ ...prev, [key]: checked }));
    void writeSyncState({ [key]: checked } as Partial<ExtensionSyncState>);
  };

  const handleReset = () => {
    if (resetting) return;
    const confirmed = window.confirm('This will remove all blocked tracks, statistics, and preferences. Continue?');
    if (!confirmed) return;

    setResetting(true);
    Promise.all([writeSyncState(DEFAULT_SYNC_STATE), writeStats(DEFAULT_STATS)])
      .then(() => {
        setSyncState(DEFAULT_SYNC_STATE);
        setStats(DEFAULT_STATS);
      })
      .catch((error) => console.error('Reset failed', error))
      .finally(() => setResetting(false));
  };

  const selectTrack = (track: ItunesTrack) => {
    const label = `${track.trackName} - ${track.artistName}`;
    setInputValue(label);
    setAutocompleteVisible(false);
    setSelectedIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!autocompleteVisible || (!searchResults.length && !searchLoading)) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        addTrack();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        selectTrack(searchResults[selectedIndex]);
      } else {
        addTrack();
      }
    } else if (event.key === 'Escape') {
      setAutocompleteVisible(false);
    }
  };

  const addButtonLabel = useMemo(() => {
    if (addStatus === 'added') return '✓ Added!';
    if (addStatus === 'exists') return 'Already added!';
    return 'Add Track';
  }, [addStatus]);

  const toggleConfigs: Array<{ key: ToggleKey; title: string; description: string }> = [
    {
      key: 'enabled',
      title: 'Auto-skip enabled',
      description: 'Automatically skip Shorts with blocked tracks',
    },
    {
      key: 'autoDislike',
      title: 'Auto-dislike blocked tracks',
      description: 'Dislike videos featuring blocked tracks before skipping',
    },
    {
      key: 'autoSkipAfterBlock',
      title: 'Auto-skip after blocking',
      description: 'Jump to the next Short immediately after blocking a track',
    },
    {
      key: 'debugLogs',
      title: 'Enable debug logs',
      description: 'Print verbose console logs for troubleshooting',
    },
  ];

  return (
    <div style={container}>
      <div style={card}>
        <div style={header}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 16px',
              background: '#fff',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
            }}
          >
            <img src="icons/icon128.png" alt="Shorts Track Skipper" style={{ width: '100%', height: '100%' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Shorts Track Skipper</h1>
          <p style={{ fontSize: 14, opacity: 0.9 }}>Manage your blocked tracks</p>
        </div>

        <div style={{ padding: 32 }}>
          {toggleConfigs.map(({ key, title, description }) => (
            <div key={key} style={toggleSection}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: '#333' }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{description}</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(syncState[key])}
                    onChange={(event) => handleToggle(key)(event.target.checked)}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  />
                  <span
                    style={{
                      ...switchTrackStyle,
                      background: syncState[key]
                        ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentAlt})`
                        : switchTrackStyle.background,
                    }}
                  >
                    <span
                      style={{
                        ...switchThumb,
                        transform: syncState[key] ? 'translateX(24px)' : 'translateX(0)',
                      }}
                    />
                  </span>
                </div>
              </label>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <div
              style={{
                flex: 1,
                minWidth: 180,
                background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentAlt} 100%)`,
                color: '#fff',
                padding: 20,
                borderRadius: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 700 }}>{blockedCount}</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Blocked Tracks</div>
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 180,
                background: `linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)`,
                color: '#fff',
                padding: 20,
                borderRadius: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 700 }}>{skippedCount}</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Shorts Skipped</div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 16 }}>Add New Track</div>
            <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className="input-wrapper" style={{ flex: 1, position: 'relative', minWidth: 220 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search for a track..."
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e0e0e0',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                  {autocompleteVisible && (
                    <div
                      ref={autocompleteRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '2px solid #ff4757',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        maxHeight: 320,
                        overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 10,
                      }}
                    >
                      {searchLoading && <div style={{ padding: 16, textAlign: 'center', color: '#666' }}>Searching...</div>}
                      {!searchLoading && searchResults.length === 0 && (
                        <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>No tracks found</div>
                      )}
                      {searchResults.map((track, index) => (
                        <div
                          key={track.trackId}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectTrack(track);
                          }}
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center',
                            padding: '12px 16px',
                            background: index === selectedIndex ? '#e8eaed' : '#fff',
                            borderBottom: '1px solid #f0f0f0',
                            cursor: 'pointer',
                          }}
                        >
                          {track.artworkUrl60 ? (
                            <img
                              src={track.artworkUrl60}
                              alt=""
                              style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                            />
                          ) : null}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: 14, color: '#333' }}>{track.trackName}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>{track.artistName}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addTrack}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentAlt} 100%)`,
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {addButtonLabel}
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 16 }}>Blocked Tracks</div>
            {blockedCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#999' }}>
                <div style={{ fontSize: 16, marginBottom: 8 }}>No blocked tracks yet</div>
                <div style={{ fontSize: 13, color: '#bbb' }}>Add a track above to get started</div>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {syncState.blockedTracks.map((track, index) => (
                  <li
                    key={`${track}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      background: '#fff',
                      border: '2px solid #e0e0e0',
                      borderRadius: 8,
                      marginBottom: 12,
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: '#333', wordBreak: 'break-word' }}>{track}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(track)}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        title="Search on YouTube"
                        style={{
                          background: '#e8eaed',
                          color: '#333',
                          padding: 8,
                          borderRadius: 6,
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </a>
                      <a
                        href={`https://open.spotify.com/search/${encodeURIComponent(track)}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        title="Search on Spotify"
                        style={{
                          background: '#e8eaed',
                          color: '#333',
                          padding: 8,
                          borderRadius: 6,
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                        </svg>
                      </a>
                      <button
                        type="button"
                        onClick={() => removeTrack(index)}
                        style={{
                          background: '#ff4757',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 16px',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            style={{
              background: '#e3f2fd',
              borderLeft: '4px solid #2196f3',
              padding: 16,
              borderRadius: 8,
              marginBottom: 24,
              color: '#555',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 600, color: '#1976d2', marginBottom: 8 }}>💡 How it works</div>
            Tracks are matched using smart detection. The extension checks both the track title and artist name, and uses
            case-insensitive matching. When a blocked track is detected on a YouTube Short, it will automatically skip
            to the next video.
          </div>

          <div
            style={{
              marginTop: 32,
              padding: 24,
              border: '2px dashed #ff4757',
              borderRadius: 12,
              background: '#fff5f5',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#c0392b', marginBottom: 6 }}>Reset extension data</div>
              <div style={{ fontSize: 13, color: '#a94442' }}>
                Removes all blocked tracks, settings, and statistics. This action cannot be undone.
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              style={{
                background: '#ff4757',
                color: '#fff',
                borderRadius: 10,
                border: 'none',
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: resetting ? 'not-allowed' : 'pointer',
                opacity: resetting ? 0.6 : 1,
                minWidth: 180,
              }}
            >
              {resetting ? 'Resetting…' : 'Reset All Data'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: 24, color: '#999', fontSize: 12, borderTop: '1px solid #e0e0e0' }}>
          Shorts Track Skipper v{version}
        </div>
      </div>
    </div>
  );
}
