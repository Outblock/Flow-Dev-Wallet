import type { NextApiRequest, NextApiResponse } from "next";
import { cors, runMiddleware } from './cors'

export default async function preAuthz(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors);
  const { address, keyId } = req.query as { address: string; keyId: string };
  if (!address || !keyId) {
    res.status(400).json({message: 'Invalid Request'})
    return
  }
  res.status(200).json({
    f_type: "PollingResponse",
    f_vsn: "1.0.0",
    status: "APPROVED",
    data: {
      f_type: "PreAuthzResponse",
      f_vsn: "1.0.0",
      proposer: {
        f_type: "Service",
        f_vsn: "1.0.0",
        type: "authz",
        uid: `fpk#authz`,
        method: "POP/RPC",
        identity: { address, keyId: parseInt(keyId) },
        network: process.env.network,
        endpoint: `${process.env.host}/authz`,
      },
      payer: [
        {
          f_type: "Service",
          f_vsn: "1.0.0",
          type: "authz",
          uid: `fpk#authz`,
          method: "HTTP/POST",
          identity: { address: process.env.payerAddress, keyId: parseInt(process.env.payerKeyIndex!) },
          network: process.env.network,
          endpoint: `${process.env.host}/api/signAsPayer`,
        },
      ],
      authorization: [
        {
          f_type: "Service",
          f_vsn: "1.0.0",
          type: "authz",
          uid: `fpk#authz`,
          method: "POP/RPC",
          identity: { address, keyId: parseInt(keyId) },
          network: process.env.network,
          endpoint: `${process.env.host}/authz`,
        },
      ],
    },
  });
}
