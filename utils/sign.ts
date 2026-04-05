import { signFlowTransaction } from "@flowindex/flow-passkey";
import { KEY_TYPE } from "./constants";

interface SignStore {
    id?: string;
    keyInfo?: {
        type?: string;
        credentialId?: string;
        signAlgo?: string;
        hashAlgo?: string;
        pk?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface SignResult {
    signature: string;
    extensionData?: unknown;
}

const DOMAIN_TAG = {
    tx: "FLOW-V0.0-transaction",
    user: "FLOW-V0.0-user",
    acct: "FCL-ACCOUNT-PROOF-V0.0"
} as const;

const rightPaddedHexBuffer = (value: string, pad: number): Buffer =>
  Buffer.from(value.padEnd(pad * 2, "0"), "hex")

const domainTag = (tag: string): string => {
    return rightPaddedHexBuffer(
        Buffer.from(tag).toString("hex"),
        32
    ).toString("hex")
}

/**
 * Sign a hex message with a raw private key using ECDSA.
 * Uses @noble/hashes for hashing and @noble/curves for signing —
 * both are pure JS with no Web Crypto or network dependency.
 * Supports ECDSA_P256 and ECDSA_secp256k1 with SHA2_256 or SHA3_256.
 */
async function signEcdsa(pk: string, message: string, sigAlgo: string, hashAlgo: string): Promise<string> {
    const msgBytes = Buffer.from(message, "hex");

    let hashBytes: Uint8Array;
    if (hashAlgo === "SHA3_256") {
        const { sha3_256 } = await import("@noble/hashes/sha3.js");
        hashBytes = sha3_256(msgBytes);
    } else {
        const { sha256 } = await import("@noble/hashes/sha2.js");
        hashBytes = sha256(msgBytes);
    }

    const pkBytes = Uint8Array.from(Buffer.from(pk, "hex"));
    let sigBytes: Uint8Array;
    if (sigAlgo === "ECDSA_secp256k1") {
        const { secp256k1 } = await import("@noble/curves/secp256k1.js");
        sigBytes = secp256k1.sign(hashBytes, pkBytes);
    } else {
        const { p256 } = await import("@noble/curves/nist.js");
        sigBytes = p256.sign(hashBytes, pkBytes);
    }
    // sign() returns compact r||s (64 bytes) — convert directly to hex
    return Buffer.from(sigBytes).toString("hex");
}

/**
 * Sign a hex-encoded message. Returns { signature, extensionData? }.
 * - Passkey: returns extensionData for FLIP-264
 * - Local key: returns signature only
 */
const signWithKey = async (store: SignStore, message: string): Promise<SignResult> => {
    // Passkey signing via FLIP-264
    if (!store.keyInfo || store.keyInfo.type === KEY_TYPE.PASSKEY) {
        return await signWithPassKey(store, message);
    }

    // Local key signing — pure ECDSA, no network calls.
    const { signAlgo, hashAlgo, pk } = store.keyInfo;
    const signature = await signEcdsa(pk, message, signAlgo || "ECDSA_P256", hashAlgo || "SHA2_256");
    return { signature };
}

/**
 * Sign with passkey using FLIP-264 real WebAuthn signing.
 * Returns { signature, extensionData } for FLIP-264 compatibility.
 */
const signWithPassKey = async (store: SignStore, message: string): Promise<SignResult> => {
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

const signUserMsg = async (store: SignStore, message: string): Promise<SignResult> => {
    return await signWithKey(store, domainTag(DOMAIN_TAG.user) + message)
}

const signAcctProof = async (store: SignStore, message: string): Promise<SignResult> => {
    return await signWithKey(store, domainTag(DOMAIN_TAG.acct) + message)
}

export { signWithPassKey, signUserMsg, signAcctProof, signWithKey };
