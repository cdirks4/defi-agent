import { TradingStrategyConfig, SimulationTrade, HistoricalTrade } from '@/types/simulation';
import { TechnicalIndicators } from '@/types/simulation';

interface TradeDecision {
  shouldTrade: boolean;
  type?: 'BUY' | 'SELL';
  confidence: number;
  reasoning: string;
}

export function makeTradeDecision(
  trade: HistoricalTrade,
  indicators: TechnicalIndicators,
  strategyConfig: TradingStrategyConfig,
  prevTrade?: SimulationTrade
): TradeDecision {
  const { strategy } = strategyConfig;
  let decision: TradeDecision = { shouldTrade: false, confidence: 0, reasoning: '' };

  // Get latest indicator values
  const lastRsi = indicators.rsi[indicators.rsi.length - 1];
  const lastMacd = indicators.macd.macdLine[indicators.macd.macdLine.length - 1];
  const lastSignal = indicators.macd.signalLine[indicators.macd.signalLine.length - 1];
  const lastBB = {
    upper: indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1],
    middle: indicators.bollingerBands.middle[indicators.bollingerBands.middle.length - 1],
    lower: indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1]
  };

  switch (strategy) {
    case 'momentum':
      // MACD crossover strategy with RSI confirmation
      if (lastMacd > lastSignal && lastRsi < 70) {
        decision = {
          shouldTrade: true,
          type: 'BUY',
          confidence: calculateConfidence(lastRsi, 30, 70),
          reasoning: 'MACD crossed above signal line with RSI below overbought'
        };
      } else if (lastMacd < lastSignal && lastRsi > 30) {
        decision = {
          shouldTrade: true,
          type: 'SELL',
          confidence: calculateConfidence(lastRsi, 30, 70),
          reasoning: 'MACD crossed below signal line with RSI above oversold'
        };
      }
      break;

    case 'meanReversion':
      // Bollinger Bands strategy
      if (trade.price <= lastBB.lower && lastRsi < 30) {
        decision = {
          shouldTrade: true,
          type: 'BUY',
          confidence: calculateConfidence(trade.price, lastBB.lower, lastBB.upper),
          reasoning: 'Price below lower Bollinger Band with oversold RSI'
        };
      } else if (trade.price >= lastBB.upper && lastRsi > 70) {
        decision = {
          shouldTrade: true,
          type: 'SELL',
          confidence: calculateConfidence(trade.price, lastBB.lower, lastBB.upper),
          reasoning: 'Price above upper Bollinger Band with overbought RSI'
        };
      }
      break;

    case 'volatilityBreakout':
      // Volatility breakout using Bollinger Bands width
      const bandWidth = lastBB.upper - lastBB.lower;
      const avgBandWidth = indicators.bollingerBands.upper.reduce((sum, val, i) => 
        sum + (val - indicators.bollingerBands.lower[i]), 0) / indicators.bollingerBands.upper.length;
      
      if (bandWidth > avgBandWidth * 1.2 && lastMacd > lastSignal) {
        decision = {
          shouldTrade: true,
          type: 'BUY',
          confidence: Math.min((bandWidth / avgBandWidth - 1), 1),
          reasoning: 'Volatility expansion with positive MACD momentum'
        };
      } else if (bandWidth > avgBandWidth * 1.2 && lastMacd < lastSignal) {
        decision = {
          shouldTrade: true,
          type: 'SELL',
          confidence: Math.min((bandWidth / avgBandWidth - 1), 1),
          reasoning: 'Volatility expansion with negative MACD momentum'
        };
      }
      break;
  }

  // Prevent consecutive trades of the same type
  if (prevTrade && decision.type === prevTrade.type) {
    return { shouldTrade: false, confidence: 0, reasoning: 'Avoiding consecutive trades of same type' };
  }

  return decision;
}

function calculateConfidence(value: number, min: number, max: number): number {
  const range = max - min;
  const normalized = Math.abs((value - min) / range);
  return Math.max(0, Math.min(1, normalized));
}

export function calculateTradeMetrics(trades: SimulationTrade[]): {
  successfulTrades: number;
  totalProfit: number;
  winRate: number;
  averageReturn: number;
  maxDrawdown: number;
} {
  let successfulTrades = 0;
  let totalProfit = 0;
  let maxDrawdown = 0;
  let peakValue = 0;
  let currentDrawdown = 0;

  trades.forEach((trade, i) => {
    if (trade.profit) {
      totalProfit += trade.profit;
      if (trade.profit > 0) successfulTrades++;

      // Update peak value and calculate drawdown
      if (totalProfit > peakValue) {
        peakValue = totalProfit;
        currentDrawdown = 0;
      } else {
        currentDrawdown = ((peakValue - totalProfit) / peakValue) * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }
    }
  });

  return {
    successfulTrades,
    totalProfit,
    winRate: trades.length > 0 ? (successfulTrades / trades.length) * 100 : 0,
    averageReturn: trades.length > 0 ? totalProfit / trades.length : 0,
    maxDrawdown
  };
}
