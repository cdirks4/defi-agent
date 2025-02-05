"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { agentKit } from "@/services/agentkit";
import { WalletOverview } from "@/components/WalletOverview";
import AgentCreationForm from "@/components/AgentCreationForm";
import TransferFunds from "@/components/TransferFunds";
import FundAgentWallet from "@/components/FundAgentWallet";
import { storageService } from "@/services/storage";

export default function AgentPage() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [agentWalletAddress, setAgentWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAgentWallet = async () => {
      if (authenticated && user?.id) {
        setIsLoading(true);
        try {
          // Check for existing wallet in storage
          const existingWallet = storageService.getWalletByUserId(user.id);
          
          if (existingWallet) {
            // Restore existing wallet
            await agentKit.connectWallet(user.id);
            setAgentWalletAddress(existingWallet.address);
          } else {
            // Clear agent wallet address if none exists
            setAgentWalletAddress(null);
          }
        } catch (error) {
          console.error("Failed to initialize agent wallet:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeAgentWallet();
  }, [authenticated, user]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
            <p className="text-gray-400">
              Connect your wallet to manage your DeFi agent.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-400">Loading agent wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold gradient-text">Agent Management</h1>
        </div>

        {!agentWalletAddress && <AgentCreationForm />}

        <WalletOverview />

        {agentWalletAddress && wallets?.[0]?.address && (
          <div className="space-y-8">
            <FundAgentWallet
              userWalletAddress={wallets[0].address}
              agentWalletAddress={agentWalletAddress}
            />
            <TransferFunds
              userWalletAddress={wallets[0].address}
              agentWalletAddress={agentWalletAddress}
            />
          </div>
        )}
      </div>
    </div>
  );
}
