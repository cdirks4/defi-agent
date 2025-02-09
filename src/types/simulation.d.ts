export interface TradingStrategyConfig {
  strategy: 'momentum' | 'meanReversion' | 'volatilityBreakout';
  stopLoss: number;
  takeProfit: number;
  tradeSizeScaling: number;
}

export interface SimulationParams {
  // Start date for the simulation period (ISO string)
  startDate: string;
  // End date for the simulation period (ISO string)
  endDate: string;
  // Uniswap pool ID to simulate trading for
  poolId: string;
  // Initial capital to simulate with
  initialCapital: number;
  // Size of each simulated trade
  tradeSize: number;
  // If true, simulates live trading for the specified duration
  // If false, simulates historical trading using past data
  simulateLive?: boolean;
  // Duration of simulation in minutes (defaults to 15 if not specified)
  simulationDuration?: number;
  // Factor by which to extend the historical data lookup window (e.g., 2 doubles the window)
  windowExtensionFactor?: number;
  // Trading strategy configuration
  strategyConfig?: TradingStrategyConfig;
  // Optional sampling interval in minutes for long historical periods
  samplingInterval?: number;
}

export interface SimulationTrade {
  timestamp: string;
  // Type can be BUY or SELL. A HOLD decision is represented by skipping the trade entirely
  type: 'BUY' | 'SELL';
  price: number;
  amount: string;
  profit?: number;
  confidence: number;
  reasoning: string;
  // New fields for strategy-based trades
  targetPrice?: number;
  stopLossPrice?: number;
}

export interface HistoricalTrade {
  timestamp: string;
  price: number;
  amountUSD: string;
  type: 'buy' | 'sell';
}

export interface TechnicalIndicators {
  sma: number[];
  ema: number[];
  rsi: number[];
  macd: {
    macdLine: number[];
    signalLine: number[];
    histogram: number[];
  };
  bollingerBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
}

export interface MarketContext {
  averageSpread: number;
  volatility: number;
  volume: number;
  technicalIndicators: TechnicalIndicators;
}

export interface SimulationMetrics {
  totalTrades: number;
  successfulTrades: number;
  totalProfit: number;
  winRate: number;
  averageReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  totalTransactionCost: number;
  averageSlippage: number;
  benchmarkReturn: number;
  benchmarkProfitFactor: number;
}

export interface SimulationResult {
  // List of simulated trades executed during the simulation period
  trades: SimulationTrade[];
  // Historical trades that occurred between simulated trades
  linkedHistoricalTrades: HistoricalTrade[];
  // Unique identifier for live simulations
  simulationId?: string;
  metrics: SimulationMetrics;
  marketContext: MarketContext;
  // Indicates whether this was a live simulation or historical simulation
  isLiveSimulation?: boolean;
  // Duration of the simulation in minutes
  simulationDuration: number;
  // Whether an extended window was used to fetch historical data
  usedExtendedWindow?: boolean;
  // Current progress of the simulation (0-100)
  progress?: number;
  // Whether the simulation is still running
  isRunning?: boolean;
}
