"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Image from "next/image";
import Vapi from "@vapi-ai/web";
import ActiveCallDetail from "@/components/ActiveCallDetail";
import Button from "@/components/base/Button";
import { getDeFiAssistant } from "@/assistants";
import MarketOverview from "@/components/MarketOverview";
import TransactionHistory from "@/components/TransactionHistory";
import { LineChart, History } from "lucide-react";
import { agentKit } from "@/services/agentkit";
// Remove this line
// import TokenPurchaseDemo from "@/components/TokenPurchaseDemo";
import AITradingTest from "@/components/AITradingTest";

const vapi =
  typeof window !== "undefined"
    ? new Vapi(process.env.NEXT_PUBLIC_VAPI_KEY || "")
    : null;

export default function Home() {
  const { authenticated, user } = usePrivy();

  const { wallets } = useWallets();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [agentWalletAddress, setAgentWalletAddress] = useState<string | null>(
    null
  );

  useEffect(() => {
    // Check if agent wallet exists
    const checkAgentWallet = async () => {
      const address = agentKit.getWalletAddress();
      setAgentWalletAddress(address);
    };

    if (authenticated) {
      checkAgentWallet();
    }

    // Voice API event listeners
    vapi?.on("call-start", () => {
      setConnecting(false);
      setConnected(true);
    });

    vapi?.on("call-end", () => {
      setConnecting(false);
      setConnected(false);
    });

    vapi?.on("speech-start", () => {
      setAssistantIsSpeaking(true);
    });

    vapi?.on("speech-end", () => {
      setAssistantIsSpeaking(false);
    });

    vapi?.on("volume-level", (level) => {
      setVolumeLevel(level);
    });

    vapi?.on("error", (error) => {
      console.error(error);
      setConnecting(false);
    });
  }, [authenticated]);

  const startCallInline = async () => {
    if (!authenticated || !wallets[0]) {
      alert("Please connect your wallet first");
      return;
    }

    if (!agentWalletAddress) {
      alert("Please create an agent wallet in the Agent Management page first");
      return;
    }

    setConnecting(true);
    if (!user) {
      throw new Error();
    }
    const assistant = await getDeFiAssistant(user.id);
    // Add both user and agent wallet context
    const assistantConfig = {
      agentWallet: agentWalletAddress,
      userWallet: wallets[0].address,
    };
    const assistantWithContext = {
      ...assistant,
      ...assistantConfig,
    };
    vapi?.start(assistant);
  };

  const endCall = () => {
    vapi?.stop();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="max-w-7xl mx-auto w-full p-6">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Markets */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center space-x-2 mb-6">
                <LineChart className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-xl font-semibold">Market Overview</h2>
              </div>
              <MarketOverview />
            </div>

            {/* AI Assistant Section */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">
                AI Trading Assistant
              </h2>
              {!connected ? (
                <div className="text-center">
                  <p className="text-gray-400 mb-4">
                    {!agentWalletAddress
                      ? "Create an agent wallet in the Agent Management page to start trading"
                      : "Connect your wallet and start trading with AI assistance"}
                  </p>
                  <Button
                    label="Start Trading Session"
                    onClick={startCallInline}
                    isLoading={connecting}
                    disabled={!agentWalletAddress}
                    variant="primary"
                    size="lg"
                  />
                </div>
              ) : (
                <ActiveCallDetail
                  assistantIsSpeaking={assistantIsSpeaking}
                  volumeLevel={volumeLevel}
                  onEndCallClick={endCall}
                />
              )}
            </div>
          </div>

          {/* Right Column - Transactions */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <History className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-xl font-semibold">Recent Transactions</h2>
            </div>
            <TransactionHistory />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by Arbitrum Stylus & Coinbase AgentKit</p>
        </footer>
      </div>
    </main>
  );
}
