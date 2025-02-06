"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletConnect from "./WalletConnect";
import { LineChart, Home, History } from "lucide-react";

const Navigation = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path
      ? "text-[var(--primary)]"
      : "text-foreground hover:text-[var(--primary)]";
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--card-border)] bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-xl font-bold gradient-text">
            DeFi Assistant
          </Link>
          <div className="flex space-x-6">
            <Link href="/" className={`${isActive("/")} transition-colors`}>
              Home
            </Link>
            <Link
              href="/agent"
              className={`${isActive("/agent")} transition-colors`}
            >
              Agent Management
            </Link>
          </div>
          <Link
            href="/trading"
            className={`${isActive("/trading")} transition-colors`}
          >
            Trading
          </Link>
        </div>
        <WalletConnect onConnect={() => null} />
      </div>
    </nav>
  );
};

export default Navigation;
