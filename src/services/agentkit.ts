import { ethers } from "ethers";
import { ERC20_ABI } from "@/lib/constants";
import { uniswapService } from "@/services/uniswap";
import { storageService } from "./storage";
import { providerService } from "./provider";

interface WalletHealth {
  isConnected: boolean;
  balance: string;
  allowance: string;
}

export class AgentKitService {
  private wallet: ethers.Wallet | null = null;
  private _provider: ethers.Provider | null = null;

  // Getter for provider to ensure we always have a valid one
  get provider(): ethers.Provider | null {
    return this._provider;
  }

  // Get signer for transactions
  getSigner(): ethers.Wallet {
    if (!this.wallet) {
      throw new Error("Agent wallet not connected");
    }
    return this.wallet;
  }

  private async ensureProvider(): Promise<ethers.Provider> {
    try {
      if (!this._provider) {
        console.log("Initializing provider in AgentKitService");
        this._provider = await providerService.getProvider();
      } else {
        // Validate existing provider
        try {
          await this._provider.getNetwork();
        } catch (error) {
          console.warn(
            "Provider validation failed in AgentKit, getting new provider:",
            error
          );
          this._provider = await providerService.getProvider(true);
        }
      }
      return this._provider;
    } catch (error) {
      console.error("Failed to ensure provider in AgentKit:", error);
      throw new Error("Could not establish network connection");
    }
  }

  async connectWallet(userId: string) {
    try {
      // First check if a wallet already exists for this user
      const existingWallet = storageService.getWalletByUserId(userId);

      // Ensure we have a valid provider
      const provider = await this.ensureProvider();
      console.log("Provider ready for agent wallet connection");

      if (existingWallet) {
        // Restore existing wallet
        const privateKey = await this.decryptPrivateKey(
          existingWallet.encryptedPrivateKey
        );
        this.wallet = new ethers.Wallet(privateKey, provider);
        console.log("🔐 Existing agent wallet restored:", {
          address: this.wallet.address,
          network: await provider.getNetwork().then((n) => n.name),
        });
        return true;
      }

      // If no existing wallet, create a new one
      const newWallet = ethers.Wallet.createRandom().connect(provider);
      this.wallet = newWallet;

      // Encrypt and store the new wallet
      const encryptedKey = await this.encryptPrivateKey(
        newWallet.privateKey,
        userId
      );
      storageService.storeWallet({
        address: newWallet.address,
        encryptedPrivateKey: encryptedKey,
        userId,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      });

      console.log("🔐 New agent wallet created:", {
        address: this.wallet.address,
        network: await provider.getNetwork().then((n) => n.name),
      });
      return true;
    } catch (error) {
      console.error("Failed to connect agent wallet:", error);
      return false;
    }
  }

  private async encryptPrivateKey(
    privateKey: string,
    userId: string
  ): Promise<string> {
    // Note: This is a simple example. In production, use a proper encryption service
    return btoa(`${privateKey}:${userId}`);
  }

  private async decryptPrivateKey(encryptedKey: string): Promise<string> {
    // Note: This is a simple example. In production, use a proper encryption service
    const decoded = atob(encryptedKey);
    return decoded.split(":")[0];
  }

  async checkWalletHealth(): Promise<WalletHealth> {
    if (!this.wallet) {
      throw new Error("Agent wallet not connected");
    }

    try {
      const provider = await this.ensureProvider();
      const balance = await provider.getBalance(this.wallet.address);

      return {
        isConnected: true,
        balance: ethers.formatEther(balance),
        allowance: "1000.0", // Example allowance
      };
    } catch (error) {
      console.error("Failed to check agent wallet health:", error);
      throw error;
    }
  }

  async getBalance(): Promise<string> {
    if (!this.wallet) {
      throw new Error("Agent wallet not connected");
    }

    try {
      const provider = await this.ensureProvider();
      const balance = await provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Failed to get agent wallet balance:", error);
      throw error;
    }
  }

  async getTokenBalance(
    address: string,
    tokenAddress: string
  ): Promise<string> {
    try {
      const provider = await this.ensureProvider();

      // For ETH/Native token balance
      if (
        tokenAddress.toLowerCase() ===
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
        tokenAddress.toLowerCase() ===
          "0x0000000000000000000000000000000000000000"
      ) {
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
      }

      // Validate token address
      if (!ethers.isAddress(tokenAddress)) {
        console.warn(`Invalid token address: ${tokenAddress}`);
        return "0";
      }

      // For ERC20 tokens
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function balanceOf(address) view returns (uint256)",
          "function decimals() view returns (uint8)",
        ],
        provider
      );

      try {
        // Get balance and decimals concurrently
        const [balance, decimals] = await Promise.all([
          tokenContract.balanceOf(address).catch(() => null),
          tokenContract.decimals().catch(() => 18), // Default to 18 decimals if call fails
        ]);

        if (!balance) {
          console.debug(`No balance found for token ${tokenAddress}`);
          return "0";
        }

        const formattedBalance = ethers.formatUnits(balance, decimals);
        console.debug(`Raw balance for ${tokenAddress}: ${balance.toString()}`);
        console.debug(`Formatted balance: ${formattedBalance}`);

        // Additional validation for the formatted balance
        const numericBalance = Number(formattedBalance);
        if (isNaN(numericBalance) || numericBalance < 0) {
          console.debug(`Invalid balance value for token ${tokenAddress}`);
          return "0";
        }

        return formattedBalance;
      } catch (contractError) {
        console.error(
          `Contract interaction failed for token ${tokenAddress}:`,
          contractError
        );
        return "0";
      }
    } catch (error) {
      console.error(`Token balance check failed for ${tokenAddress}:`, error);
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
      await this.ensureProvider();
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

  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  async transferFunds(
    destinationAddress: string,
    amount: bigint
  ): Promise<string> {
    if (!this.wallet) {
      throw new Error("Agent wallet not connected");
    }

    try {
      const provider = await this.ensureProvider();

      // Get current balance
      const balance =
        ((await provider.getBalance(this.wallet.address)) * 85n) / 100n;

      // Get current network conditions
      const feeData = await provider.getFeeData();

      // Estimate gas for the transfer
      const gasEstimate = await provider.estimateGas({
        from: this.wallet.address,
        to: destinationAddress,
        value: balance,
      });

      // Calculate gas cost with a 20% buffer
      const gasBuffer = (gasEstimate * 200n) / 100n;
      const gasCost = gasBuffer * (feeData.gasPrice ?? 0n);

      // Calculate amount to send (total balance minus gas cost)
      const amountToSend = balance - gasCost;

      if (amountToSend <= 0n) {
        throw new Error("Insufficient funds to cover gas costs");
      }

      // Send the transaction
      const tx = await this.wallet.sendTransaction({
        to: destinationAddress,
        value: amountToSend,
        gasLimit: gasBuffer,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });

      await tx.wait();

      console.log("Transfer successful:", {
        from: this.wallet.address,
        to: destinationAddress,
        amount: ethers.formatEther(amountToSend),
        gasLimit: gasBuffer.toString(),
        txHash: tx.hash,
      });

      return tx.hash;
    } catch (error) {
      console.error("Transfer failed:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const agentKit = new AgentKitService();
