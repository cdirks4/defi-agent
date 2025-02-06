import { ethers } from "ethers";
import { storageService } from "./storage";
import { FAUCET_ADDRESSES } from "@/utils/testnet-tokens";
import { MIN_REQUIRED_ETH } from "@/lib/constants";
import { providerService } from "./provider";

class WalletService {
  private wallet: ethers.Wallet | null = null;
  private _provider: ethers.Provider | null = null;
  private userId: string | null = null;

  // Getter for provider to ensure we always have a valid one
  get provider(): ethers.Provider | null {
    return this._provider;
  }

  private async ensureProvider(): Promise<ethers.Provider> {
    try {
      if (!this._provider) {
        console.log("Initializing provider in WalletService");
        this._provider = await providerService.getProvider();
      } else {
        // Validate existing provider
        try {
          await this._provider.getNetwork();
        } catch (error) {
          console.warn("Provider validation failed, getting new provider:", error);
          this._provider = await providerService.getProvider(true);
        }
      }
      return this._provider;
    } catch (error) {
      console.error("Failed to ensure provider:", error);
      throw new Error("Could not establish network connection");
    }
  }

  async connectWallet(userId: string): Promise<string> {
    this.userId = userId;
    console.log("Connecting wallet for user:", userId);

    try {
      // Ensure we have a valid provider
      const provider = await this.ensureProvider();
      console.log("Provider ready for wallet connection");

      // Check if user already has a wallet
      const existingWallet = storageService.getWalletByUserId(userId);
      if (existingWallet) {
        console.log("Found existing wallet for user");
        return this.restoreUserWallet(existingWallet);
      }

      // Create a new wallet
      console.log("Creating new wallet for user");
      const randomWallet = ethers.Wallet.createRandom();
      this.wallet = randomWallet.connect(provider);

      // Encrypt and store wallet information
      const encryptedKey = await this.encryptPrivateKey(
        this.wallet.privateKey,
        userId
      );

      storageService.storeWallet({
        address: this.wallet.address,
        encryptedPrivateKey: encryptedKey,
        userId,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      });

      console.log("New wallet created and stored:", {
        address: this.wallet.address,
        timestamp: new Date().toISOString(),
        network: await provider.getNetwork().then(n => n.name),
      });

      return this.wallet.address;
    } catch (error) {
      console.error("Wallet connection failed:", error);
      throw error;
    }
  }

  async fundAgentWallet(
    agentWalletAddress: string,
    amount: string,
    signer: ethers.Signer
  ): Promise<string> {
    try {
      console.log("Funding agent wallet:", {
        to: agentWalletAddress,
        amount: amount,
      });

      // Validate the amount
      const amountWei = ethers.parseEther(amount);
      if (amountWei <= 0n) {
        throw new Error("Invalid amount");
      }

      // Get the current gas price
      const provider = await this.ensureProvider();
      const feeData = await provider.getFeeData();

      // Estimate gas for the transfer
      const gasEstimate = await provider.estimateGas({
        to: agentWalletAddress,
        value: amountWei,
      });

      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * 120n) / 100n;

      // Send the transaction
      const tx = await signer.sendTransaction({
        to: agentWalletAddress,
        value: amountWei,
        gasLimit,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });

      console.log("Funding transaction sent:", tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Funding transaction confirmed:", {
        txHash: receipt?.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
      });

      return tx.hash;
    } catch (error) {
      console.error("Failed to fund agent wallet:", error);
      throw error;
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

  private async restoreUserWallet(storedWallet: StoredWallet): Promise<string> {
    try {
      console.log("Restoring wallet:", storedWallet.address);
      
      // Ensure we have a valid provider before restoring
      const provider = await this.ensureProvider();
      
      const privateKey = await this.decryptPrivateKey(
        storedWallet.encryptedPrivateKey
      );
      
      this.wallet = new ethers.Wallet(privateKey, provider);
      
      // Verify the wallet is properly connected
      const network = await provider.getNetwork();
      console.log("Wallet restored and connected to network:", {
        address: this.wallet.address,
        network: network.name,
        timestamp: new Date().toISOString(),
      });

      storageService.updateLastAccessed(storedWallet.address);
      return this.wallet.address;
    } catch (error) {
      console.error("Failed to restore wallet:", error);
      throw error;
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
      // Ensure provider is valid before executing trade
      await this.ensureProvider();

      console.log("Executing trade action:", {
        type: action.type,
        params: {
          ...action.params,
          amount: ethers.formatEther(action.params.amount),
        },
      });

      // Create transaction based on action type
      let tx;
      if (action.type === "WRAP_ETH") {
        tx = await this.wallet.sendTransaction({
          to: action.params.tokenAddress,
          value: BigInt(action.params.amount),
          data: "0xd0e30db0", // deposit() function selector
        });
      } else {
        tx = await this.wallet.sendTransaction({
          to: action.params.tokenAddress,
          value: BigInt(action.params.amount),
          gasLimit: BigInt(100000),
        });
      }

      console.log("Transaction sent:", {
        action: action.type,
        txHash: tx.hash,
        walletAddress: this.wallet.address,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", {
        txHash: receipt?.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
      });

      return tx.hash;
    } catch (error) {
      console.error("Trade action failed:", error);
      throw error;
    }
  }

  async getBalance(tokenAddress?: string): Promise<string> {
    if (!this.wallet) {
      throw new Error("Wallet not connected");
    }

    try {
      const provider = await this.ensureProvider();

      if (tokenAddress) {
        const contract = new ethers.Contract(
          tokenAddress,
          ["function balanceOf(address) view returns (uint256)"],
          provider
        );
        const balance = await contract.balanceOf(this.wallet.address);
        return balance.toString();
      } else {
        const balance = await provider.getBalance(this.wallet.address);
        return balance.toString();
      }
    } catch (error) {
      console.error("Failed to get balance:", error);
      throw error;
    }
  }

  async getTestnetTokens(userAddress: string): Promise<void> {
    if (!this.wallet) throw new Error("No wallet connected");

    try {
      const provider = await this.ensureProvider();
      
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
        network: await provider.getNetwork().then(n => n.name),
      });
    } catch (error) {
      console.error("Failed to get testnet tokens:", error);
      throw new Error("Failed to request testnet funds. Please try again later.");
    }
  }
}

export const walletService = new WalletService();
