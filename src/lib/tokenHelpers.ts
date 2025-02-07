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
    const tokenAddress = tokenContract.getAddress ? 
      await tokenContract.getAddress() : 
      tokenContract.address;
    
    const isWETH = tokenAddress.toLowerCase() === networkWETH.address.toLowerCase();

    console.log("Token details check:", {
      tokenAddress: tokenAddress.toLowerCase(),
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

    // Get decimals with enhanced error handling
    let decimals: number;
    try {
      decimals = await tokenContract.decimals();
      if (typeof decimals !== 'number' || isNaN(decimals)) {
        console.warn(`Invalid decimals response for token ${tokenAddress}, using default`);
        decimals = DEFAULT_DECIMALS;
      }
    } catch (error) {
      console.warn(
        `Failed to fetch decimals for token ${tokenAddress} (${
          error instanceof Error && !error.data ? "missing revert data" : error instanceof Error ? error.message : "unknown error"
        }), using default`
      );
      decimals = DEFAULT_DECIMALS;
    }

    // Get symbol with enhanced error handling
    let symbol: string;
    try {
      symbol = await tokenContract.symbol();
      if (!symbol) {
        console.warn(`Empty symbol response for token ${tokenAddress}, using UNKNOWN`);
        symbol = "UNKNOWN";
      }
    } catch (error) {
      console.warn(
        `Failed to fetch symbol for token ${tokenAddress} (${
          error instanceof Error && !error.data ? "missing revert data" : error instanceof Error ? error.message : "unknown error"
        }), using UNKNOWN`
      );
      symbol = "UNKNOWN";
    }

    console.log("Token details retrieved:", {
      address: tokenAddress,
      symbol,
      decimals
    });

    return {
      decimals,
      symbol
    };
  } catch (error) {
    console.error("Error fetching token details:", error);
    const formattedError = (await import("./formatError")).formatContractError(error);
    console.error(`Token contract error details: ${formattedError}`);
    
    return {
      decimals: DEFAULT_DECIMALS,
      symbol: "UNKNOWN"
    };
  }
}
