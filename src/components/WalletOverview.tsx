import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { agentKit } from "@/services/agentkit";
import { uniswapService } from "@/services/uniswap";
import { ethers } from "ethers";
import { RPC_URLS } from "@/lib/constants";
import Spinner from "./base/Spinner";

interface TokenBalance {
  symbol: string;
  balance: string;
  usdValue: string;
}

interface NativeBalance {
  balance: string;
  usdValue: string;
}

export function WalletOverview() {
  const { user, authenticated } = usePrivy();
  const [userTokens, setUserTokens] = useState<TokenBalance[]>([]);
  const [agentTokens, setAgentTokens] = useState<TokenBalance[]>([]);
  const [userNative, setUserNative] = useState<NativeBalance | null>(null);
  const [agentNative, setAgentNative] = useState<NativeBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getProvider = async () => {
    const chain =
      (process.env.NEXT_PUBLIC_CHAIN as keyof typeof RPC_URLS) || "TESTNET";

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URLS[chain]);
      await provider.getNetwork();
      return provider;
    } catch (error) {
      console.warn("Primary RPC failed, trying fallback:", error);
      try {
        const fallbackProvider = new ethers.JsonRpcProvider(
          RPC_URLS.FALLBACK_TESTNET
        );
        await fallbackProvider.getNetwork();
        return fallbackProvider;
      } catch (fallbackError) {
        console.error("All RPC connections failed:", fallbackError);
        throw new Error("Failed to connect to blockchain network");
      }
    }
  };

  useEffect(() => {
    const fetchBalances = async () => {
      if (!authenticated || !user?.wallet?.address) return;

      try {
        setLoading(true);
        setError(null);

        // Get token list and ETH price from Uniswap
        const poolData = await uniswapService.getPoolData();
        const tokens = poolData.inputTokens.filter((token) => {
          if (!token.symbol || !token.id || !token.priceUSD) {
            console.debug(`Skipping token due to missing data:`, token);
            return false;
          }
          
          if (!ethers.isAddress(token.id)) {
            console.debug(`Skipping token with invalid address: ${token.id}`);
            return false;
          }
          
          const price = Number(token.priceUSD);
          if (isNaN(price) || price <= 0) {
            console.debug(`Skipping token with invalid price: ${token.symbol}`);
            return false;
          }
          
          return true;
        });

        const provider = await getProvider();

        // User native balance
        const userNativeBalance = await provider.getBalance(user.wallet.address);
        const userNativeFormatted = ethers.formatEther(userNativeBalance);
        setUserNative({
          balance: Number(userNativeFormatted).toFixed(4),
          usdValue: (Number(userNativeFormatted) * 2000).toFixed(2),
        });

        // Agent native balance
        const agentAddress = agentKit.getWalletAddress();
        if (agentAddress) {
          const agentNativeBalance = await provider.getBalance(agentAddress);
          const agentNativeFormatted = ethers.formatEther(agentNativeBalance);
          setAgentNative({
            balance: Number(agentNativeFormatted).toFixed(4),
            usdValue: (Number(agentNativeFormatted) * 2000).toFixed(2),
          });
        }

        // Fetch user token balances for all tokens
        const userBalances = await Promise.all(
          tokens.map(async (token) => {
            try {
              const balance = await agentKit.getTokenBalance(
                user.wallet.address,
                token.id
              );

              const numBalance = Number(balance);
              const usdValue = (numBalance * Number(token.priceUSD)).toFixed(2);

              return {
                symbol: token.symbol,
                balance: numBalance.toFixed(4),
                usdValue,
              };
            } catch (error) {
              console.debug(
                `Error fetching balance for ${token.symbol} (${token.id}):`,
                error
              );
              return {
                symbol: token.symbol,
                balance: "0.0000",
                usdValue: "0.00",
              };
            }
          })
        );

        setUserTokens(userBalances);

        // Fetch agent token balances for all tokens
        if (agentAddress) {
          const agentBalances = await Promise.all(
            tokens.map(async (token) => {
              try {
                const balance = await agentKit.getTokenBalance(
                  agentAddress,
                  token.id
                );

                const numBalance = Number(balance);
                const usdValue = (numBalance * Number(token.priceUSD)).toFixed(2);

                return {
                  symbol: token.symbol,
                  balance: numBalance.toFixed(4),
                  usdValue,
                };
              } catch (error) {
                console.debug(
                  `Error fetching agent balance for ${token.symbol}:`,
                  error
                );
                return {
                  symbol: token.symbol,
                  balance: "0.0000",
                  usdValue: "0.00",
                };
              }
            })
          );
          setAgentTokens(agentBalances);
        }
      } catch (error) {
        console.error("Failed to fetch balances:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load wallet balances. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [authenticated, user]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="text-center">
          <Spinner />
          <div className="mt-2">Loading wallet balances...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Your Wallet</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Native Currency Card */}
          {userNative && (
            <div className="bg-gray-700 p-3 rounded border border-blue-500">
              <div className="font-medium">ETH</div>
              <div>{userNative.balance}</div>
              <div className="text-sm text-gray-400">
                ${userNative.usdValue}
              </div>
            </div>
          )}
          {/* Token Cards */}
          {userTokens.map((token) => (
            <div 
              key={token.symbol} 
              className={`bg-gray-700 p-3 rounded ${
                Number(token.balance) > 0 ? 'border border-green-500' : ''
              }`}
            >
              <div className="font-medium">{token.symbol}</div>
              <div>{token.balance}</div>
              <div className="text-sm text-gray-400">${token.usdValue}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Agent Wallet</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Native Currency Card */}
          {agentNative && (
            <div className="bg-gray-700 p-3 rounded border border-blue-500">
              <div className="font-medium">ETH</div>
              <div>{agentNative.balance}</div>
              <div className="text-sm text-gray-400">
                ${agentNative.usdValue}
              </div>
            </div>
          )}
          {/* Token Cards */}
          {agentTokens.map((token) => (
            <div 
              key={token.symbol} 
              className={`bg-gray-700 p-3 rounded ${
                Number(token.balance) > 0 ? 'border border-green-500' : ''
              }`}
            >
              <div className="font-medium">{token.symbol}</div>
              <div>{token.balance}</div>
              <div className="text-sm text-gray-400">${token.usdValue}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
