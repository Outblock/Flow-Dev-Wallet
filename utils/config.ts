import * as fcl from "@onflow/fcl";
import {httpTransport} from "@onflow/transport-http"

type Network = "mainnet" | "testnet" | "emulator";

const DEFAULT_RPC: Record<Network, string> = {
    mainnet: "https://rest-mainnet.onflow.org",
    testnet: "https://rest-testnet.onflow.org",
    emulator: "http://localhost:8888",
}

export function getDefaultRpc(network: string): string {
    return DEFAULT_RPC[network as Network] || DEFAULT_RPC.testnet
}

export default function fclConfig(network?: string, customRpc?: string): typeof fcl {
    const net = network || process.env.network || "testnet"
    const rpc = customRpc || getDefaultRpc(net)
    console.log('fcl ===>', net, rpc)

    fcl.config()
        .put("accessNode.api", rpc)
        .put("sdk.transport", httpTransport)
        .put("flow.network", net)

    if (net === 'emulator') {
        fcl.config()
            .put("discovery.wallet", process.env.emulatorDiscoveryWallet || "http://localhost:8701/fcl/authn")
    }

    return fcl
}
