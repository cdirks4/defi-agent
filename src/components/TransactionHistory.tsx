import { useEffect, useState } from "react";
import Spinner from "./base/Spinner";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ARBISCAN_URLS, CURRENT_NETWORK } from "@/lib/constants";
import { redis } from "@/services/redis";

interface Transaction {
  hash: string;
  type: "BUY" | "SELL" | "PROVIDE_LIQUIDITY" | "REMOVE_LIQUIDITY";
  token: string;
  amount: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
  txHash?: string;
}

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Attempt to fetch from Redis cache
        const cachedTrades = await redis.get("recent_trades");
        if (cachedTrades) {
          const parsedTrades = JSON.parse(
            typeof cachedTrades === "string" ? cachedTrades : JSON.stringify(cachedTrades)
          );
          setTransactions(parsedTrades.map((trade: any) => ({
            hash: trade.txHash || "pending",
            type: "BUY",
            token: trade.symbol || "UNKNOWN",
            amount: trade.amount || "0",
            timestamp: trade.timestamp || Date.now(),
            status: trade.txHash ? "confirmed" : "pending",
            txHash: trade.txHash
          })));
        } else {
          // Fallback to mock data if no cached trades
          const mockTransactions: Transaction[] = [
            {
              hash: "0x1234...5678",
              type: "BUY",
              token: "ETH",
              amount: "0.5",
              timestamp: Date.now() - 300000,
              status: "confirmed",
              txHash: "0x1234...5678"
            },
            {
              hash: "0x8765...4321",
              type: "SELL",
              token: "ARB",
              amount: "100",
              timestamp: Date.now() - 900000,
              status: "pending",
              txHash: "0x8765...4321"
            },
          ];
          setTransactions(mockTransactions);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        // Set empty array on error to avoid showing stale data
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex justify-center items-center h-[200px] text-gray-400">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div
          key={tx.hash}
          className="card hover:border-[var(--primary)]/50 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
              {tx.type === "BUY" ? (
                <ArrowUpRight className="w-5 h-5 text-[var(--success)]" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-[var(--error)]" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">
                  {tx.type} {tx.amount} {tx.token}
                </span>
                <span className="text-sm text-gray-400">
                  {formatDistanceToNow(tx.timestamp)} ago
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span
                className={`status-badge ${
                  tx.status === "confirmed"
                    ? "status-badge-confirmed"
                    : tx.status === "pending"
                    ? "status-badge-pending"
                    : "status-badge-failed"
                }`}
              >
                {tx.status}
              </span>
              {tx.txHash && (
                <a
                  href={`${ARBISCAN_URLS[CURRENT_NETWORK]}/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[var(--primary)] transition-colors"
                  title="View on Arbiscan"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionHistory;
