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
  }, [pools, selectedPool]);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-lg font-medium mb-2">TVL</h3>
          <p className="text-2xl">
            ${Number(poolData?.totalValueLockedUSD).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            {poolData?.liquidityProviderCount} LPs
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium mb-2">Volume (24h)</h3>
          <p className="text-2xl">
            ${Number(poolData?.volumeUSD).toLocaleString()}
          </p>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {Number(poolData?.volumeToken0).toFixed(2)}{" "}
              {poolData?.token0.symbol}
            </span>
            <span>
              {Number(poolData?.volumeToken1).toFixed(2)}{" "}
              {poolData?.token1.symbol}
            </span>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium mb-2">Fees (24h)</h3>
          <p className="text-2xl">
            ${Number(poolData?.feesUSD).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Total: ${Number(poolData?.collectedFeesUSD).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium mb-2">Price</h3>
          <p className="text-2xl">{Number(poolData?.token0Price).toFixed(6)}</p>
          <p className="text-sm text-muted-foreground">
            1 {poolData?.token0.symbol} ={" "}
            {Number(poolData?.token1Price).toFixed(6)} {poolData?.token1.symbol}
          </p>
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
