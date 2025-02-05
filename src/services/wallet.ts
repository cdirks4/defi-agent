import { ethers } from "ethers";
import { storageService } from "./storage";
import { FAUCET_ADDRESSES } from "@/utils/testnet-tokens";
import { MIN_REQUIRED_ETH, RPC_URLS } from "@/lib/constants";

class WalletService {
  private wallet: ethers.Wallet | null = null;
  private provider: ethers.JsonRpcProvider;
  private userId: string | null = null;

  constructor() {
    // Connect to Arbitrum Sepolia testnet with fallback
    this.provider = new ethers.JsonRpcProvider(RPC_URLS.TESTNET);
  }

  async connectWallet(userId: string): Promise<string> {
    this.userId = userId;

    // Check if user already has a wallet
    const existingWallet = storageService.getWalletByUserId(userId);
    if (existingWallet) {
      return this.restoreUserWallet(existingWallet);
    }

    try {
      // Create a new wallet for the user
      const randomWallet = ethers.Wallet.createRandom();
      this.wallet = randomWallet.connect(this.provider);

      // Encrypt the private key before storing
      const encryptedKey = await this.encryptPrivateKey(
        this.wallet.privateKey,
        userId
      );

      // Store wallet information
      storageService.storeWallet({
        address: this.wallet.address,
        encryptedPrivateKey: encryptedKey,
        userId,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      });

      console.log("New wallet created:", {
        address: this.wallet.address,
        timestamp: new Date().toISOString(),
        network: "arbitrum-sepolia",
      });

      return this.wallet.address;
    } catch (error) {
      console.error("Wallet creation failed:", error);
      throw error;
    }
  }

  private async encryptPrivateKey(
    privateKey: string,
    userId: string
  ): Promise<string> {
    // In production, use a proper encryption service
    // This is a simple example and NOT secure for production
    return btoa(`${privateKey}:${userId}`);
  }

  private async decryptPrivateKey(encryptedKey: string): Promise<string> {
    // In production, use a proper encryption service
    const decoded = atob(encryptedKey);
    return decoded.split(":")[0];
  }

  private async restoreUserWallet(storedWallet: StoredWallet): Promise<string> {
    try {
      const privateKey = await this.decryptPrivateKey(
        storedWallet.encryptedPrivateKey
      );
      this.wallet = new ethers.Wallet(privateKey, this.provider);

      storageService.updateLastAccessed(storedWallet.address);

      console.log("Wallet restored:", {
        address: this.wallet.address,
        timestamp: new Date().toISOString(),
      });

      return this.wallet.address;
    } catch (error) {
      console.error("Failed to restore wallet:", error);
      throw error;
    }
  }

  async transferToUserWallet(destinationAddress: string): Promise<string> {
    if (!this.wallet) throw new Error("No wallet connected");

    try {
      // Get current balance
      const balance = await this.provider.getBalance(this.wallet.address);
      const minRequired = ethers.parseEther(MIN_REQUIRED_ETH);

      if (balance < minRequired) {
        throw new Error(
          "Insufficient funds. You need at least 0.0100021 ETH to complete this transaction (including gas fees)."
        );
      }

      // Get current network conditions
      const feeData = await this.provider.getFeeData();

      // Estimate gas for the transfer
      const gasEstimate = await this.provider.estimateGas({
        from: this.wallet.address,
        to: destinationAddress,
        value: balance,
      });

      // Calculate gas cost using current gas price
      const gasCost = gasEstimate * (feeData.gasPrice ?? 0n);
      const amountToSend = balance - gasCost;

      if (amountToSend <= 0n) {
        throw new Error("Insufficient funds to cover gas costs");
      }

      // Send the transaction
      const tx = await this.wallet.sendTransaction({
        to: destinationAddress,
        value: amountToSend,
        gasLimit: gasEstimate,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });

      console.log("Funds returned to user:", {
        from: this.wallet.address,
        to: destinationAddress,
        amount: ethers.formatEther(amountToSend),
        txHash: tx.hash,
      });

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Failed to return funds:", error);
      throw error;
    }
  }

