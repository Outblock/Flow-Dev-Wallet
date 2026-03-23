/**
 * AES-GCM encryption for local key storage.
 * The encryption key is randomly generated once and stored in localStorage.
 */

const STORAGE_KEY = "fdw_enc_key";

async function getOrCreateKey() {
  let raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const keyData = JSON.parse(raw);
    return await crypto.subtle.importKey(
      "jwk",
      keyData,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  }
  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("jwk", key);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exported));
  return key;
}

/**
 * Encrypt a string with AES-GCM. Returns base64 string of iv + ciphertext.
 */
export async function encrypt(plaintext) {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  // Concat iv + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64 string (iv + ciphertext) with AES-GCM.
 */
export async function decrypt(b64) {
  const key = await getOrCreateKey();
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}
