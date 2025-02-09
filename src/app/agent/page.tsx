"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { agentKit } from "@/services/agentkit";
import { WalletOverview } from "@/components/WalletOverview";
import AgentCreationForm from "@/components/AgentCreationForm";
import TransferFunds from "@/components/TransferFunds";
import FundAgentWallet from "@/components/FundAgentWallet";
import { storageService } from "@/services/storage";
import Spinner from "@/components/base/Spinner";
import VAPIAssistant from "@/components/VAPIAssistant";

export default function AgentPage() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [agentWalletAddress, setAgentWalletAddress] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAgentWallet = async () => {
      if (authenticated && user?.id) {
        setIsLoading(true);
        setError(null);

        try {
          console.debug("Initializing agent wallet for user:", {
            userId: user.id,
            authenticated,
            hasWallets: wallets?.length > 0,
          });

          // Debug check for existing wallets
          storageService.debugPrintWallets();
          const existingWallet = storageService.getWalletByUserId(user.id);
          console.debug("Storage check result:", {
            userId: user.id,
            foundWallet: existingWallet ? existingWallet.address : null,
          });

          console.log(existingWallet);
          // Try to connect to existing wallet without creating a new one
          const connected = await agentKit.connectWallet(user.id, false);
          console.log(user.id);
          if (connected) {
            const address = agentKit.getWalletAddress();
            setAgentWalletAddress(address);
            console.log("oh /agents gets the agent wallet", { address });
            console.debug("Successfully connected to existing agent wallet:", {
              address,
              userId: user.id,
            });
          } else {
            // Clear agent wallet address if none exists
            setAgentWalletAddress(null);
            console.debug("No existing agent wallet found for user:", user.id);
          }
        } catch (error) {
          console.error("Failed to initialize agent wallet:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          setError(`Failed to initialize agent wallet: ${errorMessage}`);
          setAgentWalletAddress(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeAgentWallet();
  }, [authenticated, user, wallets]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">
              Please connect your wallet
            </h1>
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
            <Spinner size="lg" color="border-blue-500" />
            <div className="mt-4 text-gray-400">Loading agent wallet...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <p className="text-gray-400">
              Please try refreshing the page. If the problem persists, you may
              need to clear your browser cache.
            </p>
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
          {user?.id && (
            <div className="text-sm text-gray-400">
              User ID: {user.id.slice(0, 8)}...
            </div>
          )}
        </div>

        {!agentWalletAddress && <AgentCreationForm />}

        <WalletOverview />

        {agentWalletAddress && wallets?.[0]?.address && user?.id && (
          <>
            <VAPIAssistant
              userWalletAddress={wallets[0].address}
              agentWalletAddress={agentWalletAddress}
              userId={user.id}
            />
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
          </>
        )}
      </div>
    </div>
  );
}
