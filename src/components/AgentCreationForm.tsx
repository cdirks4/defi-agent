"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Button from "./base/Button";
import { agentKit } from "@/services/agentkit";

const AgentCreationForm = () => {
  const { user } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCreateAgent = async () => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const connected = await agentKit.connectWallet(user.id);
      if (connected) {
        setSuccess(true);
      } else {
        setError("Failed to create or restore agent wallet");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent wallet");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Create Agent Wallet</h3>
      <p className="text-sm text-gray-400">
        Create or restore your agent wallet to manage your DeFi transactions.
      </p>
      <Button
        label="Initialize Agent Wallet"
        onClick={handleCreateAgent}
        isLoading={isLoading}
        variant="primary"
      />
      {error && <div className="text-[var(--error)] text-sm">{error}</div>}
      {success && (
        <div className="text-[var(--success)] text-sm">
          Agent wallet initialized successfully!
        </div>
      )}
    </div>
  );
};

export default AgentCreationForm;
