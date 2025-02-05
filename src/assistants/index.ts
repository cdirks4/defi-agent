import { ethers } from "ethers";
import { createClient } from "urql";
import { cacheExchange, fetchExchange } from "@urql/core";
import { SUBGRAPH_URLS } from "@/lib/constants";
import { agentKit } from "@/services/agentkit";

interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
}

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
  volume: string;
  txCount: string;
  poolCount: string;
  totalValueLockedUSD: string;
  totalValueLocked: string;
  derivedETH: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
  feesUSD: string;
}

const client = createClient({
  url: SUBGRAPH_URLS[
    (process.env.NEXT_PUBLIC_CHAIN as keyof typeof SUBGRAPH_URLS) || "TESTNET"
  ],
  exchanges: [cacheExchange, fetchExchange],
});

const formatTokenValue = (value: string): string => {
  try {
    // Remove decimal points and trailing zeros
    const [whole, decimal = ""] = value.split(".");
    const paddedDecimal = decimal.padEnd(18, "0");
    const fullValue = whole + paddedDecimal;

    // Format the value
    return ethers.formatUnits(fullValue, 18);
  } catch (error) {
    console.error("Error formatting token value:", value, error);
    return "0";
  }
};

const fetchTokenData = async (userId: string) => {
  console.log("🔍 Fetching token data from subgraph...");
  try {
    // Initialize AgentKit wallet with userId
    await agentKit.connectWallet(userId);
    const walletHealth = await agentKit.checkWalletHealth();
    console.log("🔐 AgentKit wallet health:", walletHealth);

    const query = `
      query {
        tokens(
          first: 20, 
          orderBy: volumeUSD, 
          orderDirection: desc,
          where: {
            volumeUSD_gt: "0"
          }
        ) {
          id
          symbol
          name
          decimals
          totalSupply
          volume
          txCount
          poolCount
          totalValueLockedUSD
          totalValueLocked
          derivedETH
          volumeUSD
          feesUSD
          totalValueLockedUSD
        }
      }
    `;

    const result = await client.query(query, {}).toPromise();
    console.log(
      "✅ Token data fetched:",
      result.data?.tokens?.length,
      "tokens"
    );
    return result.data?.tokens || [];
  } catch (error) {
    console.error("❌ Failed to fetch token data:", error);
    return [];
  }
};

// Update the getDeFiAssistant function to make userId optional
export const getDeFiAssistant = async (userId?: string) => {
  console.log("🤖 Initializing DeFi Assistant...");

  // Initialize without wallet if no userId
  let walletStatus = "Not connected";
  if (userId) {
    try {
      await agentKit.connectWallet(userId);
      walletStatus = "Connected";
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  }

  // Fetch both market and token data
  console.log("📊 Fetching market and token data...");
  const [marketResponse, tokens] = await Promise.all([
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,arbitrum&vs_currencies=usd&include_24hr_change=true"
    ),
    fetchTokenData(userId),
  ]);

  const marketData = await marketResponse.json();
  console.log("💹 Market data received:", marketData);

  const markets: MarketData[] = [
    {
      symbol: "ETH",
      price: marketData.ethereum.usd,
      volume: 0,
      change24h: marketData.ethereum.usd_24h_change,
    },
    {
      symbol: "BTC",
      price: marketData.bitcoin.usd,
      volume: 0,
      change24h: marketData.bitcoin.usd_24h_change,
    },
    {
      symbol: "ARB",
      price: marketData.arbitrum.usd,
      volume: 0,
      change24h: marketData.arbitrum.usd_24h_change,
    },
  ];

  // Format token data for the assistant with improved metrics and sorting
  console.log("🔄 Formatting token data...");
  const tokenInfo = tokens
    .map((token: TokenData) => {
      try {
        const tvl = formatTokenValue(token.totalValueLockedUSD);
        const volume = formatTokenValue(token.volumeUSD || token.volume);
        const priceInEth = token.derivedETH || "0";
        const priceInUSD = Number(priceInEth) * marketData.ethereum.usd;
        const fees = formatTokenValue(token.feesUSD || "0");

        return {
          symbol: token.symbol,
          name: token.name,
          address: token.id,
          tvl,
          volume: Number(volume),
          volumeUSD: token.volumeUSD,
          pools: token.poolCount,
          price: priceInUSD.toFixed(6),
          priceInETH: Number(priceInEth).toFixed(8),
          txCount: token.txCount,
          fees,
          canTrade: walletHealth,
          minTradeSize: "0.01",
          maxTradeSize: "100",
        };
      } catch (error) {
        console.error("Error processing token:", token.symbol, error);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.volume - a.volume);

  console.log("📝 Formatted token info:", tokenInfo);

  // Find highest volume token
  const highestVolumeToken = tokenInfo[0];
  console.log("🔝 Highest volume token:", highestVolumeToken?.symbol);

  const marketText = markets
    .map(
      (market) =>
        `${market.symbol}: $${market.price.toFixed(
          2
        )} (${market.change24h.toFixed(2)}%)`
    )
    .join("\n");

  const tokenText = tokenInfo
    .map(
      (token, index) =>
        `${index + 1}. ${token.symbol} (${token.name})\n` +
        `• Price: $${token.price} (${token.priceInETH} ETH)\n` +
        `• TVL: $${Number(token.tvl).toFixed(2)}M\n` +
        `• 24h Volume: $${token.volume.toFixed(2)}M\n` +
        `• Pools: ${token.pools}\n` +
        `• Transactions: ${token.txCount}\n` +
        `• Fees Generated: $${Number(token.fees).toFixed(2)}M`
    )
    .join("\n\n");

  const assistant = {
    name: "DeFi Trading Assistant",
    firstMessage: `Hello! I'm your autonomous DeFi trading assistant powered by AgentKit. I can help execute trades and manage positions across ${
      tokenInfo.length
    } tokens.

Current wallet balance: ${await agentKit.getBalance()} ETH

I can help with:
• Executing trades within your specified parameters
• Monitoring token prices and market trends
• Managing risk limits and position sizes
• Automating trading strategies
• Tracking portfolio performance

Currently, ${
      highestVolumeToken?.symbol
    } has the highest 24h trading volume at $${highestVolumeToken?.volume.toFixed(
      2
    )}M.
ETH price is $${marketData.ethereum.usd.toFixed(
      2
    )}. What would you like to trade?`,

    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en-US",
    },
    voice: {
      provider: "cartesia",
      voiceId: "565510e8-6b45-45de-8758-13588fbaec73",
    },
    analysisPlan: {
      structuredDataPrompt: `YOU ARE TO RETURN JSON FOR ALL TRADING ACTIONS.

      ## Structured JSON for DeFi Trading Actions
      
      Array of actions containing:
      1. Action Type: "BUY" | "SELL" | "PROVIDE_LIQUIDITY" | "REMOVE_LIQUIDITY"
      2. Token Symbol: Must match available markets or tokens
      3. Amount: Numeric value (must be within min/max trade size)
      4. Price: Target price in USD
      5. Wallet: "${agentKit.getWalletAddress()}"
      
      Trading Rules:
      - All trades must be within specified min/max sizes
      - Wallet must have sufficient balance
      - Prices must be within 1% of current market price
      
      Available Tokens and Analytics:\n${tokenText}`,
    },
  };

  console.log("✨ DeFi Trading Assistant initialized successfully");
  return assistant;
};
