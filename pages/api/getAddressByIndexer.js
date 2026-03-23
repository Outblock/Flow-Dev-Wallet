async function queryFlowIndex(publicKey, network) {
    const net = network || process.env.network || "testnet";
    const flowindexUrl = net === "testnet" ? "https://testnet.flowindex.io/api" : "https://flowindex.io/api";
    const url = `${flowindexUrl}/flow/key/${publicKey}`;
    console.log("flowindex url ==>", url);
    const result = await fetch(url);
    const json = await result.json();
    if (json.data && json.data.length > 0) {
      return json.data
        .filter(entry => !entry.revoked && entry.weight >= 1000)
        .map(entry => ({ address: entry.address, keyIndex: entry.key_index }));
    }
    return null;
  }

  async function queryOldKeyIndexer(publicKey) {
    const url = `https://production.key-indexer.flow.com/key/${publicKey}`;
    console.log("old indexer url ==>", url);
    const result = await fetch(url);
    const json = await result.json();
    if (json.accounts && json.accounts.length > 0) {
      return json.accounts;
    }
    return null;
  }

  export default async function getAddressByIndexer(req, res) {
    const { publicKey, network } = req.query;
    console.log("publicKey ==>", publicKey, "network ==>", network);

    // Try flowindex first, fallback to old key-indexer
    let accounts = null;
    try {
      accounts = await queryFlowIndex(publicKey, network);
    } catch (e) {
      console.log("flowindex error, trying old indexer:", e.message);
    }

    if (!accounts) {
      try {
        accounts = await queryOldKeyIndexer(publicKey);
      } catch (e) {
        console.log("old indexer error:", e.message);
      }
    }

    res.status(200).json({ accounts: accounts || [] });
  }
  