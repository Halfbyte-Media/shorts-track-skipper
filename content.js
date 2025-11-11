const S_EL = ".ytReelSoundMetadataViewModelMarqueeContainer .ytMarqueeScrollPrimaryString";
let enabled = true;
let blocked = [];
let autoDislike = false;
let autoSkipAfterBlock = true;
let lastSkipTime = 0;
const SKIP_COOLDOWN = 2000; // 2 seconds cooldown between skips
let lastCheckedTrack = null; // Prevent duplicate checks

function getText(el) {
  return el ? (el.textContent || "").trim() : "";
}

function norm(s) {
  return s.normalize("NFKC").toLowerCase();
}

function isShortsUrl() {
  return location.pathname.startsWith("/shorts");
}

// Extract track info from YouTube's internal player data
function getTrackFromYtData() {
  try {
    // Method 1: Try to get from ytInitialPlayerResponse
    if (window.ytInitialPlayerResponse?.videoDetails?.musicVideoType) {
      const details = window.ytInitialPlayerResponse.videoDetails;
      if (details.musicVideoType === "MUSIC_VIDEO_TYPE_ATV") {
        return {
          title: details.title,
          author: details.author,
          full: `${details.title} - ${details.author}`
        };
      }
    }

    // Method 2: Try player response in page data
    const player = document.querySelector("ytd-player");
    if (player?.playerResponse?.videoDetails) {
      const vd = player.playerResponse.videoDetails;
      return {
        title: vd.title,
        author: vd.author,
        full: `${vd.title} - ${vd.author}`
      };
    }

    // Method 3: Look for structured data in the page
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'VideoObject' && data.genre === 'Music') {
          return {
            title: data.name,
            author: data.author?.name || '',
            full: data.author?.name ? `${data.name} - ${data.author.name}` : data.name
          };
        }
      } catch (e) { /* ignore */ }
    }
  } catch (e) {
    console.log('[Shorts Blocker] Error extracting YT data:', e);
  }
  return null;
}

// Parse track string into components (handles "Title - Artist" format)
function parseTrackString(trackStr) {
  if (!trackStr) return null;
  
  const normalized = trackStr.trim();
  const parts = normalized.split(/\s*[-–—]\s*/); // Various dash types
  
  if (parts.length >= 2) {
    return {
      title: parts[0].trim(),
      artist: parts.slice(1).join(' - ').trim(),
      full: normalized
    };
  }
  
  return {
    title: normalized,
    artist: '',
    full: normalized
  };
}

// Enhanced matching with multiple strategies
function matchesBlocked(currentTrack) {
  if (!currentTrack) return false;
  
  const current = parseTrackString(currentTrack);
  if (!current) return false;
  
  return blocked.some(blockedTrack => {
    const blocked = parseTrackString(blockedTrack);
    if (!blocked) return false;
    
    // Strategy 1: Exact match (case-insensitive)
    if (norm(current.full) === norm(blocked.full)) {
      console.log('[Shorts Blocker] Exact match:', current.full);
      return true;
    }
    
    // Strategy 2: Title + Artist match
    if (blocked.title && blocked.artist && current.title && current.artist) {
      if (norm(current.title) === norm(blocked.title) && 
          norm(current.artist) === norm(blocked.artist)) {
        console.log('[Shorts Blocker] Title+Artist match:', current.full);
        return true;
      }
    }
    
    // Strategy 3: Title-only match if no artist in blocked track
    if (blocked.title && !blocked.artist && current.title) {
      if (norm(current.title) === norm(blocked.title)) {
        console.log('[Shorts Blocker] Title-only match:', current.full);
        return true;
      }
    }
    
    // Strategy 4: Substring match (original behavior, as fallback)
    // Only if blocked track is substantial (avoid matching short strings)
    if (blocked.full.length > 5 && norm(current.full).includes(norm(blocked.full))) {
      console.log('[Shorts Blocker] Substring match:', current.full);
      return true;
    }
    
    return false;
  });
}

function tryClickNext() {
  const now = Date.now();
  if (now - lastSkipTime < SKIP_COOLDOWN) {
    console.log('[Shorts Blocker] Skip cooldown active, ignoring...');
    return false;
  }
  
  lastSkipTime = now;
  console.log('[Shorts Blocker] Skipping to next video...');
  
  const sel = [
    'button[aria-label*="Next"]',
    '#navigation-button-down button',
    'tp-yt-paper-icon-button[aria-label*="Next"]',
    '.yt-spec-button-shape-next--icon-button[aria-label*="Next"]'
  ];
  for (const s of sel) {
    const btn = document.querySelector(s);
    if (btn) { btn.click(); return true; }
  }
  document.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowDown", code: "ArrowDown", bubbles: true}));
  return false;
}

