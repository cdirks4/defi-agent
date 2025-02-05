"use client";

import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Button from "./base/Button";
import { walletService } from "@/services/wallet";
import TestnetFaucetButton from "./TestnetFaucetButton";
import { ethers } from "ethers";

interface FundAgentWalletProps {
  agentWalletAddress: string;
  userWalletAddress: string;
}

const FundAgentWallet = ({ agentWalletAddress, userWalletAddress }: FundAgentWalletProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState("0.1"); // Default funding amount
  const [showFaucetButton, setShowFaucetButton] = useState(false);
  
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const handleFund = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setShowFaucetButton(false);

    try {
      // Check if user is authenticated with Privy
      if (!authenticated || !user) {
        throw new Error("Please connect your wallet first");
      }

      // Check if we have an active wallet
      if (!wallets || wallets.length === 0) {
        throw new Error("No wallet connected");
      }

      // Get the signer from the connected wallet
      const wallet = wallets[0];
      
      // Try to get a provider, falling back to window.ethereum if wallet.provider is null
      let provider;
      try {
        if (wallet.provider) {
          provider = new ethers.BrowserProvider(wallet.provider);
        } else if (typeof window !== 'undefined' && window.ethereum) {
          provider = new ethers.BrowserProvider(window.ethereum);
        } else {
          throw new Error("No valid provider found. Please ensure your wallet is properly connected.");
        }
      } catch (providerError) {
        console.error("Provider initialization error:", providerError);
        throw new Error("Failed to initialize wallet provider. Please ensure your wallet is properly connected.");
      }

      const signer = await provider.getSigner();

      // Validate amount before proceeding
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }

      // Proceed with funding using the connected wallet's signer
      const txHash = await walletService.fundAgentWallet(agentWalletAddress, amount, signer);
      console.log("Transaction successful:", txHash);
      setSuccess(true);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fund agent wallet";
      setError(errorMessage);
      
      // Show faucet button for insufficient funds errors
      if (
        errorMessage.toLowerCase().includes("insufficient") ||
        errorMessage.toLowerCase().includes("funds")
      ) {
        setShowFaucetButton(true);
      }

      // Log the full error for debugging
      console.error("Funding error details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaucetSuccess = () => {
    setShowFaucetButton(false);
    setError(null);
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Fund Agent Wallet</h3>
      <div className="space-y-2">
        <div className="text-sm text-gray-400">
          <div>From: {userWalletAddress}</div>
          <div>To: {agentWalletAddress}</div>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              // Clear any previous errors when user changes the amount
              setError(null);
              setSuccess(false);
            }}
            className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm w-32"
            step="0.01"
            min="0"
            placeholder="0.0"
          />
          <span className="text-sm text-gray-400">ETH</span>
        </div>
      </div>
      <div className="space-y-2">
        <Button
          label="Fund Agent Wallet"
          onClick={handleFund}
          isLoading={isLoading}
          variant="primary"
          disabled={!authenticated || !ready || isLoading}
        />
        {showFaucetButton && (
          <div className="mt-2">
            <TestnetFaucetButton 
              userAddress={userWalletAddress}
              onSuccess={handleFaucetSuccess}
            />
          </div>
        )}
      </div>
      {error && (
        <div className="text-[var(--error)] text-sm break-words">
          {error}
        </div>
      )}
      {success && (
        <div className="text-[var(--success)] text-sm">
          Agent wallet funded successfully!
        </div>
      )}
    </div>
  );
};

export default FundAgentWallet;
