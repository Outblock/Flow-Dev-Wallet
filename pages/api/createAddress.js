// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import * as fcl from "@onflow/fcl";
import { ec as EC } from "elliptic";
import { sha256 } from "../../modules/Crypto";

const EMULATOR_CREATE_ACCOUNT_TX = `
transaction(publicKey: String, signatureAlgorithm: UInt8, hashAlgorithm: UInt8, weight: UFix64) {
  prepare(signer: auth(BorrowValue) &Account) {
    let key = PublicKey(
      publicKey: publicKey.decodeHex(),
      signatureAlgorithm: SignatureAlgorithm(rawValue: signatureAlgorithm)
        ?? panic("Invalid signature algorithm")
    )
    let account = Account(payer: signer)
    account.keys.add(
      publicKey: key,
      hashAlgorithm: HashAlgorithm(rawValue: hashAlgorithm)
        ?? panic("Invalid hash algorithm"),
      weight: weight
    )
  }
}
`;

const HASH_ALGO_MAP = {
  SHA2_256: 1,
  SHA3_256: 3,
};

const SIG_ALGO_MAP = {
  ECDSA_P256: 1,
  ECDSA_secp256k1: 2,
};

async function createAccountOnEmulator({ publicKey, signatureAlgorithm, hashAlgorithm, weight }) {
  const emulatorPrivateKey = process.env.emulatorPrivateKey;
  const emulatorAddress = process.env.emulatorServiceAddress;

  const sigAlgoValue = SIG_ALGO_MAP[signatureAlgorithm] || 1;
  const hashAlgoValue = HASH_ALGO_MAP[hashAlgorithm] || 1;

  const signFn = async (signable) => {
    const ec = new EC("p256");
    const messageHash = await sha256(Buffer.from(signable.message, "hex"));
    const key = ec.keyFromPrivate(Buffer.from(emulatorPrivateKey, "hex"));
    const sig = key.sign(new Uint8Array(messageHash));
    const n = 32;
    const r = sig.r.toArrayLike(Buffer, "be", n);
    const s = sig.s.toArrayLike(Buffer, "be", n);
    return {
      addr: fcl.withPrefix(emulatorAddress),
      keyId: 0,
      signature: Buffer.concat([r, s]).toString("hex"),
    };
  };

  const authz = (account) => ({
    ...account,
    tempId: `${emulatorAddress}-0`,
    addr: fcl.sansPrefix(emulatorAddress),
    keyId: 0,
    signingFunction: signFn,
  });

  const txId = await fcl.mutate({
    cadence: EMULATOR_CREATE_ACCOUNT_TX,
    args: (arg, t) => [
      arg(publicKey, t.String),
      arg(String(sigAlgoValue), t.UInt8),
      arg(String(hashAlgoValue), t.UInt8),
      arg(String(weight) + ".0", t.UFix64),
    ],
    proposer: authz,
    payer: authz,
    authorizations: [authz],
    limit: 1000,
  });

  return txId;
}

export default async function createAddress(req, res) {
  const {
    publicKey,
    network,
    hashAlgorithm = "SHA2_256",
    signatureAlgorithm = "ECDSA_P256",
    weight = 1000,
  } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  // Server-side only env vars (not exposed to browser)
  const apikey = process.env.apikey;
  const payerPrivateKey = process.env.payerPrivateKey;

  if (network === "emulator") {
    try {
      const txId = await createAccountOnEmulator({
        publicKey,
        signatureAlgorithm,
        hashAlgorithm,
        weight,
      });
      console.log("createAddress (emulator) ==>", txId);
      return res.status(200).json({ txId });
    } catch (err) {
      console.error("createAddress emulator error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (!apikey) {
    return res.status(400).json({ error: "API key not configured. Set 'apikey' in .env" });
  }

  try {
    const url = `https://openapi.lilico.app/v1/address${
      network == "testnet" ? "/testnet" : ""
    }`;
    console.log("createAddress url ==>", url);
    const result = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: apikey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        publicKey,
        weight,
        hashAlgorithm,
        signatureAlgorithm,
      }),
    });
    const json = await result.json();
    console.log("createAddress ==>", json);
    if (!json.data || !json.data.txId) {
      return res.status(500).json({ error: json.message || "Account creation failed" });
    }
    res.status(200).json({ txId: json.data.txId });
  } catch (err) {
    console.error("createAddress error:", err);
    res.status(500).json({ error: err.message });
  }
}
