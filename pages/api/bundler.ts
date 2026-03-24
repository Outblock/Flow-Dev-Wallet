import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Proxy for ERC-4337 bundler/paymaster to avoid CORS issues.
 * Usage: POST /api/bundler?url=https://bundler.flowindex.io/545/rpc
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  // Only allow proxying to our bundler/paymaster
  const allowed = ["bundler.flowindex.io"];
  try {
    const host = new URL(targetUrl).hostname;
    if (!allowed.includes(host)) {
      return res.status(403).json({ error: `Host not allowed: ${host}` });
    }
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Bundler request failed" });
  }
}
