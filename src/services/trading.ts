import { ethers } from "ethers";
import { cacheService } from "./cache";
import { getTokenDetails } from "@/lib/tokenHelpers";
import {
  ERC20_ABI,
  DEFAULT_GAS_LIMITS,
  MIN_REQUIRED_ETH,
} from "@/lib/constants";
import { uniswapTradeService } from "./uniswapTrades";
import { providerService } from "./provider";
import { WRAPPED_NATIVE_TOKEN } from "@/lib/uniswapDeployments";
import { agentKit } from "./agentkit";
import { walletService } from "./wallet";
import { WETH_ADDRESSES, WETH_ABI } from "@/lib/constants";
import { TOKEN_ADDRESSES } from "@/lib/constants";

const DEFAULT_TRADE_AMOUNT = "0.1";

export class TradingService {
  private readonly WETH_ADDRESS =
    WETH_ADDRESSES["arbitrum-sepolia"].toLowerCase();

  private async checkSufficientGasFunds(userId: string): Promise<void> {
    const signer = await agentKit.ensureWalletConnected(userId);
    const provider = await providerService.getProvider();
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    const minRequired = ethers.parseEther(MIN_REQUIRED_ETH);

    if (balance < minRequired) {
      throw new Error(
        `Insufficient ETH for gas fees. Please fund the agent wallet with at least ${MIN_REQUIRED_ETH} ETH. Current balance: ${ethers.formatEther(
          balance
        )} ETH`
      );
    }
  }

  async purchaseToken(params: {
    userId: string;
    tokenAddress: string;
    amount: string;
    maxSlippage?: number;
  }) {
    try {
      const { userId } = params;
      
      // Map mainnet addresses to testnet addresses
      const mainnetToTestnet: Record<string, string> = {
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC
        "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "0x1a35ee4640b0a8b14a16492307f2c4e1a0b04c7c", // WBTC
      };

      // Normalize and map the token address
      const normalizedAddress = params.tokenAddress.toLowerCase();
      const mappedAddress = mainnetToTestnet[normalizedAddress] || params.tokenAddress;
      
      console.log("Token address mapping:", {
        original: params.tokenAddress,
        normalized: normalizedAddress,
        mapped: mappedAddress
      });

      // Continue with the rest of the function using mappedAddress
      const amount = params.amount || DEFAULT_TRADE_AMOUNT;
      const signer = await agentKit.ensureWalletConnected(userId);
      if (!signer) {
        throw new Error("Failed to connect agent wallet");
      }

      const provider = await this.getProviderWithRetry();
      if (!provider) {
        throw new Error("Provider not initialized");
      }

      // Validate and parse amount
      if (!params.amount || isNaN(Number(params.amount))) {
        console.log(`Invalid WETH amount format: ${params.amount}, using default`);
        params.amount = DEFAULT_TRADE_AMOUNT;
      }

      const parsedAmount = ethers.parseEther(params.amount);
      console.log(
        "Parsed WETH amount:",
        ethers.formatEther(parsedAmount),
        "ETH"
      );

      // Check ETH balance first
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);

      // Calculate required amount including gas costs
      const minRequired = ethers.parseEther(MIN_REQUIRED_ETH);
      const totalRequired = parsedAmount + minRequired;

      if (BigInt(balance) < totalRequired) {
        throw new Error(
          `Insufficient ETH balance. Required: ${ethers.formatEther(
            totalRequired
          )} ETH (including gas buffer)`
        );
      }

      const wethContract = new ethers.Contract(
        this.WETH_ADDRESS,
        WETH_ABI,
        signer
      );

      // Get current gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits("0.1", "gwei");

      // Estimate gas for the deposit transaction
      console.log("Estimating gas for WETH deposit...");
      let gasLimit;
      try {
        const estimatedGas = await wethContract.deposit.estimateGas({
          value: parsedAmount,
        });
        // Add 20% buffer to the estimate
        gasLimit = (estimatedGas * 120n) / 100n;
        console.log("Estimated gas (with 20% buffer):", gasLimit.toString());
      } catch (error) {
        console.warn("Gas estimation failed, using default limit:", error);
        // Fallback to default gas limit if estimation fails
        gasLimit = DEFAULT_GAS_LIMITS.WETH_DEPOSIT;
      }

      console.log(
        "Attempting to wrap",
        ethers.formatEther(parsedAmount),
        "ETH to",
        this.WETH_ADDRESS
      );

      const tx = await wethContract.deposit({
        value: parsedAmount,
        gasLimit,
        gasPrice,
      });

      console.log("WETH wrap transaction sent:", tx.hash);
      const receipt = await tx.wait();

      if (!receipt || receipt.status === 0) {
        throw new Error("WETH wrap transaction failed");
      }

      console.log("WETH wrap transaction confirmed:", receipt.hash);

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
        txHash: receipt.hash,
        token: "WETH",
        amount: params.amount,
      };
    } catch (error) {
      console.error("WETH wrapping failed:", error);
      const formattedError = (await import("@/lib/formatError")).formatContractError(error);
      throw new Error(`Failed to wrap ETH: ${formattedError}`);
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
