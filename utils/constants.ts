const FLOW_BIP44_PATH = "m/44'/539'/0'/0/0";

const KEY_TYPE = {
    PASSKEY: 'Passkey',
    SEED_PHRASE: 'SeedPhrase',
    PRIVATE_KEY: 'PrivateKey',
    KEYSTORE: 'Keystore',
} as const;

const SIGN_ALGO = {
    P256: 'ECDSA_P256',
    SECP256K1 : 'ECDSA_secp256k1'
} as const;

const HASH_ALGO = {
    SHA256: 'SHA2_256',
    SHA3_256 : 'SHA3_256'
} as const;

export type KeyType = typeof KEY_TYPE[keyof typeof KEY_TYPE];
export type SignAlgo = typeof SIGN_ALGO[keyof typeof SIGN_ALGO];
export type HashAlgo = typeof HASH_ALGO[keyof typeof HASH_ALGO];

export { FLOW_BIP44_PATH, KEY_TYPE, SIGN_ALGO, HASH_ALGO }
