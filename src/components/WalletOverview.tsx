import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { agentKit } from "@/services/agentkit";
import { uniswapService } from "@/services/uniswap";
import { ethers } from "ethers";
import { RPC_URLS, WETH_ADDRESSES } from "@/lib/constants";
import Spinner from "./base/Spinner";
import { TOKEN_ADDRESSES, ERC20_ABI } from "@/lib/constants";
import TokenTransferButton from "./TokenTransferButton";
import UnwrapWethButton from "./UnwrapWethButton";

interface TokenBalance {
  id: string;
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

        const provider = await getProvider();
        const network = process.env.NEXT_PUBLIC_CHAIN || "arbitrum-sepolia";
        const tokenList =
          TOKEN_ADDRESSES[network as keyof typeof TOKEN_ADDRESSES];

        // Fetch native balances
        const [userNativeBalance, agentNativeBalance] = await Promise.all([
          provider.getBalance(user.wallet.address),
          agentKit.getWalletAddress()
            ? provider.getBalance(agentKit.getWalletAddress())
            : BigInt(0),
        ]);

        setUserNative({
          balance: Number(ethers.formatEther(userNativeBalance)).toFixed(4),
          usdValue: (
            Number(ethers.formatEther(userNativeBalance)) * 2000
          ).toFixed(2),
        });

        if (agentKit.getWalletAddress()) {
          setAgentNative({
            balance: Number(ethers.formatEther(agentNativeBalance)).toFixed(4),
            usdValue: (
              Number(ethers.formatEther(agentNativeBalance)) * 2000
            ).toFixed(2),
          });
        }

        // Fetch token balances
        const fetchTokenBalance = async (
          address: string,
          tokenAddress: string,
          symbol: string
        ) => {
          try {
            const contract = new ethers.Contract(
              tokenAddress,
              ERC20_ABI,
              provider
            );
            const [balance, decimals] = await Promise.all([
              contract.balanceOf(address),
              contract.decimals(),
            ]);

            const formatted = ethers.formatUnits(balance, decimals);
            return {
              id: tokenAddress,
              symbol,
              balance: Number(formatted).toFixed(4),
              usdValue: (Number(formatted) * 2000).toFixed(2), // Using fixed price for demo
            };
          } catch (error) {
            console.debug(`Error fetching balance for ${symbol}:`, error);
            return {
              id: tokenAddress,
              symbol,
              balance: "0.0000",
              usdValue: "0.00",
            };
          }
        };

        // Fetch user token balances
        const userBalancePromises = Object.entries(tokenList).map(
          ([symbol, address]) =>
            fetchTokenBalance(user.wallet.address, address, symbol)
        );
        const userBalances = await Promise.all(userBalancePromises);
        setUserTokens(userBalances);

        // Fetch agent token balances
        if (agentKit.getWalletAddress()) {
          const agentBalancePromises = Object.entries(tokenList).map(
            ([symbol, address]) =>
              fetchTokenBalance(agentKit.getWalletAddress()!, address, symbol)
          );
          const agentBalances = await Promise.all(agentBalancePromises);
          setAgentTokens(agentBalances);
        }
      } catch (error) {
        console.error("Failed to fetch balances:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load wallet balances"
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
              key={token.id}
              className={`bg-gray-700 p-3 rounded ${
                Number(token.balance) > 0 ? "border border-green-500" : ""
              }`}
            >
              <div className="font-medium">{token.symbol}</div>
              <div>{token.balance}</div>
              <div className="text-sm text-gray-400">${token.usdValue}</div>
              {token.symbol === "WETH" && Number(token.balance) > 0 && (
                <UnwrapWethButton
                  walletAddress={user?.wallet?.address || ""}
                  balance={token.balance}
                />
              )}
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
          {/* Token Cards with Transfer Buttons */}
          {agentTokens.map((token) => (
            <div
              key={token.id}
              className={`bg-gray-700 p-3 rounded ${
                Number(token.balance) > 0 ? "border border-green-500" : ""
              }`}
            >
              <div className="font-medium">{token.symbol}</div>
              <div>{token.balance}</div>
              <div className="text-sm text-gray-400">${token.usdValue}</div>
              {Number(token.balance) > 0 && user?.wallet?.address && (
                <div className="mt-2">
                  <TokenTransferButton
                    userWalletAddress={user.wallet.address}
                    agentWalletAddress={agentKit.getWalletAddress() || ""}
                    tokenAddress={token.id}
                    tokenSymbol={token.symbol}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