function tryDislike() {
  if (!autoDislike) return false;
  
  console.log('[Shorts Blocker] Attempting to dislike video...');
  
  // Try to find the dislike button
  const selectors = [
    'button[aria-label="Dislike this video"]',
    'button[aria-label*="Dislike"]',
    'dislike-button-view-model button',
    '#actions #button-bar button[aria-label*="Dislike"]'
  ];
  
  for (const selector of selectors) {
    const btn = document.querySelector(selector);
    if (btn && btn.getAttribute('aria-pressed') !== 'true') {
      btn.click();
      console.log('[Shorts Blocker] Disliked video');
      return true;
    }
  }
  
  console.log('[Shorts Blocker] Dislike button not found');
  return false;
}

function updateButtonState(hasTrack) {
  const wrapper = document.querySelector(".block-track-btn-wrapper");
  if (!wrapper) return;
  
  const button = wrapper.querySelector('button');
  const label = wrapper.querySelector('.yt-spec-button-shape-with-label__label span');
  
  if (!button || !label) return;
  
  // Don't update if button is already in "blocked" state
  if (label.textContent === 'Blocked') return;
  
  if (!hasTrack) {
    // Disable button when no track
    button.style.opacity = '0.4';
    button.style.pointerEvents = 'none';
    button.setAttribute('aria-label', 'No track detected');
    label.textContent = 'Block';
  } else {
    // Check if current track is already blocked
    const trackInfo = getTrackFromYtData();
    const trackStr = trackInfo?.full || (document.querySelector(S_EL) ? getText(document.querySelector(S_EL)) : null);
    
    if (trackStr && blocked.some(t => matchesBlocked(trackStr))) {
      // Track is already blocked
      button.style.opacity = '0.6';
      button.style.pointerEvents = 'none';
      button.setAttribute('aria-label', 'Track already blocked');
      label.textContent = 'Blocked';
    } else {
      // Enable button when track exists and not blocked
      button.style.opacity = '1';
      button.style.pointerEvents = 'auto';
      button.setAttribute('aria-label', 'Block this track');
      label.textContent = 'Block';
    }
  }
}

function addTrackButton() {
  // Check if button already exists
  if (document.querySelector(".block-track-btn-wrapper")) return;
  
  // Prevent excessive calls
  if (addTrackButton.lastCall && Date.now() - addTrackButton.lastCall < 200) return;
  addTrackButton.lastCall = Date.now();
  
  // Try multiple selectors for the button bar
  const selectors = [
    '#actions #button-bar reel-action-bar-view-model',
    '#actions reel-action-bar-view-model',
    'reel-action-bar-view-model',
    '#actions #button-bar',
    '#actions ytd-reel-player-overlay-renderer #actions'
  ];
  
  let buttonBar = null;
  for (const selector of selectors) {
    buttonBar = document.querySelector(selector);
    if (buttonBar) {
      console.log('[Shorts Blocker] Found button bar using selector:', selector);
      break;
    }
  }
  
  if (!buttonBar) {
    console.log('[Shorts Blocker] Button bar not found');
    return;
  }

  // Get current track for the button click handler
  const getCurrentTrack = () => {
    const trackInfo = getTrackFromYtData();
    if (trackInfo?.full) return trackInfo.full;
    
    const el = document.querySelector(S_EL);
    return el ? getText(el) : null;
  };

  // Create button wrapper matching YouTube's structure
  const wrapper = document.createElement('button-view-model');
  wrapper.className = 'ytSpecButtonViewModelHost block-track-btn-wrapper';
  
  wrapper.innerHTML = `
    <label class="yt-spec-button-shape-with-label">
      <button class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-l yt-spec-button-shape-next--icon-button yt-spec-button-shape-next--enable-backdrop-filter-experiment block-track-btn" 
              title="Block this track" 
              aria-label="Block this track" 
              aria-disabled="false" 
              style="">
        <div aria-hidden="true" class="yt-spec-button-shape-next__icon">
          <span class="ytIconWrapperHost" style="width: 24px; height: 24px;">
            <span class="yt-icon-shape ytSpecIconShapeHost">
              <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 500 500" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;">
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
        <span class="yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap yt-core-attributed-string--text-alignment-center yt-core-attributed-string--word-wrapping" role="text" style="white-space: nowrap;">Block</span>
      </div>
    </label>
  `;

  const button = wrapper.querySelector('button');
  const label = wrapper.querySelector('.yt-spec-button-shape-with-label__label span');
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const track = getCurrentTrack();
    if (!track) {
      console.log('[Shorts Blocker] No track found to block');
      return;
    }
    
    chrome.storage.sync.get({blockedTracks: [], autoSkipAfterBlock: true}, v => {
      const arr = v.blockedTracks || [];
      if (!arr.includes(track)) {
        arr.push(track);
        chrome.storage.sync.set({blockedTracks: arr}, () => {
          console.log('[Shorts Blocker] Blocked track:', track);
          label.textContent = 'Blocked';
          button.setAttribute('aria-label', 'Track blocked');
          button.style.opacity = '0.6';
          button.style.pointerEvents = 'none';
          
          // Auto-skip if enabled
          if (v.autoSkipAfterBlock) {
            console.log('[Shorts Blocker] Auto-skipping after block...');
            setTimeout(() => tryClickNext(), 300);
          }
        });
      } else {
        console.log('[Shorts Blocker] Track already blocked:', track);
        label.textContent = 'Blocked';
        button.style.opacity = '0.6';
        button.style.pointerEvents = 'none';
      }
    });
  });

  // Insert before the "Remix" button (last button) or append to end
  buttonBar.appendChild(wrapper);
}

