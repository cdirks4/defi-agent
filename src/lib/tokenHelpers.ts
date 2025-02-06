import { ethers } from "ethers";
import { WRAPPED_NATIVE_TOKEN } from "./uniswapDeployments";

interface TokenDetails {
  decimals: number;
  symbol: string;
}

const DEFAULT_DECIMALS = 18;

export async function getTokenDetails(tokenContract: ethers.Contract): Promise<TokenDetails> {
  try {
    // Get current chain
    const chain = (process.env.NEXT_PUBLIC_CHAIN as keyof typeof WRAPPED_NATIVE_TOKEN) || "arbitrum-sepolia";
    const networkWETH = WRAPPED_NATIVE_TOKEN[chain];

    // Check if the token is WETH by comparing normalized addresses
    const isWETH = tokenContract.address.toLowerCase() === networkWETH.address.toLowerCase();

    console.log("Token details check:", {
      tokenAddress: tokenContract.address.toLowerCase(),
      networkWETH: networkWETH.address,
      isWETH,
      chain
    });

    if (isWETH) {
      console.log("WETH token detected, using default values");
      return {
        decimals: DEFAULT_DECIMALS,
        symbol: "WETH"
      };
    }

    // Try to get decimals and symbol concurrently
    const [decimals, symbol] = await Promise.all([
      tokenContract.decimals().catch((error: any) => {
        console.warn("Failed to fetch token decimals:", error);
        return DEFAULT_DECIMALS;
      }),
      tokenContract.symbol().catch((error: any) => {
        console.warn("Failed to fetch token symbol:", error);
        return "UNKNOWN";
      })
    ]);

    // Validate decimals
    const validatedDecimals = typeof decimals === 'number' && !isNaN(decimals) 
      ? decimals 
      : DEFAULT_DECIMALS;

    console.log("Token details retrieved:", {
      address: tokenContract.address,
      symbol: symbol || "UNKNOWN",
      decimals: validatedDecimals
    });

    return {
      decimals: validatedDecimals,
      symbol: symbol || "UNKNOWN"
    };
  } catch (error) {
    console.error("Error fetching token details:", error);
    return {
      decimals: DEFAULT_DECIMALS,
      symbol: "UNKNOWN"
    };
  }
}
