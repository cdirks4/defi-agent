"use client";

import { usePrivy } from "@privy-io/react-auth";
import TokenPurchaseDemo from "@/components/TokenPurchaseDemo";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LineChart, History, TrendingUp } from "lucide-react";
import MarketOverview from "@/components/MarketOverview";

export default function TradingDashboard() {
  const { authenticated } = usePrivy();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) {
      router.push("/");
      return;
    }

    const initializeDashboard = async () => {
      try {
        setError(null);
        // Add any necessary initialization here
        setIsLoading(false);
      } catch (err) {
        console.error("Dashboard initialization failed:", err);
        setError("Failed to load trading dashboard. Please refresh the page.");
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [authenticated, router]);

  if (!authenticated) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Trading Interface */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center space-x-2 mb-6">
                <LineChart className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-xl font-semibold">AI Trading Interface</h2>
              </div>
              <TokenPurchaseDemo />
            </div>

            {/* Market Overview Section */}
            <div className="card">
              <div className="flex items-center space-x-2 mb-6">
                <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-xl font-semibold">Market Analysis</h2>
              </div>
              <MarketOverview />
            </div>
          </div>

          {/* Right Column - Trade History */}
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <History className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-xl font-semibold">Trading History</h2>
              </div>
              <div className="space-y-4">
                {/* We can add trading history component here */}
                <p className="text-gray-500 text-sm">
                  Your recent trading activity will appear here
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by Arbitrum Stylus & Coinbase AgentKit</p>
        </footer>
      </div>
    </div>
  );
}
