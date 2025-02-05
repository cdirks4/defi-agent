import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { agentKit } from "@/services/agentkit";
import { uniswapService } from "@/services/uniswap";
import { ethers } from "ethers";
import { RPC_URLS } from "@/lib/constants";

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

    // Try primary RPC first
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URLS[chain]);
      await provider.getNetwork(); // Test the connection
      return provider;
    } catch (error) {
      console.warn("Primary RPC failed, trying fallback:", error);

      // Try fallback RPC if primary fails
      try {
        const fallbackProvider = new ethers.JsonRpcProvider(
          RPC_URLS.FALLBACK_TESTNET
        );
        await fallbackProvider.getNetwork(); // Test the connection
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
          // Ensure token has all required fields and valid values
          if (!token.symbol || !token.id || !token.priceUSD) {
            console.debug(`Skipping token due to missing data:`, token);
            return false;
          }
          
          // Validate token address
          if (!ethers.isAddress(token.id)) {
            console.debug(`Skipping token with invalid address: ${token.id}`);
            return false;
          }
          
          // Ensure price is a valid positive number
          const price = Number(token.priceUSD);
          if (isNaN(price) || price <= 0) {
            console.debug(`Skipping token with invalid price: ${token.symbol}`);
            return false;
          }
          
          return true;
        });

        // Get provider with fallback support
        const provider = await getProvider();

        // User native balance
        const userNativeBalance = await provider.getBalance(
          user.wallet.address
        );
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

        // Fetch user token balances
        const userBalances = await Promise.all(
          tokens.map(async (token) => {
            try {
              if (!ethers.isAddress(token.id)) {
                console.debug(`Invalid token address: ${token.id}`);
                return null;
              }

              const balance = await agentKit.getTokenBalance(
                user.wallet.address,
                token.id
              );

              // Skip tokens with no balance or failed contract calls
              if (!balance || balance === "0" || balance === "0.0") {
                console.debug(`No balance for token ${token.symbol}`);
                return null;
              }

              // Validate balance is a valid number
              const numBalance = Number(balance);
              if (isNaN(numBalance) || numBalance <= 0) {
                console.debug(`Invalid balance for token ${token.symbol}: ${balance}`);
                return null;
              }

              // Calculate USD value
              const usdValue = (numBalance * Number(token.priceUSD)).toFixed(2);
              if (isNaN(Number(usdValue))) {
                console.debug(`Invalid USD value calculation for ${token.symbol}`);
                return null;
              }

              return {
                symbol: token.symbol,
                balance: numBalance.toFixed(4),
                usdValue,
              };
            } catch (error) {
              console.debug(
                `Skipping token ${token.symbol} (${token.id}): ${error}`
              );
              return null;
            }
          })
        );

        const validUserBalances = userBalances.filter(
          Boolean
        ) as TokenBalance[];
        setUserTokens(validUserBalances);

        // Fetch agent token balances
        if (agentAddress) {
          const agentBalances = await Promise.all(
            tokens.map(async (token) => {
              try {
                if (!ethers.isAddress(token.id)) {
                  console.debug(`Invalid token address for agent: ${token.id}`);
                  return null;
                }

                const balance = await agentKit.getTokenBalance(
                  agentAddress,
                  token.id
                );

                // Skip tokens with no balance or failed contract calls
                if (!balance || balance === "0" || balance === "0.0") {
                  console.debug(`No agent balance for token ${token.symbol}`);
                  return null;
                }

                // Validate balance is a valid number
                const numBalance = Number(balance);
                if (isNaN(numBalance) || numBalance <= 0) {
                  console.debug(`Invalid agent balance for token ${token.symbol}: ${balance}`);
                  return null;
                }

                // Calculate USD value
                const usdValue = (numBalance * Number(token.priceUSD)).toFixed(2);
                if (isNaN(Number(usdValue))) {
                  console.debug(`Invalid USD value calculation for agent ${token.symbol}`);
                  return null;
                }

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
                return null;
              }
            })
          );
          setAgentTokens(agentBalances.filter(Boolean) as TokenBalance[]);
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
        <div className="text-center">Loading wallet balances...</div>
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
        <div className="grid grid-cols-3 gap-4">
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
            <div key={token.symbol} className="bg-gray-700 p-3 rounded">
              <div className="font-medium">{token.symbol}</div>
              <div>{token.balance}</div>
              <div className="text-sm text-gray-400">${token.usdValue}</div>
            </div>
          ))}
          {!userNative && userTokens.length === 0 && (
            <div className="col-span-3 text-center text-gray-400">
              No tokens found
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Agent Wallet</h2>
        <div className="grid grid-cols-3 gap-4">
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
            <div key={token.symbol} className="bg-gray-700 p-3 rounded">
              <div className="font-medium">{token.symbol}</div>
              <div>{token.balance}</div>
              <div className="text-sm text-gray-400">${token.usdValue}</div>
            </div>
          ))}
          {!agentNative && agentTokens.length === 0 && (
            <div className="col-span-3 text-center text-gray-400">
              No tokens found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
