import { useEffect, useState } from "react";
import Spinner from "./base/Spinner";
import { agentKitService } from "@/services/agentkit";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Transaction {
  hash: string;
  type: "BUY" | "SELL" | "PROVIDE_LIQUIDITY" | "REMOVE_LIQUIDITY";
  token: string;
  amount: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
}

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // In a real app, we'd fetch from a backend or blockchain
        // For now, using mock data
        const mockTransactions: Transaction[] = [
          {
            hash: "0x1234...5678",
            type: "BUY",
            token: "ETH",
            amount: "0.5",
            timestamp: Date.now() - 300000,
            status: "confirmed",
          },
          {
            hash: "0x8765...4321",
            type: "SELL",
            token: "ARB",
            amount: "100",
            timestamp: Date.now() - 900000,
            status: "pending",
          },
        ];
        setTransactions(mockTransactions);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <Spinner size="lg" />
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
              <a
                href={`https://arbiscan.io/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[var(--primary)] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionHistory;
