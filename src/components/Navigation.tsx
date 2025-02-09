"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletConnect from "./WalletConnect";
import {
  LineChart,
  Home,
  History,
  ArrowUpDown,
  PlaySquare,
} from "lucide-react";

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
            <Link
              href="/"
              className={`${isActive(
                "/"
              )} transition-colors flex items-center gap-2`}
            >
              <Home size={16} />
              Home
            </Link>
            <Link
              href="/agent"
              className={`${isActive(
                "/agent"
              )} transition-colors flex items-center gap-2`}
            >
              <History size={16} />
              Agent Management
            </Link>
            <Link
              href="/trading"
              className={`${isActive(
                "/trading"
              )} transition-colors flex items-center gap-2`}
            >
              <LineChart size={16} />
              Trading
            </Link>
            {/* <Link
              href="/spread-trading"
              className={`${isActive(
                "/spread-trading"
              )} transition-colors flex items-center gap-2`}
            >
              <ArrowUpDown size={16} />
              Spread Trading
            </Link> */}
            <Link
              href="/pools"
              className={`${isActive(
                "/simulations"
              )} transition-colors flex items-center gap-2`}
            >
              <PlaySquare size={16} />
              Simulations
            </Link>
          </div>
        </div>
        <WalletConnect onConnect={() => null} />
      </div>
    </nav>
  );
};

export default Navigation;
