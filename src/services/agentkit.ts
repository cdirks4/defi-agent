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

  async ensureWalletConnected(
    userId: string,
    createIfNotExist: boolean = true
  ): Promise<ethers.Wallet> {
    console.debug("Ensuring wallet connection:", {
      userId,
      createIfNotExist,
      currentWalletStatus: this.wallet ? "connected" : "not connected",
    });

    if (!this.wallet) {
      console.debug("No active wallet connection, attempting to connect...", {
        userId,
        createIfNotExist,
      });
      const connected = await this.connectWallet(userId, createIfNotExist);
      if (!connected) {
        const error = createIfNotExist
          ? "Failed to connect or create agent wallet"
          : `No existing agent wallet found for user: ${userId}`;
        console.debug("Wallet connection failed:", error);
        throw new Error(error);
      }
    }

    console.debug("Wallet connection ensured:", {
      address: this.wallet?.address,
      userId,
    });
    return this.wallet;
  }

  private async ensureProvider(): Promise<ethers.Provider> {
    try {
      if (!this._provider) {
        console.debug("Initializing provider in AgentKitService");
        this._provider = await providerService.getProvider();
      } else {
        // Validate existing provider
        try {
          await this._provider.getNetwork();
        } catch (error) {
          console.debug(
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

  async connectWallet(
    userId: string,
    createIfNotExist: boolean = true
  ): Promise<boolean> {
    try {
      // First check if wallet is already connected
      if (this.wallet) {
        console.debug("Wallet already connected:", {
          address: this.wallet.address,
          network: await this.provider?.getNetwork().then((n) => n.name),
          userId,
        });
        return true;
      }

      console.debug("Starting wallet connection process:", {
        userId,
        createIfNotExist,
        storedWallets: await storageService.debugPrintWallets(),
      });

      // Check for existing wallet in storage
      const existingWallet = storageService.getWalletByUserId(userId);
      const provider = await this.ensureProvider();

      if (existingWallet) {
        try {
          console.debug("Found existing wallet in storage:", {
            address: existingWallet.address,
            userId: existingWallet.userId,
            lastAccessed: existingWallet.lastAccessed,
            createdAt: existingWallet.createdAt,
          });

          const privateKey = await this.decryptPrivateKey(
            existingWallet.encryptedPrivateKey
          );

          // Verify the decrypted private key format
          if (!privateKey.match(/^0x[0-9a-fA-F]{64}$/)) {
            console.debug("Invalid private key format after decryption");
            if (!createIfNotExist) return false;
          }

          this.wallet = new ethers.Wallet(privateKey, provider);
          console.debug("Successfully restored existing agent wallet:", {
            address: this.wallet.address,
            network: await provider.getNetwork().then((n) => n.name),
            userId,
          });

          storageService.updateLastAccessed(this.wallet.address);
          return true;
        } catch (error) {
          console.debug("Failed to restore existing wallet:", {
            error,
            userId,
            walletAddress: existingWallet.address,
          });
          if (!createIfNotExist) {
            return false;
          }
        }
      } else {
        console.debug(
          "No existing wallet found in storage for userId:",
          userId
        );
        if (!createIfNotExist) {
          return false;
        }
      }

      // Only create new wallet if createIfNotExist is true
      if (createIfNotExist) {
        console.debug("Creating new agent wallet:", { userId });
        const newWallet = ethers.Wallet.createRandom().connect(provider);
        this.wallet = newWallet;

        const encryptedKey = await this.encryptPrivateKey(
          newWallet.privateKey,
          userId
        );

        const walletData = {
          address: newWallet.address,
          encryptedPrivateKey: encryptedKey,
          userId,
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
        };

        storageService.storeWallet(walletData);

        console.debug("New agent wallet created and stored:", {
          address: this.wallet.address,
          network: await provider.getNetwork().then((n) => n.name),
          userId: userId,
          createdAt: walletData.createdAt,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
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
    try {
      // Note: This is a simple example. In production, use a proper encryption service
      const decoded = atob(encryptedKey);
      const [privateKey, userId] = decoded.split(":");

      if (!privateKey || !userId) {
        throw new Error("Invalid encrypted key format");
      }

      return privateKey;
    } catch (error) {
      console.error("Failed to decrypt private key:", error);
      throw new Error("Failed to decrypt wallet key");
    }
  }

  async checkWalletHealth(tokenAddress?: string): Promise<WalletHealth> {
    try {
      if (!this.wallet) {
        return {
          isConnected: false,
          balance: "0",
          allowance: "0",
        };
      }

      const provider = await this.ensureProvider();
      const balance = await provider.getBalance(this.wallet.address);

      // Check token allowance if token address is provided
      let tokenAllowance = "0";
      if (tokenAddress) {
        try {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            provider
          );
          const allowance = await tokenContract.allowance(
            this.wallet.address,
            tokenAddress
          );
          tokenAllowance = ethers.formatEther(allowance);
        } catch (tokenError) {
          console.debug("Failed to check token allowance:", tokenError);
        }
      }

      return {
        isConnected: true,
        balance: ethers.formatEther(balance),
        allowance: tokenAllowance,
      };
    } catch (error) {
      console.error("Failed to check wallet health:", error);
      return {
        isConnected: false,
        balance: "0",
        allowance: "0",
      };
    }
  }

  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }
}

// Export a singleton instance
export const agentKit = new AgentKitService();
