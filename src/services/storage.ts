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
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveWallets(wallets: StoredWallet[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(wallets));
  }

  storeWallet(wallet: StoredWallet) {
    const wallets = this.getStoredWallets();
    wallets.push(wallet);
    this.saveWallets(wallets);
  }

  getWalletByUserId(userId: string): StoredWallet | undefined {
    return this.getStoredWallets().find((w) => w.userId === userId);
  }

  getWalletByAddress(address: string): StoredWallet | undefined {
    return this.getStoredWallets().find((w) => w.address === address);
  }

  getLatestWallet(): StoredWallet | undefined {
    const wallets = this.getStoredWallets();
    if (wallets.length === 0) return undefined;

    // Sort wallets by lastAccessed timestamp (most recent first)
    return wallets.sort(
      (a, b) =>
        new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    )[0];
  }

  updateLastAccessed(address: string) {
    const wallets = this.getStoredWallets();
    const index = wallets.findIndex((w) => w.address === address);
    if (index !== -1) {
      wallets[index].lastAccessed = new Date().toISOString();
      this.saveWallets(wallets);
    }
  }

  removeWallet(address: string) {
    const wallets = this.getStoredWallets();
    this.saveWallets(wallets.filter((w) => w.address !== address));
  }
}

export const storageService = new StorageService();
