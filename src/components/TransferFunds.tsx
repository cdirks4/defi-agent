"use client";

import { useState } from "react";
import Button from "./base/Button";
import { walletService } from "@/services/wallet";

interface TransferFundsProps {
  userWalletAddress: string;
  agentWalletAddress: string;
}

const TransferFunds = ({ userWalletAddress, agentWalletAddress }: TransferFundsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTransfer = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await walletService.transferToUserWallet(userWalletAddress);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer funds");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Transfer Funds</h3>
      <div className="space-y-2">
        <div className="text-sm text-gray-400">
          <div>From: {agentWalletAddress}</div>
          <div>To: {userWalletAddress}</div>
        </div>
      </div>
      <Button
        label="Transfer Funds to User Wallet"
        onClick={handleTransfer}
        isLoading={isLoading}
        variant="primary"
      />
      {error && <div className="text-[var(--error)] text-sm">{error}</div>}
      {success && (
        <div className="text-[var(--success)] text-sm">
          Funds successfully transferred!
        </div>
      )}
    </div>
  );
};

export default TransferFunds;
