import { ethers } from "ethers";
import { usePrivy } from "@privy-io/react-auth";
import { ERC20_ABI } from "@/lib/constants";
import { uniswapService } from "@/services/uniswap";
import { storageService } from "./storage";

interface WalletHealth {
  isConnected: boolean;
  balance: string;
  allowance: string;
}

export class AgentKitService {
  private wallet: ethers.Wallet | null = null;
  private provider: ethers.Provider | null = null;

  constructor() {
    this.initializeProvider();
  }

  private async initializeProvider() {
    // Initialize provider based on environment
    const network = process.env.NEXT_PUBLIC_CHAIN || "arbitrum-sepolia";
    this.provider = ethers.getDefaultProvider(network);
  }

  async connectWallet(userId: string) {
    try {
      // First check if a wallet already exists for this user
      const existingWallet = storageService.getWalletByUserId(userId);
      
      if (existingWallet) {
        // Restore existing wallet
        const privateKey = await this.decryptPrivateKey(existingWallet.encryptedPrivateKey);
        this.wallet = new ethers.Wallet(privateKey, this.provider!);
        console.log("🔐 Existing wallet restored:", this.wallet.address);
        return true;
      }

      // If no existing wallet, create a new one
      const newWallet = ethers.Wallet.createRandom().connect(this.provider!);
      this.wallet = newWallet;

      // Encrypt and store the new wallet
      const encryptedKey = await this.encryptPrivateKey(newWallet.privateKey, userId);
      storageService.storeWallet({
        address: newWallet.address,
        encryptedPrivateKey: encryptedKey,
        userId,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      });

      console.log("🔐 New wallet created:", this.wallet.address);
      return true;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      return false;
    }
  }

  private async encryptPrivateKey(privateKey: string, userId: string): Promise<string> {
    // In production, use a proper encryption service
    // This is a simple example and NOT secure for production
    return btoa(`${privateKey}:${userId}`);
  }

  private async decryptPrivateKey(encryptedKey: string): Promise<string> {
    // In production, use a proper encryption service
    const decoded = atob(encryptedKey);
    return decoded.split(":")[0];
  }

  async checkWalletHealth(): Promise<WalletHealth> {
    if (!this.wallet) {
      throw new Error("Wallet not connected");
    }

    try {
      const balance = await this.wallet.getBalance();
      return {
        isConnected: true,
        balance: ethers.formatEther(balance),
        allowance: "1000.0", // Example allowance
      };
    } catch (error) {
      console.error("Failed to check wallet health:", error);
      throw error;
    }
  }

  async getBalance(): Promise<string> {
    if (!this.wallet) {
      throw new Error("Wallet not connected");
    }

    try {
      const balance = await this.wallet.getBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Failed to get balance:", error);
      throw error;
    }
  }

  async executeTrade(action: {
    type: string;
    tokenSymbol: string;
    amount: number;
    price: number;
  }) {
    if (!this.wallet) {
      throw new Error("Wallet not connected");
    }

    // Implement trade execution logic here
    console.log("Executing trade:", action);
    return {
      success: true,
      txHash: "0x...", // Example transaction hash
    };
  }

  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  async getTokenBalance(
    address: string,
    tokenAddress: string
  ): Promise<string> {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }

    if (!ethers.isAddress(tokenAddress)) {
      console.warn(`Invalid token address: ${tokenAddress}`);
      return "0";
    }

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );

      // Wrap each contract call in its own try-catch to handle individual failures
      let balance;
      try {
        balance = await tokenContract.balanceOf(address);
        // Check if balance is empty or invalid
        if (!balance || balance === "0x" || balance.toString() === "0") {
          return "0";
        }
      } catch (error) {
        console.debug(`Failed to get balance for token ${tokenAddress}:`, error);
        return "0";
      }

      let decimals;
      try {
        decimals = await tokenContract.decimals();
      } catch (error) {
        console.debug(`Failed to get decimals for token ${tokenAddress}:`, error);
        return "0";
      }

      // Format the balance, defaulting to 18 decimals if decimals call failed
      const formattedBalance = ethers.formatUnits(balance, decimals || 18);
      
      // Return "0" if the formatted balance is not a valid number
      return isNaN(Number(formattedBalance)) ? "0" : formattedBalance;
    } catch (error) {
      console.debug(`Token contract interaction failed for ${tokenAddress}:`, error);
      return "0";
    }
  }

  async getTokenValueUSD(
    tokenAddress: string,
    balance: string
  ): Promise<string> {
    try {
      // Get token price from Uniswap pool
      const poolData = await uniswapService.getPoolData();
      const token = poolData.inputTokens.find(
        (t) => t.id.toLowerCase() === tokenAddress.toLowerCase()
      );
      if (!token) return "0";

      const valueUSD = Number(balance) * Number(token.priceUSD);
      return valueUSD.toFixed(2);
    } catch (error) {
      console.error("Failed to get token USD value:", error);
      return "0";
    }
  }

  async fundAgentWallet(amount: string) {
    if (!this.wallet) {
      throw new Error("Agent wallet not connected");
    }

    try {
      // Fund the agent wallet with ETH
      const tx = await this.wallet.sendTransaction({
        to: this.wallet.address,
        value: ethers.parseEther(amount),
      });
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Failed to fund agent wallet:", error);
      return false;
    }
  }
}

// Export a singleton instance
export const agentKit = new AgentKitService();
