import { signFlowTransaction } from "@flowindex/flow-passkey";
import { LocalSigner } from "@flowindex/flow-signer";
import { HASH_ALGO, KEY_TYPE, SIGN_ALGO } from "./constants";

const DOMAIN_TAG = {
    tx: "FLOW-V0.0-transaction",
    user: "FLOW-V0.0-user",
    acct: "FCL-ACCOUNT-PROOF-V0.0"
}

const rightPaddedHexBuffer = (value, pad) =>
  Buffer.from(value.padEnd(pad * 2, "0"), "hex")

const domainTag = (tag) => {
    return rightPaddedHexBuffer(
        Buffer.from(tag).toString("hex"),
        32
    ).toString("hex")
}

/**
 * Sign a hex-encoded message. Returns { signature, extensionData? }.
 * - Passkey: returns extensionData for FLIP-264
 * - Local key: returns signature only
 */
const signWithKey = async (store, message) => {
    // Passkey signing via FLIP-264
    if (!store.keyInfo || store.keyInfo.type === KEY_TYPE.PASSKEY) {
        return await signWithPassKey(store, message);
    }

    // Local key signing via flow-signer LocalSigner
    const { signAlgo, hashAlgo, pk } = store.keyInfo;
    const signerConfig = {
        flowindexUrl: process.env.flowindexUrl || "https://flowindex.io",
        network: process.env.network || "mainnet",
    };
    const signer = new LocalSigner(signerConfig, {
        privateKey: pk,
        sigAlgo: signAlgo || "ECDSA_P256",
        hashAlgo: hashAlgo || "SHA2_256",
    });
    await signer.init();
    const result = await signer.signFlowTransaction(message);
    return { signature: result.signature };
}

/**
 * Sign with passkey using FLIP-264 real WebAuthn signing.
 * Returns { signature, extensionData } for FLIP-264 compatibility.
 */
const signWithPassKey = async (store, message) => {
    const credentialId = store.keyInfo?.credentialId || store.id || "";
    const rpId = window.location.hostname;

    const result = await signFlowTransaction({
        messageHex: message,
        credentialId,
        rpId,
    });

    return {
        signature: result.signature,
        extensionData: result.extensionData,
    };
}

const signUserMsg = async (store, message) => {
    return await signWithKey(store, domainTag(DOMAIN_TAG.user) + message)
}

const signAcctProof = async (store, message) => {
    return await signWithKey(store, domainTag(DOMAIN_TAG.acct) + message)
}

export { signWithPassKey, signUserMsg, signAcctProof, signWithKey };
