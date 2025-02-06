"use client";

import { useState } from "react";
import Button from "./base/Button";
import { walletService } from "@/services/wallet";

interface TestnetFaucetButtonProps {
  userAddress: string;
  onSuccess?: () => void;
}

// This button appears when users have insufficient funds (less than 0.0100021 ETH)
// to complete transactions on Arbitrum Sepolia
const TestnetFaucetButton = ({
  userAddress,
  onSuccess,
}: TestnetFaucetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestFunds = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await walletService.getTestnetTokens(userAddress);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to request testnet funds"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        label="Request Testnet Funds"
        onClick={handleRequestFunds}
        isLoading={isLoading}
        variant="secondary"
        size="sm"
      />
      {error && <div className="text-[var(--error)] text-sm">{error}</div>}
    </div>
  );
};

export default TestnetFaucetButton;
