import type { NextApiRequest, NextApiResponse } from "next";
import { ec as EC } from "elliptic";
import { sha256 } from "../../modules/Crypto";
import { cors, runMiddleware } from "./cors";

const isEmulator = (): boolean => process.env.network === "emulator";

const getPayerPrivateKey = (): string => {
  if (isEmulator()) {
    return process.env.emulatorPrivateKey!;
  }
  return process.env.payerPrivateKey!;
};

const getPayerAddress = (): string => {
  if (isEmulator()) {
    return process.env.emulatorServiceAddress!;
  }
  return process.env.payerAddress!;
};

const getPayerKeyIndex = (): number => {
  if (isEmulator()) {
    return 0;
  }
  return parseInt(process.env.payerKeyIndex!);
};

const sign = async (signableMessage: string): Promise<string> => {
  const ec = new EC("p256");
  const messageHash = await sha256(Buffer.from(signableMessage, "hex"));
  const privateKey = getPayerPrivateKey();
  const key = ec.keyFromPrivate(Buffer.from(privateKey, "hex"));
  const sig = key.sign(new Uint8Array(messageHash));
  const n = 32;
  const r = sig.r.toArrayLike(Buffer, "be", n);
  const s = sig.s.toArrayLike(Buffer, "be", n);
  return Buffer.concat([r, s]).toString("hex");
};

export default async function preAuthz(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors);
  // TODO: ADD check
  const { message } = req.body;
  res.status(200).json({
    f_type: "PollingResponse",
    f_vsn: "1.0.0",
    status: "APPROVED",
    reason: null,
    data: {
      f_type: "CompositeSignature",
      f_vsn: "1.0.0",
      addr: getPayerAddress(),
      keyId: getPayerKeyIndex(),
      network: process.env.network,
      signature: await sign(message),
    },
  });
}
