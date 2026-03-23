import type { NextApiRequest, NextApiResponse } from "next";

interface KeyIndexEntry {
  address: string;
  key_index?: number;
  keyIndex?: number;
  revoked?: boolean;
  weight?: number;
}

async function queryFlowIndex(publicKey: string, network?: string): Promise<{ address: string; keyIndex: number }[] | null> {
    const net = network || process.env.network || "testnet";
    const flowindexUrl = net === "testnet" ? "https://testnet.flowindex.io/api" : "https://flowindex.io/api";
    const url = `${flowindexUrl}/flow/key/${publicKey}`;
    console.log("flowindex url ==>", url);
    const result = await fetch(url);
    const json = await result.json();
    if (json.data && json.data.length > 0) {
      return json.data
        .filter((entry: KeyIndexEntry) => !entry.revoked && (entry.weight ?? 0) >= 1000)
        .map((entry: KeyIndexEntry) => ({ address: entry.address, keyIndex: entry.key_index }));
    }
    return null;
  }

  async function queryOldKeyIndexer(publicKey: string): Promise<{ address: string }[] | null> {
    const url = `https://production.key-indexer.flow.com/key/${publicKey}`;
    console.log("old indexer url ==>", url);
    const result = await fetch(url);
    const json = await result.json();
    if (json.accounts && json.accounts.length > 0) {
      return json.accounts;
    }
    return null;
  }

  export default async function getAddressByIndexer(req: NextApiRequest, res: NextApiResponse) {
    const { publicKey, network } = req.query as { publicKey: string; network?: string };
    console.log("publicKey ==>", publicKey, "network ==>", network);

    // Try flowindex first, fallback to old key-indexer
    let accounts: { address: string; keyIndex?: number }[] | null = null;
    try {
      accounts = await queryFlowIndex(publicKey, network);
    } catch (e: any) {
      console.log("flowindex error, trying old indexer:", e.message);
    }

    if (!accounts) {
      try {
        accounts = await queryOldKeyIndexer(publicKey);
      } catch (e: any) {
        console.log("old indexer error:", e.message);
      }
    }

    res.status(200).json({ accounts: accounts || [] });
  }
