"use client";

import { ExternalLink } from "lucide-react";
import { ARBISCAN_URLS, CURRENT_NETWORK } from "@/lib/constants";

interface TransactionSuccessNoticeProps {
  token: string;
  amount: string;
  txHash?: string;
}

export default function TransactionSuccessNotice({
  token,
  amount,
  txHash,
}: TransactionSuccessNoticeProps) {
  // Ensure we display WETH properly even if token comes through as UNKNOWN
  const displayToken = token === "UNKNOWN" ? "WETH" : token;

  return (
    <div className="card border-[var(--success)]/20">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
          <h3 className="font-semibold">Transaction successful!</h3>
        </div>

        <div className="space-y-1 text-[var(--muted)]">
          <p>Token: {displayToken}</p>
          <p>Amount: {amount}</p>
          {txHash && (
            <div className="flex items-center space-x-2">
              <span>Transaction:</span>
              <a
                href={`${ARBISCAN_URLS[CURRENT_NETWORK]}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors flex items-center space-x-1"
              >
                <span className="truncate max-w-[200px]">{txHash}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
