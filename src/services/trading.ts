import { ethers } from "ethers";
import { cacheService } from "./cache";
import { getTokenDetails } from "@/lib/tokenHelpers";
import { ERC20_ABI } from "@/lib/constants";
import { uniswapTradeService } from "./uniswapTrades";
import { providerService } from "./provider";
import { WRAPPED_NATIVE_TOKEN } from "@/lib/uniswapDeployments";
import { agentKit } from "./agentkit";
import { walletService } from "./wallet";

export class TradingService {
  async purchaseToken(params: {
    userId: string;
    tokenAddress: string;
    amount: string;
    maxSlippage?: number;
  }) {
    try {
      const { tokenAddress, amount } = params;
      const provider = await this.getProviderWithRetry();
      
      if (!provider) {
        throw new Error("Failed to connect to network");
      }

      // First try to get token details using helper
      let decimals: number;
      let symbol: string;
      
      try {
        const tokenDetails = await getTokenDetails(
          new ethers.Contract(tokenAddress, ERC20_ABI, provider)
        );
        decimals = tokenDetails.decimals;
        symbol = tokenDetails.symbol;
      } catch (error) {
        console.log("Fallback to default token details");
        decimals = 18; // Default to 18 decimals
        symbol = "TOKEN";
      }

      const parsedAmount = ethers.parseUnits(amount, decimals);

      // Execute trade using Uniswap service
      const tradeResult = await uniswapTradeService.executeTrade({
        userId: params.userId,
        tokenAddress,
        amount: ethers.formatUnits(parsedAmount, decimals),
        maxSlippage: params.maxSlippage,
      });

      if (!tradeResult.success) {
        throw new Error("Trade execution failed");
      }

      await cacheService.cacheUserInteraction({
        id: `${params.userId}-${Date.now()}`,
        userId: params.userId,
        type: "TOKEN_PURCHASE",
        token: symbol,
        amount,
        timestamp: Date.now(),
      });

      return {
        success: true,
        token: symbol,
        amount,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Token purchase failed:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to execute trade"
      );
    }
  }

  private async handleWETHPurchase(params: {
    userId: string;
    tokenAddress: string;
    amount: string;
  }) {
    console.log("Handling WETH purchase...");

    try {
      // Get the agent kit signer
      const signer = agentKit.getSigner();
      console.log("Got agent kit signer for WETH purchase");

      console.log("Initializing WETH contract...", {
        tokenAddress: params.tokenAddress,
      });

      const parsedAmount = ethers.parseEther(params.amount);
      console.log(
        "Parsed amount for WETH purchase:",
        ethers.formatEther(parsedAmount)
      );

      // Execute the WETH wrap transaction using the agent kit signer
      const tx = await signer.sendTransaction({
        to: params.tokenAddress,
        value: parsedAmount,
        data: "0xd0e30db0", // deposit() function selector
      });

      console.log("WETH wrap transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("WETH wrap transaction confirmed:", receipt?.hash);

      await cacheService.cacheUserInteraction({
        id: tx.hash,
        userId: params.userId,
        type: "WETH_WRAP",
        token: "WETH",
        amount: params.amount,
        timestamp: Date.now(),
      });

      return {
        success: true,
        txHash: receipt?.hash || tx.hash,
        token: "WETH",
        amount: params.amount,
      };
    } catch (error) {
      console.error("WETH wrapping failed:", error);
      throw new Error("Failed to wrap ETH");
    }
  }

  private async getProviderWithRetry(
    retries = 3
  ): Promise<ethers.Provider | null> {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Provider connection attempt ${i + 1}/${retries}`);
        const provider = await providerService.getProvider();
        if (provider) {
          // Test the connection
          const network = await provider.getNetwork();
          console.log(
            "Provider connected successfully to network:",
            network.name
          );
          return provider;
        }
        console.log(
          `Provider attempt ${i + 1} failed, waiting before retry...`
        );
        // Wait before retrying with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      } catch (error) {
        console.warn(`Provider connection attempt ${i + 1} failed:`, error);
        if (i === retries - 1) {
          console.error("All provider connection attempts failed");
          return null;
        }
      }
    }
    return null;
  }
}

export const tradingService = new TradingService();
