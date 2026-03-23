import type { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";

export const cors = Cors({
    methods: ["GET", "HEAD", "POST"],
  });

  export function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function): Promise<void> {
    return new Promise((resolve, reject) => {
      fn(req, res, (result: any) => {
        if (result instanceof Error) {
          return reject(result);
        }

        return resolve(result);
      });
    });
  }
