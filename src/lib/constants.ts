export const SUBGRAPH_URLS = {
  MAINNET:
    "https://api.thegraph.com/subgraphs/name/messari/uniswap-v3-arbitrum",
  TESTNET:
    "https://gateway.thegraph.com/api/1055d3690bf5a07d168419b363ea550d/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
} as const;

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
] as const;

export const RPC_URLS = {
  MAINNET: "https://arb1.arbitrum.io/rpc",
  TESTNET: "https://sepolia-rollup.arbitrum.io/rpc",
  FALLBACK_TESTNET: "https://arbitrum-sepolia.public.blastapi.io",
} as const;

// Minimum ETH required for transactions on Arbitrum Sepolia (including gas fees)
export const MIN_REQUIRED_ETH = "0.0100021";
