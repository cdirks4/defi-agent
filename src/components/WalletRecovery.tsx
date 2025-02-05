import { useState } from "react";
import Button from "./base/Button";
import { walletService } from "@/services/wallet";

interface WalletRecoveryProps {
  userWalletAddress: string;
}

const WalletRecovery = ({ userWalletAddress }: WalletRecoveryProps) => {
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRecovery = async () => {
    setRecovering(true);
    setError(null);
    try {
      const txHash = await walletService.transferToUserWallet(
        userWalletAddress
      );
      setSuccess(true);
      console.log("Recovery transaction:", txHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to recover funds");
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Recover Funds</h3>
        <Button
          label="Return Funds to Wallet"
          onClick={handleRecovery}
          isLoading={recovering}
          disabled={recovering || success}
          variant="secondary"
        />
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-500/10 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-500 bg-green-500/10 p-4 rounded-lg">
          Funds have been successfully returned to your wallet.
        </div>
      )}
    </div>
  );
};

export default WalletRecovery;
