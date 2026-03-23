import {
  createPasskeyCredential,
  getPasskeyAssertion,
  signFlowTransaction,
  bytesToHex,
  hexToBytes,
} from "@flowindex/flow-passkey";
import { KEY_TYPE, SIGN_ALGO, HASH_ALGO } from "./constants";
import { addCredential, readSettings } from "../modules/settings";
import { getRandomBytes } from ".";

/**
 * Create a new passkey credential via WebAuthn (FLIP-264).
 * Returns credentialId, public key hex, and raw credential result.
 */
const createPasskey = async (name) => {
  const rpId = window.location.hostname;
  const result = await createPasskeyCredential({
    rpId,
    rpName: rpId,
    challenge: getRandomBytes(32),
    userId: getRandomBytes(16),
    userName: name,
  });

  // Store credential info in settings for later retrieval
  addCredential(
    readSettings(),
    { name },
    result.credentialId,
    result.publicKeySec1Hex,
    result.attestationResponse
  );

  // Strip the 04 prefix from the uncompressed SEC1 public key
  const pubK = result.publicKeySec1Hex.replace(/^04/, "");

  return {
    credentialId: result.credentialId,
    publicKeySec1Hex: result.publicKeySec1Hex,
    pubK,
    result,
    userName: name,
  };
};

/**
 * Sign in with an existing passkey via WebAuthn assertion.
 */
const loginWithPasskey = async (credentialId) => {
  const rpId = window.location.hostname;
  const options = {
    rpId,
    challenge: getRandomBytes(32),
  };

  if (credentialId) {
    options.allowCredentials = [{ id: credentialId, type: "public-key" }];
  }

  const assertion = await getPasskeyAssertion(options);
  return assertion;
};

/**
 * Get key info from a passkey registration result.
 * With FLIP-264, the passkey signs directly — no entropy/HD derivation.
 */
const getPKfromRegister = (registerResult) => {
  return {
    type: KEY_TYPE.PASSKEY,
    credentialId: registerResult.credentialId,
    pubK: registerResult.pubK,
    keyIndex: 0,
    signAlgo: SIGN_ALGO.P256,
    hashAlgo: HASH_ALGO.SHA256,
  };
};

/**
 * Get key info from a passkey login (assertion) result.
 * With FLIP-264, returns credential info for signing — no key derivation.
 */
const getPKfromLogin = (assertionResult) => {
  return {
    type: KEY_TYPE.PASSKEY,
    credentialId: assertionResult.credentialId,
    keyIndex: 0,
    signAlgo: SIGN_ALGO.P256,
    hashAlgo: HASH_ALGO.SHA256,
  };
};

export {
  createPasskey,
  loginWithPasskey,
  loginWithPasskey as getPasskey,
  getPKfromLogin,
  getPKfromRegister,
  signFlowTransaction,
};
