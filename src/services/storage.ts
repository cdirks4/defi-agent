interface StoredWallet {
  address: string;
  encryptedPrivateKey: string;
  userId: string;
  createdAt: string;
  lastAccessed: string;
}

class StorageService {
  private readonly STORAGE_KEY = "defi_assistant_wallets";

  private getStoredWallets(): StoredWallet[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        console.debug("No wallets found in storage");
        return [];
      }
      const wallets = JSON.parse(stored);
      console.debug("Retrieved wallets from storage:", {
        count: wallets.length,
        wallets: wallets.map(w => ({
          address: w.address,
          userId: w.userId,
          createdAt: w.createdAt,
          lastAccessed: w.lastAccessed
        }))
      });
      return wallets;
    } catch (error) {
      console.error("Error parsing stored wallets:", error);
      return [];
    }
  }

  private saveWallets(wallets: StoredWallet[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(wallets));
      console.debug("Saved wallets to storage:", {
        count: wallets.length,
        wallets: wallets.map(w => ({
          address: w.address,
          userId: w.userId,
          lastAccessed: w.lastAccessed
        }))
      });
    } catch (error) {
      console.error("Error saving wallets:", error);
    }
  }

  storeWallet(wallet: StoredWallet) {
    const wallets = this.getStoredWallets();
    console.debug("Storing new wallet:", {
      address: wallet.address,
      userId: wallet.userId,
      createdAt: wallet.createdAt,
      lastAccessed: wallet.lastAccessed
    });
    wallets.push(wallet);
    this.saveWallets(wallets);
  }

  getWalletByUserId(userId: string): StoredWallet | undefined {
    console.debug("Looking for wallet with userId:", userId);
    const wallets = this.getStoredWallets();
    console.debug("Available wallets for search:", {
      count: wallets.length,
      wallets: wallets.map(w => ({
        userId: w.userId,
        address: w.address,
        lastAccessed: w.lastAccessed
      }))
    });
    
    const wallet = wallets.find(
      (w) => w.userId.toLowerCase() === userId.toLowerCase()
    );
    
    if (wallet) {
      console.debug("Found matching wallet for userId:", {
        searchUserId: userId,
        foundWallet: {
          address: wallet.address,
          userId: wallet.userId,
          createdAt: wallet.createdAt,
          lastAccessed: wallet.lastAccessed
        }
      });
    } else {
      console.debug("No matching wallet found for userId:", {
        searchUserId: userId,
        availableUserIds: wallets.map(w => w.userId)
      });
    }
    
    return wallet;
  }

  getWalletByAddress(address: string): StoredWallet | undefined {
    console.debug("Looking for wallet with address:", address);
    const normalizedAddress = address.toLowerCase();
    const wallets = this.getStoredWallets();
    
    console.debug("Available wallets for address search:", {
      searchAddress: normalizedAddress,
      availableAddresses: wallets.map(w => w.address.toLowerCase())
    });
    
    const wallet = wallets.find(
      (w) => w.address.toLowerCase() === normalizedAddress
    );
    
    if (wallet) {
      console.debug("Found matching wallet for address:", {
        searchAddress: address,
        foundWallet: {
          address: wallet.address,
          userId: wallet.userId,
          createdAt: wallet.createdAt,
          lastAccessed: wallet.lastAccessed
        }
      });
    } else {
      console.debug("No matching wallet found for address:", {
        searchAddress: address,
        availableAddresses: wallets.map(w => w.address)
      });
    }
    
    return wallet;
  }

  getLatestWallet(): StoredWallet | undefined {
    const wallets = this.getStoredWallets();
    if (wallets.length === 0) {
      console.debug("No wallets found in storage");
      return undefined;
    }

    const latestWallet = wallets.sort(
      (a, b) =>
        new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    )[0];
    
    console.debug("Retrieved latest wallet:", {
      address: latestWallet.address,
      userId: latestWallet.userId,
      lastAccessed: latestWallet.lastAccessed,
      createdAt: latestWallet.createdAt
    });
    
    return latestWallet;
  }

  updateLastAccessed(address: string) {
    const wallets = this.getStoredWallets();
    const index = wallets.findIndex((w) => w.address.toLowerCase() === address.toLowerCase());
    if (index !== -1) {
      const newTimestamp = new Date().toISOString();
      wallets[index].lastAccessed = newTimestamp;
      console.debug("Updated last accessed time for wallet:", {
        address,
        oldTimestamp: wallets[index].lastAccessed,
        newTimestamp
      });
      this.saveWallets(wallets);
    } else {
      console.debug("Could not update last accessed time - wallet not found:", address);
    }
  }

  removeWallet(address: string) {
    console.debug("Removing wallet:", address);
    const wallets = this.getStoredWallets();
    const filteredWallets = wallets.filter((w) => w.address.toLowerCase() !== address.toLowerCase());
    console.debug("Wallet removal result:", {
      removedAddress: address,
      walletsBeforeRemoval: wallets.length,
      walletsAfterRemoval: filteredWallets.length
    });
    this.saveWallets(filteredWallets);
  }

  debugPrintWallets(): void {
    const wallets = this.getStoredWallets();
    console.debug("All stored wallets:", wallets.map(w => ({
      address: w.address,
      userId: w.userId,
      lastAccessed: w.lastAccessed,
      createdAt: w.createdAt
    })));
  }
}

export const storageService = new StorageService();
