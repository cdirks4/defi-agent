export const SUBGRAPH_URLS = {
  arbitrum:
    "https://gateway.thegraph.com/api/1055d3690bf5a07d168419b363ea550d/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
  "arbitrum-sepolia":
    "https://gateway.thegraph.com/api/1055d3690bf5a07d168419b363ea550d/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
} as const;

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
] as const;

export const RPC_URLS = {
  arbitrum: "https://arb1.arbitrum.io/rpc",
  "arbitrum-sepolia": "https://sepolia-rollup.arbitrum.io/rpc",
  FALLBACK_TESTNET: "https://arbitrum-sepolia.public.blastapi.io",
} as const;

export const ARBISCAN_URLS = {
  "arbitrum-one": "https://arbiscan.io",
  "arbitrum-sepolia": "https://sepolia.arbiscan.io",
} as const;

// Current network - defaults to testnet
export const CURRENT_NETWORK = "arbitrum-sepolia";

// Minimum ETH required for transactions on Arbitrum Sepolia (including gas fees)
export const MIN_REQUIRED_ETH = "0.000021";

// Default gas limits for common operations
export const DEFAULT_GAS_LIMITS = {
  WETH_DEPOSIT: 150000n, // Default gas limit for WETH deposits
  TOKEN_TRANSFER: 100000n,
} as const;

// IMPORTANT: These addresses must match the ones in uniswapDeployments.ts WRAPPED_NATIVE_TOKEN
export const WETH_ADDRESSES = {
  "arbitrum-sepolia": "0x980b62da83eff3d4576c647993b0c1d7faf17c73",
  "arbitrum-one": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
} as const;

export const WBTC_ADDRESSES = {
  "arbitrum-sepolia": "0x1a35ee4640b0a8b14a16492307f2c4e1a0b04c7c", // Arbitrum Sepolia WBTC
  "arbitrum-one": "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", // Arbitrum One WBTC
} as const;

export const WETH_ABI = [
  "function deposit() payable",
  "function withdraw(uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
] as const;
// Add testnet token addresses
export const TOKEN_ADDRESSES = {
  "arbitrum-sepolia": {
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    WETH: "0x980b62da83eff3d4576c647993b0c1d7faf17c73",
    DAI: "0x7b7c6c49fA99b37270077FBFA398748c27046984",
    WBTC: "0x1a35ee4640b0a8b14a16492307f2c4e1a0b04c7c",
    UNI: "0x1Cf56194E2C267E11515d45314E1Bf1D8E5DC0eD",
  },
  "mainnet-to-testnet": {
    // Mainnet to testnet address mapping
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48":
      "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC
    "0x82af49447d8a07e3bd95bd0d56f35241523fbab1":
      "0x980b62da83eff3d4576c647993b0c1d7faf17c73", // WETH
    "0x6b175474e89094c44da98b954eedeac495271d0f":
      "0x7b7c6c49fA99b37270077FBFA398748c27046984", // DAI
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599":
      "0x1a35ee4640b0a8b14a16492307f2c4e1a0b04c7c", // WBTC
    "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984":
      "0x1Cf56194E2C267E11515d45314E1Bf1D8E5DC0eD", // UNI
    // Add the specific address from the error
    "0x980b62da83eff3d4576c647993b0c1d7faf17c73":
      "0x980b62da83eff3d4576c647993b0c1d7faf17c73", // WETH on Arbitrum Sepolia
    "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d":
      "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC on Arbitrum Sepolia
  },
} as const;

// Token metadata for UI
export const TOKEN_METADATA = {
  USDC: { symbol: "USDC", decimals: 6 },
  WETH: { symbol: "WETH", decimals: 18 },
  DAI: { symbol: "DAI", decimals: 18 },
  WBTC: { symbol: "WBTC", decimals: 8 },
  UNI: { symbol: "UNI", decimals: 18 },
} as const;
