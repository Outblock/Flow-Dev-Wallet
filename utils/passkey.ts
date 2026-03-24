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

interface PasskeyCreateResult {
  credentialId: string;
  publicKeySec1Hex: string;
  pubK: string;
  result: Awaited<ReturnType<typeof createPasskeyCredential>>;
  userName: string;
}

interface PasskeyKeyInfo {
  type: typeof KEY_TYPE.PASSKEY;
  credentialId: string;
  pubK?: string;
  publicKeySec1Hex?: string;
  keyIndex: number;
  signAlgo: typeof SIGN_ALGO.P256;
  hashAlgo: typeof HASH_ALGO.SHA256;
  smartWalletAddress?: string;
}

/**
 * Create a new passkey credential via WebAuthn (FLIP-264).
 * Returns credentialId, public key hex, and raw credential result.
 */
const createPasskey = async (name: string): Promise<PasskeyCreateResult> => {
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
    { name, displayName: name } as any,
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
const loginWithPasskey = async (credentialId?: string) => {
  const rpId = window.location.hostname;
  const options: any = {
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
const getPKfromRegister = (registerResult: PasskeyCreateResult): PasskeyKeyInfo => {
  return {
    type: KEY_TYPE.PASSKEY,
    credentialId: registerResult.credentialId,
    pubK: registerResult.pubK,
    publicKeySec1Hex: registerResult.publicKeySec1Hex,
    keyIndex: 0,
    signAlgo: SIGN_ALGO.P256,
    hashAlgo: HASH_ALGO.SHA256,
  };
};

/**
 * Get key info from a passkey login (assertion) result.
 * With FLIP-264, returns credential info for signing — no key derivation.
 */
const getPKfromLogin = (assertionResult: { credentialId: string }): PasskeyKeyInfo => {
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