  async fundAgentWallet(
    agentAddress: string,
    amount: string,
    signer: ethers.Signer
  ): Promise<string> {
    if (!ethers.isAddress(agentAddress))
      throw new Error("Invalid agent address");
    if (Number(amount) <= 0) throw new Error("Amount must be greater than 0");

    try {
      // Get the provider from the signer or use the default provider
      const provider = signer.provider || this.provider;
      if (!provider) {
        throw new Error("No valid provider available for transaction");
      }

      // Check if connected wallet has enough balance
      const userAddress = await signer.getAddress();
      const userBalance = await provider.getBalance(userAddress);
      const amountToSend = ethers.parseEther(amount);

      // Get current network conditions
      const feeData = await provider.getFeeData();

      // Create transaction object for gas estimation
      const txRequest = {
        from: userAddress,
        to: agentAddress,
        value: amountToSend,
      };

      // Estimate gas for the transfer
      const gasEstimate = await provider.estimateGas(txRequest);

      // Calculate total cost (amount + gas)
      const gasCost = gasEstimate * (feeData.gasPrice ?? 0n);
      const totalCost = amountToSend + gasCost;

      if (userBalance < totalCost) {
        throw new Error(
          `Insufficient funds. Total required: ${ethers.formatEther(
            totalCost
          )} ETH (including gas fees)`
        );
      }

      // Send the transaction with estimated gas and current network fees
      const tx = await signer.sendTransaction({
        ...txRequest,
        gasLimit: gasEstimate,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });

      console.log("Agent wallet funded:", {
        from: userAddress,
        to: agentAddress,
        amount,
        gasLimit: gasEstimate.toString(),
        txHash: tx.hash,
      });

      await tx.wait();
      return tx.hash;
    } catch (error: any) {
      console.error("Failed to fund agent wallet:", error);
      // Enhance error message for common issues
      if (error.code === "INSUFFICIENT_FUNDS") {
        throw new Error(
          "Insufficient funds to cover the transaction amount and gas fees"
        );
      } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
        throw new Error("Unable to estimate gas. The transaction may fail");
      } else {
        throw error;
      }
    }
  }

  async executeTradeAction(action: {
    type: string;
    params: any;
  }): Promise<string> {
    if (!this.wallet) {
      throw new Error("Wallet not connected");
    }

    try {
      // Create a real transaction
      const tx = await this.wallet.sendTransaction({
        to: action.params.tokenAddress,
        value: action.params.amount,
        gasLimit: BigInt(100000),
      });

      console.log("Transaction sent:", {
        action,
        txHash: tx.hash,
        walletAddress: this.wallet.address,
        timestamp: new Date().toISOString(),
      });

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      console.log("Transaction confirmed:", {
        txHash: receipt?.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
      });

      return tx.hash;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  }

  async getBalance(tokenAddress?: string): Promise<string> {
    if (!this.wallet) {
      throw new Error("Wallet not connected");
    }

    try {
      if (tokenAddress) {
        // For ERC20 tokens
        const contract = new ethers.Contract(
          tokenAddress,
          ["function balanceOf(address) view returns (uint256)"],
          this.provider
        );
        const balance = await contract.balanceOf(this.wallet.address);
        return balance.toString();
      } else {
        // For native ETH
        const balance = await this.provider.getBalance(this.wallet.address);
        return balance.toString();
      }
    } catch (error) {
      console.error("Failed to get balance:", error);
      throw error;
    }
  }

  // Helper method to get testnet tokens
  async getTestnetTokens(userAddress: string): Promise<void> {
    if (!this.wallet) throw new Error("No wallet connected");

    try {
      // For this example, we'll use a simple faucet contract call
      const faucetContract = new ethers.Contract(
        FAUCET_ADDRESSES.ETH,
        ["function drip(address recipient) external"],
        this.wallet
      );

      const tx = await faucetContract.drip(userAddress);
      await tx.wait();

      console.log("Received testnet ETH:", {
        recipient: userAddress,
        faucet: FAUCET_ADDRESSES.ETH,
      });
    } catch (error) {
      console.error("Failed to get testnet tokens:", error);
      throw new Error(
        "Failed to request testnet funds. Please try again later."
      );
    }
  }
}

export const walletService = new WalletService();
