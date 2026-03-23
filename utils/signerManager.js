import { LocalSigner } from "@flowindex/flow-signer";
import { signFlowTransaction } from "@flowindex/flow-passkey";
import { KEY_TYPE, SIGN_ALGO, HASH_ALGO } from "./constants";

const FLOWINDEXURL = process.env.flowindexUrl || "https://flowindex.io";

/**
 * Create a signer based on type and config.
 *
 * @param {'passkey' | 'seedPhrase' | 'privateKey'} type
 * @param {object} config
 *   - For passkey:    { credentialId, address?, keyIndex? }
 *   - For seedPhrase: { mnemonic, address?, keyIndex?, sigAlgo?, hashAlgo? }
 *   - For privateKey: { privateKey, address?, keyIndex?, sigAlgo?, hashAlgo? }
 * @returns {{ type, signer?, sign, getPublicKey?, info }}
 */
const createSigner = async (type, config = {}) => {
  const signerConfig = {
    flowindexUrl: FLOWINDEXURL,
    network: process.env.network || "mainnet",
  };

  if (type === KEY_TYPE.PASSKEY || type === "passkey") {
    // Passkey signer — signs via WebAuthn (FLIP-264), no LocalSigner needed
    return {
      type: KEY_TYPE.PASSKEY,
      credentialId: config.credentialId,
      sign: async (messageHex) => {
        const rpId = window.location.hostname;
        return await signFlowTransaction({
          messageHex,
          credentialId: config.credentialId,
          rpId,
        });
      },
      info: () => ({
        type: "passkey",
        flowAddress: config.address,
        keyIndex: config.keyIndex ?? 0,
        sigAlgo: SIGN_ALGO.P256,
        hashAlgo: HASH_ALGO.SHA256,
      }),
    };
  }

  if (type === KEY_TYPE.SEED_PHRASE || type === "seedPhrase") {
    const signer = new LocalSigner(signerConfig, {
      mnemonic: config.mnemonic,
      address: config.address,
      keyIndex: config.keyIndex,
      sigAlgo: config.sigAlgo || "ECDSA_secp256k1",
      hashAlgo: config.hashAlgo || "SHA2_256",
    });
    await signer.init();
    return {
      type: KEY_TYPE.SEED_PHRASE,
      signer,
      sign: (messageHex) => signer.signFlowTransaction(messageHex),
      getPublicKey: () => signer.getFlowPublicKey(),
      info: () => signer.info(),
    };
  }

  if (type === KEY_TYPE.PRIVATE_KEY || type === "privateKey") {
    const signer = new LocalSigner(signerConfig, {
      privateKey: config.privateKey,
      address: config.address,
      keyIndex: config.keyIndex,
      sigAlgo: config.sigAlgo || "ECDSA_P256",
      hashAlgo: config.hashAlgo || "SHA2_256",
    });
    await signer.init();
    return {
      type: KEY_TYPE.PRIVATE_KEY,
      signer,
      sign: (messageHex) => signer.signFlowTransaction(messageHex),
      getPublicKey: () => signer.getFlowPublicKey(),
      info: () => signer.info(),
    };
  }

  throw new Error(`Unknown signer type: ${type}`);
};

export { createSigner };