function checkAndSkip() {
  if (!enabled || !isShortsUrl()) return;
  
  // Prevent excessive calls
  if (checkAndSkip.lastCall && Date.now() - checkAndSkip.lastCall < 100) return;
  checkAndSkip.lastCall = Date.now();
  
  // Always try to add the button first
  addTrackButton();
  
  // Try multiple methods to get track info
  let trackInfo = getTrackFromYtData();
  let trackStr = trackInfo?.full;
  
  // Fallback to DOM element text
  if (!trackStr) {
    const el = document.querySelector(S_EL);
    if (el) {
      trackStr = getText(el);
    }
  }
  
  // Update button state based on track detection
  if (!trackStr) {
    updateButtonState(false);
    return;
  }
  
  // Enable button since we have a track
  updateButtonState(true);
  
  // Prevent checking the same track multiple times
  if (trackStr === lastCheckedTrack) return;
  lastCheckedTrack = trackStr;
  
  console.log('[Shorts Blocker] Current track:', trackStr);

  if (matchesBlocked(trackStr)) {
    console.log('[Shorts Blocker] Track is blocked, processing...');
    
    // Try to dislike first (if enabled)
    if (autoDislike) {
      tryDislike();
      // Small delay before skipping to ensure dislike registers
      setTimeout(() => tryClickNext(), 300);
    } else {
      tryClickNext();
    }
  }
}

function setupObserver() {
  let observerTimeout = null;
  const obs = new MutationObserver(() => {
    // Debounce the observer calls to prevent excessive execution
    if (observerTimeout) return;
    observerTimeout = setTimeout(() => {
      observerTimeout = null;
      checkAndSkip();
    }, 100);
  });
  obs.observe(document.documentElement, {subtree: true, childList: true, characterData: true});
}

function loadState() {
  chrome.storage.sync.get({blockedTracks: [], enabled: true, autoDislike: false, autoSkipAfterBlock: true}, v => {
    blocked = v.blockedTracks || [];
    enabled = v.enabled;
    autoDislike = v.autoDislike;
    autoSkipAfterBlock = v.autoSkipAfterBlock;
    checkAndSkip();
  });
}

function onNav() {
  if (!isShortsUrl()) return;
  lastCheckedTrack = null; // Reset for new video
  
  // Remove old button to ensure fresh state
  const oldButton = document.querySelector(".block-track-btn-wrapper");
  if (oldButton) {
    oldButton.remove();
  }
  
  // Try to add button multiple times with delays
  setTimeout(() => addTrackButton(), 50);
  setTimeout(() => addTrackButton(), 300);
  setTimeout(() => addTrackButton(), 800);
  
  // Check and skip
  setTimeout(checkAndSkip, 50);
  setTimeout(checkAndSkip, 500);
  setTimeout(checkAndSkip, 1500);
}

function init() {
  loadState();
  setupObserver();
  window.addEventListener("yt-navigate-finish", onNav, true);
  window.addEventListener("yt-page-data-updated", onNav, true);
  const wrap = (fn) => function() { fn.apply(this, arguments); onNav(); };
  history.pushState = wrap(history.pushState.bind(history));
  history.replaceState = wrap(history.replaceState.bind(history));
  chrome.storage.onChanged.addListener(ch => {
    if (ch.blockedTracks) blocked = ch.blockedTracks.newValue || [];
    if (ch.enabled) enabled = ch.enabled.newValue;
    if (ch.autoDislike) autoDislike = ch.autoDislike.newValue;
    if (ch.autoSkipAfterBlock) autoSkipAfterBlock = ch.autoSkipAfterBlock.newValue;
    checkAndSkip();
  });
}

init();