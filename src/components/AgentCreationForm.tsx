"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Button from "./base/Button";
import { agentKit } from "@/services/agentkit";
import { storageService } from "@/services/storage";

const AgentCreationForm = () => {
  const { user } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Debug check for existing wallets when component mounts
    if (user?.id) {
      storageService.debugPrintWallets();
      const existingWallet = storageService.getWalletByUserId(user.id);
      console.debug("Checking for existing wallet on mount:", {
        userId: user.id,
        foundWallet: existingWallet ? existingWallet.address : null
      });
    }
  }, [user?.id]);

  const handleCreateAgent = async () => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // First try to connect to existing wallet
      console.debug("Attempting to connect to existing wallet for user:", user.id);
      const existingWallet = storageService.getWalletByUserId(user.id);
      
      if (existingWallet) {
        console.debug("Found existing wallet:", existingWallet.address);
        const connected = await agentKit.connectWallet(user.id, false);
        if (connected) {
          setSuccess(true);
          window.location.reload();
          return;
        }
      }

      // If no existing wallet or connection failed, create new one
      console.debug("Creating new agent wallet for user:", user.id);
      const connected = await agentKit.connectWallet(user.id, true);
      if (connected) {
        const address = agentKit.getWalletAddress();
        console.log("Created new agent wallet:", address);
        setSuccess(true);
        window.location.reload();
      } else {
        setError("Failed to create agent wallet. Please try again.");
      }
    } catch (err) {
      console.error("Agent wallet creation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(
        `Unable to create agent wallet: ${errorMessage}. If this persists, please clear your browser cache and try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Create New Agent Wallet</h3>
      <p className="text-sm text-gray-400">
        Create a new agent wallet to manage your DeFi transactions. This will
        create a fresh wallet - make sure to fund it after creation.
      </p>
      <div className="text-sm text-gray-400">
        <p>Troubleshooting:</p>
        <ul className="list-disc list-inside">
          <li>Make sure you're connected with the correct wallet</li>
          <li>Try clearing your browser cache if issues persist</li>
          <li>Check your network connection</li>
        </ul>
      </div>
      <Button
        label="Create New Agent Wallet"
        onClick={handleCreateAgent}
        isLoading={isLoading}
        variant="primary"
      />
      {error && (
        <div className="text-[var(--error)] text-sm p-2 bg-red-900/20 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="text-[var(--success)] text-sm p-2 bg-green-900/20 rounded">
          New agent wallet created successfully! Please fund your wallet to start trading.
        </div>
      )}
    </div>
  );
};

export default AgentCreationForm;
