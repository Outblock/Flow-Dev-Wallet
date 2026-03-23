export async function createFlowAccount(
  pubK: string,
  network: string,
  signatureAlgorithm: string,
  hashAlgorithm: string
): Promise<string> {
  const resp = await fetch("/api/createAddress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey: pubK,
      network,
      signatureAlgorithm,
      hashAlgorithm,
    }),
  });
  const body = await resp.json();
  if (body.error) throw new Error(body.error);
  return body.txId;
}

export async function lookupAddress(pubK: string, address?: string) {
  const { findAddressWithKey } = await import("./findAddressWithPubKey");
  return findAddressWithKey(pubK, address);
}
