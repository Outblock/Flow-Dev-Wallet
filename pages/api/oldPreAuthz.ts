// // Next.js API route support: https://nextjs.org/docs/api-routes/introduction
// import {ec as EC} from "elliptic";
// import crypto from 'crypto';
// const RLP = require('rlp');

// function arrToStringArr(arr) {
//   return arr.map((a) => {
//     if (Array.isArray(a)) {
//       return arrToStringArr(a);
//     }
//     return withPrefix(Buffer.from(a).toString("hex"));
//   });
// }

// function sansPrefix(address) {
//   if (address == null) return null;
//   return address.replace(/^0x/, "").replace(/^Fx/, "");
// }

// function removeTag(address) {
//   if (address == null) return null;
//   return address.replace(
//     /^464c4f572d56302e302d7472616e73616374696f6e0000000000000000000000/,
//     "0x"
//   );
// }

// function withPrefix(address) {
//   if (address == null) return null;
//   return "0x" + sansPrefix(address);
// }

// const rightPaddedHexBuffer = (value, pad) =>
//   Buffer.from(value.padEnd(pad * 2, "0"), "hex");

// const TRANSACTION_DOMAIN_TAG = rightPaddedHexBuffer(
//   Buffer.from("FLOW-V0.0-transaction").toString("hex"),
//   32
// ).toString("hex");
// const prependTransactionDomainTag = (tx) => TRANSACTION_DOMAIN_TAG + tx;

// const sign = async (
//     signableMessage,
//     network
// ) => {
//   const ec = new EC("p256");
//   const messageHash = await secp.utils.sha256(
//       Buffer.from(signableMessage, "hex")
//   );

//   const privateKey = process.env.payerPrivateKey;
//   //   const signature = await secp.sign(messageHash, privateKey);
//   //   const realSignature = secp.Signature.fromHex(signature).toCompactHex();

//   const key = ec.keyFromPrivate(Buffer.from(privateKey, "hex"));
//   const sig = key.sign(messageHash);
//   const n = 32;
//   const r = sig.r.toArrayLike(Buffer, "be", n);
//   const s = sig.s.toArrayLike(Buffer, "be", n);
//   return Buffer.concat([r, s]).toString("hex");
// };

// export default async function oldPreAuthz(req, res) {
//   const msg = req.body.message.envelope_message;
//   const encodedMessage = removeTag(msg);
//   // functions.logger.info('encodedMessage ->', encodedMessage)
//   const decoded = arrToStringArr(RLP.decode(encodedMessage));
//   functions.logger.info(decoded);
//   const txDecode = decoded[0];
//   const sigDecode = decoded[1];

//   const reOrderSig = sigDecode.sort((a, b) => {
//     const signA = parseInt(a[0], 16) || 0;
//     const signB = parseInt(b[0], 16) || 0;

//     const keyIdA = parseInt(a[1], 16) || 0;
//     const keyIdB = parseInt(b[1], 16) || 0;

//     if (signA === signB) {
//       return keyIdA > keyIdB;
//     } else if (signA > signB) {
//       return 1;
//     } else {
//       return -1;
//     }
//   });
//   // functions.logger.info('reOrderSig ->', reOrderSig)

//   const roles = {
//     proposal: txDecode[4],
//     payer: txDecode[7],
//     authorizers: txDecode[8],
//   };

//   console.log("roles ->", roles);
//   const reEncodeMesssage = Buffer.from(
//     RLP.encode([txDecode, reOrderSig])
//   ).toString("hex");
//   const reTransactionEncoded = prependTransactionDomainTag(reEncodeMesssage);
//   console.log("reTransactionEncoded ->", reTransactionEncoded);
//   console.log("isSame ->", reTransactionEncoded === msg);

//   const network = req.headers?.network;
//   const verified = verifyTrx(roles, network);
//   if (!verified) {
//     res.status(403).send({ error: "verify transaction failed" });
//     return;
//   }

//   const signature = await sign(reTransactionEncoded, network);
//   res.json({
//     envelopeSigs: {
//       address: process.env.payerAddress,
//       keyId: process.env.payerKeyIndex,
//       sig: signature,
//     },
//   });
// }
