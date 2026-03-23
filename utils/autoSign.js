/**
 * Auto-Sign security model:
 *
 * 1. Settings toggle must be ON (settings_config.autoSign === true)
 * 2. URL param ?autoSign=true must also be present in the current session
 * 3. The requesting origin must be in the allowed origins whitelist
 *
 * Default whitelist: localhost (any port)
 */

const SETTINGS_KEY = "settings_config";
const WHITELIST_KEY = "autoSign_whitelist";
const SESSION_KEY = "autoSign_session"; // localStorage — shared with popups

const DEFAULT_WHITELIST = ["localhost", "127.0.0.1"];

/**
 * Get the auto-sign origin whitelist.
 */
export function getWhitelist() {
  try {
    const saved = JSON.parse(localStorage.getItem(WHITELIST_KEY) || "null");
    return Array.isArray(saved) ? saved : [...DEFAULT_WHITELIST];
  } catch {
    return [...DEFAULT_WHITELIST];
  }
}

/**
 * Save the auto-sign origin whitelist.
 */
export function setWhitelist(origins) {
  localStorage.setItem(WHITELIST_KEY, JSON.stringify(origins));
}

/**
 * Mark that the current session was started with ?autoSign=true.
 * Stored in localStorage (shared with popups on the same origin).
 * Expires after 24 hours.
 */
export function markSessionAutoSign() {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
}

/**
 * Check if auto-sign was activated via URL in the current session.
 * Valid for 24 hours from activation.
 */
export function hasSessionAutoSign() {
  if (typeof window === "undefined") return false;
  try {
    const data = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!data?.ts) return false;
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24h
    return Date.now() - data.ts < MAX_AGE;
  } catch {
    return false;
  }
}

/**
 * Clear the auto-sign session marker.
 */
export function clearSessionAutoSign() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Check if an origin is allowed for auto-sign.
 * @param {string} origin - The origin to check (e.g., "localhost", "myapp.com")
 */
export function isOriginAllowed(origin) {
  if (!origin) return false;
  const whitelist = getWhitelist();
  // Extract hostname from origin URL if needed
  let hostname = origin;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    // Already a hostname
  }
  return whitelist.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );
}

/**
 * Check if auto-sign should be active for a given popup context.
 * Requires ALL conditions:
 * 1. store.autoSign is true (settings toggle)
 * 2. Session was started with ?autoSign=true URL param
 * 3. Wallet type is NOT passkey (WebAuthn requires user interaction)
 * 4. (optional) requestOrigin is in whitelist — if provided
 *
 * @param {object} store - The wallet store
 * @param {string} [requestOrigin] - The dApp origin requesting the signature
 */
export function shouldAutoSign(store, requestOrigin) {
  if (!store?.autoSign) return false;
  if (!hasSessionAutoSign()) return false;
  // Passkey wallets require WebAuthn user gesture — cannot auto-sign
  if (store.keyInfo?.type === "Passkey") return false;
  if (requestOrigin && !isOriginAllowed(requestOrigin)) return false;
  return true;
}
