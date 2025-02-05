"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { useEffect } from "react";

interface PrivyProviderWrapperProps {
  children: React.ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      console.error("Privy App ID not found in environment variables");
    }
  }, []);

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#a855f7",
          showWalletLoginFirst: true,
        },
        defaultChain: {
          id: 421614,
          name: "Arbitrum Sepolia",
          rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
          blockExplorer: "https://sepolia.arbiscan.io",
          nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18,
          },
        },
        supportedChains: [
          {
            id: 421614,
            name: "Arbitrum Sepolia",
            rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
            blockExplorers: {
              default: { url: "https://sepolia.arbiscan.io" },
            },
            nativeCurrency: {
              name: "Ethereum",
              symbol: "ETH",
              decimals: 18,
            },
          },
        ],
        embeddedWallets: {
          noPromptOnSignature: true,
          createOnLogin: true,
          requireUserPasswordOnCreate: false,
        },
        defaultAuthMode: "connect-only",
        session: {
          persistence: "permanent",
        },
      }}
      onSuccess={(user, isNewUser) => {
        console.log("Authentication successful", { user, isNewUser });
        if (typeof window !== "undefined") {
          localStorage.setItem("privy_authenticated", "true");
        }
      }}
      onError={(error) => {
        console.error("Privy authentication error:", error);
      }}
    >
      {children}
    </PrivyProvider>
  );
}
