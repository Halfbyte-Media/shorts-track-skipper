export const SOUND_METADATA_SELECTOR = '.ytReelSoundMetadataViewModelMarqueeContainer .ytMarqueeScrollPrimaryString';

export interface ParsedTrack {
  title: string;
  artist: string;
  full: string;
}

export interface TrackInfo {
  title: string;
  author: string;
  full: string;
}

export function norm(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}

export function getText(el?: Element | null): string {
  return el?.textContent?.trim() ?? '';
}

export function parseTrackString(trackStr?: string | null): ParsedTrack | null {
  if (!trackStr) {
    return null;
  }

  const normalized = trackStr.trim();
  if (!normalized) {
    return null;
  }

  const parts = normalized.split(/\s*[-–—]\s*/);
  if (parts.length >= 2) {
    return {
      title: parts[0]?.trim() ?? '',
      artist: parts.slice(1).join(' - ').trim(),
      full: normalized,
    };
  }

  return {
    title: normalized,
    artist: '',
    full: normalized,
  };
}

export function getTrackFromYtData(): TrackInfo | null {
  try {
    const initial = (window as typeof window & {
      ytInitialPlayerResponse?: { videoDetails?: { title?: string; author?: string; musicVideoType?: string } };
    }).ytInitialPlayerResponse;
    if (initial?.videoDetails?.musicVideoType === 'MUSIC_VIDEO_TYPE_ATV') {
      const details = initial.videoDetails;
      if (details?.title && details.author) {
        return {
          title: details.title,
          author: details.author,
          full: `${details.title} - ${details.author}`,
        };
      }
    }

    const player = document.querySelector('ytd-player') as (Element & { playerResponse?: { videoDetails?: { title?: string; author?: string } } }) | null;
    const videoDetails = player?.playerResponse?.videoDetails;
    if (videoDetails?.title) {
      return {
        title: videoDetails.title,
        author: videoDetails.author ?? '',
        full: videoDetails.author ? `${videoDetails.title} - ${videoDetails.author}` : videoDetails.title,
      };
    }

    const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent ?? '{}');
        if (data['@type'] === 'VideoObject' && data.genre === 'Music') {
          const name = data.name as string | undefined;
          const author = typeof data.author === 'object' ? data.author?.name : data.author;
          if (name) {
            return {
              title: name,
              author: author ?? '',
              full: author ? `${name} - ${author}` : name,
            };
          }
        }
      } catch {
        // Ignore malformed JSON blobs.
      }
    }
  } catch (error) {
    console.error('[ext] Failed to parse initial track data', error);
  }

  return null;
}

export function getCurrentTrackString(selector = SOUND_METADATA_SELECTOR): string | null {
  const trackInfo = getTrackFromYtData();
  if (trackInfo?.full) {
    return trackInfo.full;
  }

  const el = document.querySelector(selector);
  return el ? getText(el) : null;
}

export function matchesBlocked(currentTrack: string | null, blockedTracks: string[], log?: (...args: unknown[]) => void): boolean {
  if (!currentTrack) {
    return false;
  }

  const current = parseTrackString(currentTrack);
  if (!current) {
    return false;
  }

  return blockedTracks.some((blockedTrack) => {
    const blocked = parseTrackString(blockedTrack);
    if (!blocked) {
      return false;
    }

    if (norm(current.full) === norm(blocked.full)) {
      log?.('Exact match:', current.full);
      return true;
    }

    if (blocked.title && blocked.artist && current.title && current.artist) {
      if (norm(current.title) === norm(blocked.title) && norm(current.artist) === norm(blocked.artist)) {
        log?.('Title+Artist match:', current.full);
        return true;
      }
    }

    if (blocked.title && !blocked.artist && current.title) {
      if (norm(current.title) === norm(blocked.title)) {
        log?.('Title-only match:', current.full);
        return true;
      }
    }

    if (blocked.full.length > 5 && norm(current.full).includes(norm(blocked.full))) {
      log?.('Substring match:', current.full);
      return true;
    }

    return false;
  });
}

export function isShortsUrl(pathname = location.pathname): boolean {
  return pathname.startsWith('/shorts');
}

export function isClickableButton(el?: Element | null): el is HTMLElement {
  if (!el) {
    return false;
  }
  const button = el as HTMLElement;
  if ('disabled' in button && (button as HTMLButtonElement).disabled) {
    return false;
  }
  if (button.getAttribute('aria-disabled') === 'true') {
    return false;
  }
  const rect = button.getBoundingClientRect?.();
  if (rect && (rect.width === 0 || rect.height === 0)) {
    return false;
  }
  const style = window.getComputedStyle(button);
  return style.visibility !== 'hidden' && style.display !== 'none';
}
