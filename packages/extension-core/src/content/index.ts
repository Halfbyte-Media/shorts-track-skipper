import { BrowserTarget } from '../shared/types';
import { sendRuntimeMessage } from '../shared/messaging';
import { matchesBlocked, getCurrentTrackString, isShortsUrl, isClickableButton, norm } from './dom-utils';
import { ExtensionSyncState, hasExtensionContext, incrementStat, readSyncState, writeSyncState } from '../shared/state';

type SkipResult = 'clicked' | 'cooldown' | 'failed';

const NEXT_BUTTON_SELECTORS = [
  '#navigation-button-down button',
  '#navigation-button-down yt-button-shape button',
  '#navigation-button-down tp-yt-paper-button',
  'yt-button-shape button[aria-label*="Next"]',
  'button[aria-label*="Next video"]',
  'button[aria-label*="Next short"]',
  'button[aria-label*="Next shorts"]',
  'button[aria-label*="Next"]',
  'tp-yt-paper-icon-button[aria-label*="Next"]',
  '.ytp-next-button',
];

const DISLIKE_BUTTON_SELECTORS = [
  'button[aria-label="Dislike this video"]',
  'button[aria-label*="Dislike"]',
  'dislike-button-view-model button',
  '#actions #button-bar button[aria-label*="Dislike"]',
];

const SKIP_COOLDOWN_MS = 2000;

