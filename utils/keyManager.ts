import { deriveEvmAddress, deriveEvmAddressFromMnemonic } from "./evm";
import { FLOW_BIP44_PATH, KEY_TYPE } from "./constants";

export interface KeyInfo {
  type: string;
  pk: string;
  pubK: string;
  keyIndex: number;
  signAlgo: string;
  hashAlgo: string;
  mnemonic?: string;
  evmAddress: string;
  smartWalletAddress?: string;
}

/**
 * Generate a random private key and derive full keyInfo.
 */
export async function generatePrivateKey(sigAlgo: string = "ECDSA_secp256k1"): Promise<KeyInfo> {
  const pk = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return deriveKeyInfo("privateKey", { pk, sigAlgo });
}

/**
 * Generate a BIP-39 mnemonic and derive full keyInfo.
 */
export async function generateMnemonic(sigAlgo: string = "ECDSA_secp256k1"): Promise<KeyInfo> {
  const { generateMnemonic: gen } = await import("@scure/bip39");
  const { wordlist } = await import("@scure/bip39/wordlists/english.js");
  const mnemonic = gen(wordlist);
  return deriveKeyInfo("seedPhrase", { mnemonic, sigAlgo });
}

interface DeriveKeyOpts {
  pk?: string;
  mnemonic?: string;
  sigAlgo?: string;
  hashAlgo?: string;
}

/**
 * Universal key derivation — returns a complete keyInfo object.
 */
export async function deriveKeyInfo(
  type: "privateKey" | "seedPhrase",
  { pk, mnemonic, sigAlgo = "ECDSA_secp256k1", hashAlgo = "SHA2_256" }: DeriveKeyOpts
): Promise<KeyInfo> {
  const isSecp = sigAlgo === "ECDSA_secp256k1";

  if (type === "seedPhrase" || mnemonic) {
    const { mnemonicToSeedSync } = await import("@scure/bip39");
    const { HDKey } = await import("@scure/bip32");
    const seed = mnemonicToSeedSync(mnemonic!);
    const hdKey = HDKey.fromMasterSeed(seed);
    const child = hdKey.derive(FLOW_BIP44_PATH);
    pk = toHex(child.privateKey!);

    let pubK: string;
    if (isSecp) {
      const { secp256k1 } = await import("@noble/curves/secp256k1.js");
      pubK = toHex(secp256k1.getPublicKey(child.privateKey!, false)).slice(2);
    } else {
      const { p256 } = await import("@noble/curves/nist.js");
      pubK = toHex(p256.getPublicKey(child.privateKey!, false)).slice(2);
    }
    const evmAddress = await deriveEvmAddressFromMnemonic(mnemonic!);
    return {
      type: KEY_TYPE.SEED_PHRASE,
      pk,
      pubK,
      keyIndex: 0,
      signAlgo: sigAlgo,
      hashAlgo,
      mnemonic,
      evmAddress,
    };
  }

  if (type === "privateKey" || pk) {
    const pkBytes = hexToBytes(pk!);
    const { p256 } = await import("@noble/curves/nist.js");
    const { secp256k1 } = await import("@noble/curves/secp256k1.js");
    const pubK = isSecp
      ? toHex(secp256k1.getPublicKey(pkBytes, false)).slice(2)
      : toHex(p256.getPublicKey(pkBytes, false)).slice(2);
    const evmAddress = await deriveEvmAddress(pk!);
    return {
      type: KEY_TYPE.PRIVATE_KEY,
      pk: pk!,
      pubK,
      keyIndex: 0,
      signAlgo: sigAlgo,
      hashAlgo,
      evmAddress,
    };
  }

  throw new Error("Must provide pk or mnemonic");
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return new Uint8Array(clean.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}
