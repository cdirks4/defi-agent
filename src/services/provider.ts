import { ethers } from "ethers";
import { RPC_URLS } from "@/lib/constants";

class ProviderService {
  private static instance: ProviderService;
  private primaryProvider: ethers.Provider | null = null;
  private fallbackProvider: ethers.Provider | null = null;
  private lastNetworkCheck: number = 0;
  private readonly NETWORK_CHECK_INTERVAL = 30000; // 30 seconds

  private constructor() {}

  public static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  private async validateProvider(provider: ethers.Provider): Promise<boolean> {
    try {
      const network = await provider.getNetwork();
      console.log("Provider validated successfully:", {
        chainId: network.chainId,
        name: network.name,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.warn("Provider validation failed:", error);
      return false;
    }
  }

  private shouldCheckNetwork(): boolean {
    const now = Date.now();
    if (now - this.lastNetworkCheck > this.NETWORK_CHECK_INTERVAL) {
      this.lastNetworkCheck = now;
      return true;
    }
    return false;
  }

  async getProvider(forceNew: boolean = false): Promise<ethers.Provider> {
    // If we have a cached provider and don't need to force new or check network
    if (!forceNew && this.primaryProvider && !this.shouldCheckNetwork()) {
      return this.primaryProvider;
    }

    // Try to use cached primary provider first
    if (this.primaryProvider) {
      try {
        const isValid = await this.validateProvider(this.primaryProvider);
        if (isValid) {
          return this.primaryProvider;
        }
        console.warn("Cached primary provider failed validation, will try to reconnect");
        this.primaryProvider = null;
      } catch (error) {
        console.warn("Error checking cached primary provider:", error);
        this.primaryProvider = null;
      }
    }

    // Try to use cached fallback provider
    if (this.fallbackProvider) {
      try {
        const isValid = await this.validateProvider(this.fallbackProvider);
        if (isValid) {
          return this.fallbackProvider;
        }
        console.warn("Cached fallback provider failed validation");
        this.fallbackProvider = null;
      } catch (error) {
        console.warn("Error checking cached fallback provider:", error);
        this.fallbackProvider = null;
      }
    }

    // Try to connect with primary RPC
    try {
      const chain = (process.env.NEXT_PUBLIC_CHAIN as keyof typeof RPC_URLS) || "arbitrum-sepolia";
      const primaryUrl = process.env.NEXT_PUBLIC_RPC_URL || RPC_URLS[chain];
      console.log("Attempting to connect to primary RPC:", primaryUrl);
      
      const provider = new ethers.JsonRpcProvider(primaryUrl);
      const isValid = await this.validateProvider(provider);
      
      if (isValid) {
        this.primaryProvider = provider;
        return provider;
      }
    } catch (primaryError) {
      console.warn("Primary RPC connection failed:", primaryError);
    }

    // Try fallback RPC
    try {
      console.log("Attempting to connect to fallback RPC:", RPC_URLS.FALLBACK_TESTNET);
      
      const fallbackProvider = new ethers.JsonRpcProvider(RPC_URLS.FALLBACK_TESTNET);
      const isValid = await this.validateProvider(fallbackProvider);
      
      if (isValid) {
        this.fallbackProvider = fallbackProvider;
        return fallbackProvider;
      }
    } catch (fallbackError) {
      console.error("Fallback RPC connection failed:", fallbackError);
    }

    throw new Error(
      "Failed to establish connection to any blockchain network. Please check your network connection and try again."
    );
  }

  async clearProviders(): Promise<void> {
    console.log("Clearing provider cache");
    this.primaryProvider = null;
    this.fallbackProvider = null;
    this.lastNetworkCheck = 0;
  }
}

export const providerService = ProviderService.getInstance();
