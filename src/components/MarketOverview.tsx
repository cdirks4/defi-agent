import { useEffect, useState } from "react";
import Spinner from "./base/Spinner";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTopPools, usePoolData, useRecentSwaps } from "@/hooks/useUniswap";

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
}

const MarketOverview = () => {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<string>("");
  const { pools, loading: poolsLoading } = useTopPools();
  const { data: poolData, loading: poolLoading } = usePoolData(selectedPool);
  const { swaps: recentSwaps, loading: swapsLoading } =
    useRecentSwaps(selectedPool);

  useEffect(() => {
    if (pools && pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0].id);
    }
  }, [pools]);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,arbitrum&vs_currencies=usd&include_24hr_change=true"
        );
        const data = await response.json();

        const formattedData = [
          {
            symbol: "ETH",
            price: data.ethereum.usd,
            change24h: data.ethereum.usd_24h_change,
          },
          {
            symbol: "BTC",
            price: data.bitcoin.usd,
            change24h: data.bitcoin.usd_24h_change,
          },
          {
            symbol: "ARB",
            price: data.arbitrum.usd,
            change24h: data.arbitrum.usd_24h_change,
          },
        ];

        setMarkets(formattedData);
      } catch (error) {
        console.error("Failed to fetch market data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (poolsLoading || loading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-lg font-medium mb-2">TVL</h3>
          <p className="text-2xl">
            ${Number(poolData?.totalValueLockedUSD).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium mb-2">Volume</h3>
          <p className="text-2xl">
            ${Number(poolData?.volumeUSD).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium mb-2">Fee Tier</h3>
          <p className="text-2xl">
            {(Number(poolData?.feeTier) / 10000).toFixed(2)}%
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-6">Market Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {markets.map((market) => (
            <div
              key={market.symbol}
              className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-lg font-medium">{market.symbol}</span>
                <div
                  className={`flex items-center space-x-1 ${
                    market.change24h >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {market.change24h >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{Math.abs(market.change24h).toFixed(2)}%</span>
                </div>
              </div>
              <div className="text-2xl font-bold">
                ${market.price.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-medium mb-4">Recent Swaps</h3>
        <div className="space-y-2">
          {swapsLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="md" color="border-blue-500" />
            </div>
          ) : recentSwaps?.length ? (
            recentSwaps.map((swap, i) => (
              <div key={i} className="flex justify-between items-center">
                <span>
                  {Number(swap.amount0).toFixed(4)} {swap.pool.token0.symbol} →{" "}
                  {Number(swap.amount1).toFixed(4)} {swap.pool.token1.symbol}
                </span>
                <span className="text-muted">
                  ${Number(swap.amountUSD).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">
              No recent swaps found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
