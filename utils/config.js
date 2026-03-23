import * as fcl from "@onflow/fcl";
import {send as httpSend} from "@onflow/transport-http"

const DEFAULT_RPC = {
    mainnet: "https://rest-mainnet.onflow.org",
    testnet: "https://rest-testnet.onflow.org",
    emulator: "http://localhost:8888",
}

export function getDefaultRpc(network) {
    return DEFAULT_RPC[network] || DEFAULT_RPC.testnet
}

export default function fclConfig(network, customRpc) {
    const net = network || process.env.network || "testnet"
    const rpc = customRpc || getDefaultRpc(net)
    console.log('fcl ===>', net, rpc)

    fcl.config()
        .put("accessNode.api", rpc)
        .put("sdk.transport", httpSend)
        .put("flow.network", net)

    if (net === 'emulator') {
        fcl.config()
            .put("discovery.wallet", process.env.emulatorDiscoveryWallet || "http://localhost:8701/fcl/authn")
    }

    return fcl
}