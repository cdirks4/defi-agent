"use client";

import { useState } from "react";
import Button from "./base/Button";
import { agentKit } from "@/services/agentkit";
import { usePrivy } from "@privy-io/react-auth";
import { ethers } from "ethers";

interface TransferFundsProps {
  userWalletAddress: string;
  agentWalletAddress: string;
}

const TransferFunds = ({ userWalletAddress, agentWalletAddress }: TransferFundsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { authenticated, user } = usePrivy();

  const handleTransfer = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
  
    try {
      if (!authenticated || !user?.id) {
        throw new Error("Please connect your wallet first");
      }
  
      // Connect the agent wallet
      await agentKit.connectWallet(user.id);
      
      // Get the agent's wallet balance
      const balance = await agentKit.getBalance();
      if (!balance || balance === "0") {
        throw new Error("No funds available to transfer");
      }
  
      // Convert balance to BigInt for calculations
      const balanceWei = ethers.parseEther(balance);
      
      // Transfer the funds
      const txHash = await agentKit.transferFunds(userWalletAddress, balanceWei);
      console.log("Transfer successful:", txHash);
      setSuccess(true);
    } catch (err) {
      console.error("Transfer error:", err);
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