export function bootstrapContent(target: BrowserTarget) {
  let debugEnabled = false;
  const logDebug = (...args: unknown[]) => {
    if (debugEnabled) {
      console.log('[Shorts Blocker]', ...args);
    }
  };
  const logError = (...args: unknown[]) => console.error('[Shorts Blocker]', ...args);

  let blockedTracks: string[] = [];
  let blockedVersion = 0;
  let lastCheckedTrack: string | null = null;
  let lastCheckedVersion = -1;
  let pendingSkipTrackNorm: string | null = null;
  let enabled = true;
  let autoDislike = false;
  let autoSkipAfterBlock = true;
  let lastSkipTime = 0;
  let observer: MutationObserver | null = null;
  let observerTimeout: ReturnType<typeof setTimeout> | null = null;
  let addTrackButtonLastCall = 0;
  let checkAndSkipLastCall = 0;
  const historyRestorers: Array<() => void> = [];

  const hasChromeContext = hasExtensionContext();

  function updateBlockedTracks(nextTracks: unknown) {
    blockedTracks = Array.isArray(nextTracks) ? [...nextTracks] : [];
    blockedVersion += 1;
    lastCheckedVersion = -1;
  }

  function rememberCheckedTrack(track: string) {
    lastCheckedTrack = track;
    lastCheckedVersion = blockedVersion;
  }

  function recordSkipEvent(result: SkipResult) {
    if (result === 'clicked') {
      void incrementStat('skippedShorts');
    }
  }

  function tryClickNext(): SkipResult {
    const now = Date.now();
    if (lastSkipTime && now - lastSkipTime < SKIP_COOLDOWN_MS) {
      logDebug('Skip cooldown active, ignoring...');
      return 'cooldown';
    }

    for (const selector of NEXT_BUTTON_SELECTORS) {
      const btn = document.querySelector(selector);
      if (isClickableButton(btn)) {
        (btn as HTMLElement).click();
        lastSkipTime = now;
        logDebug('Clicked next via selector:', selector);
        return 'clicked';
      }
    }

    logDebug('Next button not found, dispatching ArrowDown fallback');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
    return 'failed';
  }

  function attemptSkipWithStats(delay = 0): Promise<SkipResult> {
    const performSkip = async (): Promise<SkipResult> => {
      const result = tryClickNext();
      recordSkipEvent(result);
      return result;
    };

    if (delay > 0) {
      return new Promise<SkipResult>((resolve) => {
        setTimeout(() => {
          performSkip()
            .then(resolve)
            .catch((error) => {
              logError('Skip attempt error', error);
              resolve('failed');
            });
        }, delay);
      });
    }

    return performSkip();
  }

  function scheduleSkipForTrack(trackStr: string, delay = 0) {
    if (!trackStr) {
      return;
    }
    const normalized = norm(trackStr);
    if (pendingSkipTrackNorm && normalized === pendingSkipTrackNorm) {
      logDebug('Skip already pending for track:', trackStr);
      return;
    }
    pendingSkipTrackNorm = normalized;
    rememberCheckedTrack(trackStr);

    const finalize = (result: SkipResult) => {
      if (pendingSkipTrackNorm === normalized) {
        pendingSkipTrackNorm = null;
      }
      if (result === 'failed') {
        logDebug('Skip attempt failed; retrying shortly');
        setTimeout(() => checkAndSkip(true), 400);
      }
    };

    attemptSkipWithStats(delay)
      .then(finalize)
      .catch((error) => {
        logError('Skip attempt error', error);
        finalize('failed');
      });
  }

  function tryDislike(): boolean {
    if (!autoDislike) {
      return false;
    }

    logDebug('Attempting to dislike video...');
    for (const selector of DISLIKE_BUTTON_SELECTORS) {
      const btn = document.querySelector(selector) as HTMLElement | null;
      if (btn && btn.getAttribute('aria-pressed') !== 'true') {
        btn.click();
        logDebug('Disliked video');
        return true;
      }
    }

    logDebug('Dislike button not found');
    return false;
  }

  function updateButtonState(hasTrack: boolean, trackStr: string | null = null) {
    const wrapper = document.querySelector<HTMLElement>('.block-track-btn-wrapper');
    if (!wrapper) {
      return;
    }
    const button = wrapper.querySelector('button');
    const label = wrapper.querySelector('.yt-spec-button-shape-with-label__label span');
    if (!button || !label) {
      return;
    }

    const pendingTrack = wrapper.dataset.pendingTrack;
    if (pendingTrack) {
      if (trackStr && norm(pendingTrack) === norm(trackStr)) {
        button.setAttribute('aria-label', 'Saving block...');
        button.style.opacity = '0.6';
        button.style.pointerEvents = 'none';
        label.textContent = 'Saving...';
        return;
      }
      delete wrapper.dataset.pendingTrack;
    }

    if (!hasTrack) {
      button.style.opacity = '0.4';
      button.style.pointerEvents = 'none';
      button.setAttribute('aria-label', 'No track detected');
      label.textContent = 'Block';
      return;
    }

    const currentTrack = trackStr ?? getCurrentTrackString();
    if (currentTrack && matchesBlocked(currentTrack, blockedTracks)) {
      button.style.opacity = '0.6';
      button.style.pointerEvents = 'none';
      button.setAttribute('aria-label', 'Track already blocked');
      label.textContent = 'Blocked';
      return;
    }

    button.style.opacity = '1';
    button.style.pointerEvents = 'auto';
    button.setAttribute('aria-label', 'Block this track');
    label.textContent = 'Block';
  }

  function addTrackButton() {
    if (document.querySelector('.block-track-btn-wrapper')) {
      return;
    }

    const now = Date.now();
    if (now - addTrackButtonLastCall < 200) {
      return;
    }
    addTrackButtonLastCall = now;

    const buttonbarSelectors = [
      '#actions #button-bar reel-action-bar-view-model',
      '#actions reel-action-bar-view-model',
      'reel-action-bar-view-model',
      '#actions #button-bar',
      '#actions ytd-reel-player-overlay-renderer #actions',
    ];

    let buttonBar: Element | null = null;
    for (const selector of buttonbarSelectors) {
      buttonBar = document.querySelector(selector);
      if (buttonBar) {
        logDebug('Found button bar using selector:', selector);
        break;
      }
    }

    if (!buttonBar) {
      logDebug('Button bar not found');
      return;
    }

    const wrapper = document.createElement('button-view-model');
    wrapper.className = 'ytSpecButtonViewModelHost block-track-btn-wrapper';
    wrapper.innerHTML = `
      <label class="yt-spec-button-shape-with-label">
        <button class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-l yt-spec-button-shape-next--icon-button yt-spec-button-shape-next--enable-backdrop-filter-experiment block-track-btn" 
                title="Block this track"
                aria-label="Block this track"
                aria-disabled="false">
          <div aria-hidden="true" class="yt-spec-button-shape-next__icon">
            <span class="ytIconWrapperHost" style="width: 24px; height: 24px;">
              <span class="yt-icon-shape ytSpecIconShapeHost">
                <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 500 500" width="24" focusable="false" aria-hidden="true">
                    <ellipse style="fill: none;" cx="247.302" cy="252.308" rx="223.702" ry="219.481" transform="matrix(1.04552, 0, 0, 1.04552, -9.000871, -15.119252)"/>
                    <g transform="matrix(1.132146, 0, 0, 1.132146, -10.68043, -24.405617)">
                      <path d="M 144.344 281.796 C 112.047 281.796 91.86 316.758 108.012 344.728 C 115.501 357.705 129.353 365.705 144.344 365.705 C 176.635 365.705 196.822 330.743 180.677 302.773 C 173.181 289.789 159.329 281.796 144.344 281.796 Z M 284.191 253.827 C 251.894 253.827 231.707 288.789 247.859 316.758 C 255.348 329.736 269.2 337.735 284.191 337.735 C 316.482 337.735 336.669 302.773 320.523 274.804 C 313.028 261.819 299.176 253.827 284.191 253.827 Z"/>
                      <path d="M 165.322 155.934 C 165.322 155.934 165.322 323.667 165.322 323.751 L 186.299 323.751 L 186.299 215.95 L 305.168 176.911 L 305.168 295.781 L 326.145 295.781 L 326.145 106.988 L 165.322 155.934 Z"/>
                    </g>
                    <path d="M 28.395 229.26 L 468.365 229.26 L 468.365 277.083 L 28.395 277.083 L 28.395 229.26 Z" transform="matrix(0.906172, 0.52301, -0.52301, 0.906172, 129.180786, -112.859383)"/>
                    <path d="M 247.724 14.461 C 116.21 14.461 8.609 122.063 8.609 253.576 C 8.609 385.09 116.21 492.692 247.724 492.692 C 379.238 492.692 486.84 385.09 486.84 253.576 C 486.84 122.063 379.238 14.461 247.724 14.461 Z M 247.724 444.869 C 142.513 444.869 56.432 358.788 56.432 253.576 C 56.432 148.366 142.513 62.283 247.724 62.283 C 352.935 62.283 439.018 148.366 439.018 253.576 C 439.018 358.788 352.935 444.869 247.724 444.869 Z" transform="matrix(1.04552, 0, 0, 1.04552, -9.000871, -15.119252)"/>
                  </svg>
                </div>
              </span>
            </span>
          </div>
          <yt-touch-feedback-shape aria-hidden="true" class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response">
            <div class="yt-spec-touch-feedback-shape__stroke"></div>
            <div class="yt-spec-touch-feedback-shape__fill"></div>
          </yt-touch-feedback-shape>
        </button>
        <div class="yt-spec-button-shape-with-label__label" aria-hidden="false" style="white-space: nowrap; overflow: visible;">
          <span class="yt-core-attributed-string" role="text" style="white-space: nowrap;">Block</span>
        </div>
      </label>
    `;

    const button = wrapper.querySelector('button');
    const label = wrapper.querySelector('.yt-spec-button-shape-with-label__label span');

    button?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!hasChromeContext) {
        logDebug('Extension context missing; disabling block button');
        if (button) {
          button.style.opacity = '0.4';
          button.style.pointerEvents = 'none';
          button.setAttribute('aria-label', 'Extension reloading...');
        }
        if (label) {
          label.textContent = 'Unavailable';
        }
        return;
      }

      const track = getCurrentTrackString();
      if (!track) {
        logDebug('No track found to block');
        return;
      }
      if (matchesBlocked(track, blockedTracks)) {
        logDebug('Track already blocked:', track);
        updateButtonState(true, track);
        return;
      }

      if (button) {
        wrapper.dataset.pendingTrack = track;
        button.style.opacity = '0.6';
        button.style.pointerEvents = 'none';
        button.setAttribute('aria-label', 'Saving block...');
      }
      if (label) {
        label.textContent = 'Saving...';
      }

      const updated = [...blockedTracks, track];
      writeSyncState({ blockedTracks: updated })
        .then(() => {
          updateBlockedTracks(updated);
          updateButtonState(true, track);
          if (label) {
            label.textContent = 'Blocked';
          }
          logDebug('Blocked track:', track);
          if (autoSkipAfterBlock) {
            logDebug('Auto-skipping after block...');
            scheduleSkipForTrack(track, 300);
          }
          delete wrapper.dataset.pendingTrack;
        })
        .catch((error) => {
          logError('Failed to save blocked track:', error);
          delete wrapper.dataset.pendingTrack;
          if (button) {
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
            button.setAttribute('aria-label', 'Block this track');
          }
          if (label) {
            label.textContent = 'Block';
          }
        });
    });

    buttonBar.appendChild(wrapper);
  }

  function checkAndSkip(force = false) {
    if (!isShortsUrl()) {
      return;
    }

    const now = Date.now();
    if (!force && now - checkAndSkipLastCall < 100) {
      return;
    }
    checkAndSkipLastCall = now;

    addTrackButton();

    const trackStr = getCurrentTrackString();
    if (!trackStr) {
      updateButtonState(false);
      return;
    }

    updateButtonState(true, trackStr);

    if (!enabled) {
      return;
    }

    if (!force && trackStr === lastCheckedTrack && lastCheckedVersion === blockedVersion) {
      return;
    }

    logDebug('Current track:', trackStr);
    const isBlocked = matchesBlocked(trackStr, blockedTracks, logDebug);
    if (!isBlocked) {
      rememberCheckedTrack(trackStr);
      return;
    }

    logDebug('Track is blocked, processing...');
    if (autoDislike) {
      tryDislike();
      scheduleSkipForTrack(trackStr, 300);
    } else {
      scheduleSkipForTrack(trackStr);
    }
  }

  function setupObserver() {
    observer?.disconnect();
    observer = new MutationObserver(() => {
      if (observerTimeout) {
        return;
      }
      observerTimeout = setTimeout(() => {
        observerTimeout = null;
        checkAndSkip();
      }, 100);
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  }

  function resetButtonState() {
    const oldButton = document.querySelector('.block-track-btn-wrapper');
    if (oldButton) {
      oldButton.remove();
    }
  }

  function onNav() {
    if (!isShortsUrl()) {
      return;
    }
    lastCheckedTrack = null;
    lastCheckedVersion = -1;
    pendingSkipTrackNorm = null;
    resetButtonState();
    setTimeout(() => addTrackButton(), 50);
    setTimeout(() => addTrackButton(), 300);
    setTimeout(() => addTrackButton(), 800);
    setTimeout(() => checkAndSkip(true), 50);
    setTimeout(() => checkAndSkip(true), 500);
    setTimeout(() => checkAndSkip(true), 1500);
  }

  function wrapHistoryMethod(methodName: 'pushState' | 'replaceState') {
    const original = history[methodName];
    if (typeof original !== 'function') {
      return;
    }

    const patched = function (this: History, ...args: Parameters<typeof original>) {
      const result = (original as (...inner: Parameters<typeof original>) => ReturnType<typeof original>).apply(this, args);
      onNav();
      return result;
    } as typeof original;

    history[methodName] = patched;
    historyRestorers.push(() => {
      history[methodName] = original;
    });
  }

  const storageListener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, areaName) => {
    if (areaName && areaName !== 'sync') {
      return;
    }
    if (changes.blockedTracks) {
      updateBlockedTracks(changes.blockedTracks.newValue);
    }
    if (changes.enabled) {
      enabled = changes.enabled.newValue !== false;
    }
    if (changes.autoDislike) {
      autoDislike = Boolean(changes.autoDislike.newValue);
    }
    if (changes.autoSkipAfterBlock) {
      autoSkipAfterBlock = changes.autoSkipAfterBlock.newValue !== false;
    }
    if (changes.debugLogs) {
      debugEnabled = Boolean(changes.debugLogs.newValue);
    }
    checkAndSkip(true);
  };

  function init() {
    readSyncState()
      .then((state: ExtensionSyncState) => {
        updateBlockedTracks(state.blockedTracks);
        enabled = state.enabled !== false;
        autoDislike = Boolean(state.autoDislike);
        autoSkipAfterBlock = state.autoSkipAfterBlock !== false;
        debugEnabled = Boolean(state.debugLogs);
        checkAndSkip(true);
      })
      .catch((error) => logError('Failed to load persisted state', error));

    setupObserver();
    window.addEventListener('yt-navigate-finish', onNav, true);
    window.addEventListener('yt-page-data-updated', onNav, true);
    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');
    if (hasChromeContext) {
      chrome.storage.onChanged.addListener(storageListener);
    }
  }

  init();
  sendRuntimeMessage(target, { type: 'content:ready' });

  return () => {
    observer?.disconnect();
    if (observerTimeout) {
      clearTimeout(observerTimeout);
      observerTimeout = null;
    }
    window.removeEventListener('yt-navigate-finish', onNav, true);
    window.removeEventListener('yt-page-data-updated', onNav, true);
    if (hasChromeContext) {
      chrome.storage.onChanged.removeListener(storageListener);
    }
    historyRestorers.forEach((restore) => restore());
  };
}
