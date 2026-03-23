import { p256 } from "@noble/curves/nist.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { findAddressWithKey } from "./findAddressWithPubKey";
import { FLOW_BIP44_PATH } from "./constants";
import { deriveEvmAddress } from "./evm";

interface PubKeyEntry {
  pubK: string;
  pk: string;
}

interface PubKeyTuple {
  P256: PubKeyEntry;
  SECP256K1: PubKeyEntry;
}

interface AccountInfo {
  address: string;
  keyIndex: number;
  weight: number;
  hashAlgo: string;
  signAlgo: string;
  pubK: string;
  pk?: string;
  evmAddress?: string;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const pk2PubKey = (pk: string): PubKeyTuple => {
  const privBytes = hexToBytes(pk);
  const p256PubK = bytesToHex(p256.getPublicKey(privBytes, false)).slice(2); // strip 04
  const secp256PubK = bytesToHex(secp256k1.getPublicKey(privBytes, false)).slice(2); // strip 04
  return {
    P256: { pubK: p256PubK, pk },
    SECP256K1: { pubK: secp256PubK, pk },
  };
};

const findAddress = async (pubKTuple: PubKeyTuple, address?: string): Promise<AccountInfo[] | null> => {
  const { P256, SECP256K1 } = pubKTuple;
  const p256Accounts = (await findAddressWithKey(P256.pubK, address)) || [];
  const sepc256k1Accounts =
    (await findAddressWithKey(SECP256K1.pubK, address)) || [];
  const pA = p256Accounts.map((s: AccountInfo) => ({ ...s, pk: P256.pk }));
  const pS = sepc256k1Accounts.map((s: AccountInfo) => ({ ...s, pk: SECP256K1.pk }));
  const accounts = pA.concat(pS);

  if (!accounts || accounts.length === 0) {
    return null;
  }
  return accounts;
};

export const findAddressWithPK = async (pk: string, address?: string): Promise<AccountInfo[] | null> => {
  const pubKTuple = pk2PubKey(pk);
  const accounts = await findAddress(pubKTuple, address);
  if (!accounts) return null;
  const evmAddress = await deriveEvmAddress(pk);
  return accounts.map((a) => ({ ...a, evmAddress }));
};

const seed2PubKey = (seed: string): PubKeyTuple => {
  const seedBytes = mnemonicToSeedSync(seed);
  const hdKey = HDKey.fromMasterSeed(seedBytes);
  const child = hdKey.derive(FLOW_BIP44_PATH);
  if (!child.privateKey) throw new Error("Failed to derive key from mnemonic");
  const pk = bytesToHex(child.privateKey);
  // secp256k1 is the default curve for BIP-44 derived Flow keys
  const secp256PubK = bytesToHex(secp256k1.getPublicKey(child.privateKey, false)).slice(2);
  // Also compute P256 for completeness
  const p256PubK = bytesToHex(p256.getPublicKey(child.privateKey, false)).slice(2);
  return {
    P256: { pubK: p256PubK, pk },
    SECP256K1: { pubK: secp256PubK, pk },
  };
};

export const findAddressWithSeed = async (seed: string, address?: string): Promise<AccountInfo[] | null> => {
  const pubKTuple = seed2PubKey(seed);
  const accounts = await findAddress(pubKTuple, address);
  if (!accounts) return null;
  const { deriveEvmAddressFromMnemonic } = await import("./evm");
  const evmAddress = await deriveEvmAddressFromMnemonic(seed);
  return accounts.map((a) => ({ ...a, evmAddress }));
};

export { pk2PubKey, seed2PubKey };
