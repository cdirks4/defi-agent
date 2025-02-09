/**
 * Optimized technical indicators for market analysis
 */

// Simple Moving Average (SMA) with single pass calculation
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  let sum = 0;
  
  // Calculate initial sum
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }
  
  if (period <= prices.length) {
    sma.push(sum / period);
  }
  
  // Calculate remaining SMAs using sliding window
  for (let i = period; i < prices.length; i++) {
    sum = sum - prices[i - period] + prices[i];
    sma.push(sum / period);
  }
  
  return sma;
}

// Exponential Moving Average (EMA) with optimized multiplier calculation
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  const inverseMultiplier = 1 - multiplier;
  
  // Start with SMA
  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }
  
  if (prices.length < period) return ema;
  
  ema.push(sum / period);
  
  // Calculate EMA using pre-calculated multipliers
  for (let i = period; i < prices.length; i++) {
    ema.push(prices[i] * multiplier + ema[ema.length - 1] * inverseMultiplier);
  }
  
  return ema;
}

// RSI with optimized gain/loss tracking and safety checks
export function calculateRSI(prices: number[], period: number = 14): number[] {
  // Safety check for minimum required data points
  if (!prices || prices.length < 2) {
    return [];
  }

  const rsi: number[] = [];
  const changes: number[] = new Array(prices.length - 1);
  let sumGain = 0;
  let sumLoss = 0;
  
  // Pre-calculate price changes
  for (let i = 1; i < prices.length; i++) {
    changes[i - 1] = prices[i] - prices[i - 1];
  }
  
  // Safety check for minimum required changes
  if (changes.length < period) {
    return [];
  }
  
  // Calculate initial averages
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) sumGain += changes[i];
    else sumLoss -= changes[i];
  }
  
  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;
  
  // Avoid division by zero
  if (avgLoss === 0) {
    rsi.push(100);
  } else {
    rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
  }
  
  // Calculate remaining RSI values using optimized formula
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
    
    // Avoid division by zero
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
    }
  }
  
  return rsi;
}

// MACD with shared EMA calculations
export function calculateMACD(prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
} {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macdLine = new Array(slowEMA.length);
  
  // Calculate MACD line
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine[i] = fastEMA[i + (slowPeriod - fastPeriod)] - slowEMA[i];
  }
  
  // Calculate Signal line
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  // Calculate histogram
  const histogram = new Array(signalLine.length);
  for (let i = 0; i < signalLine.length; i++) {
    histogram[i] = macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i];
  }
  
  return { macdLine, signalLine, histogram };
}

// Bollinger Bands with optimized standard deviation calculation
export function calculateBollingerBands(prices: number[], period = 20, stdDev = 2): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const middle = calculateSMA(prices, period);
  const upper = new Array(middle.length);
  const lower = new Array(middle.length);
  
  for (let i = period - 1; i < prices.length; i++) {
    let sumSquaredDiff = 0;
    const avg = middle[i - (period - 1)];
    
    // Calculate variance in single pass
    for (let j = i - period + 1; j <= i; j++) {
      const diff = prices[j] - avg;
      sumSquaredDiff += diff * diff;
    }
    
    const std = Math.sqrt(sumSquaredDiff / period);
    const bandWidth = stdDev * std;
    
    upper[i - (period - 1)] = avg + bandWidth;
    lower[i - (period - 1)] = avg - bandWidth;
  }
  
  return { upper, middle, lower };
}

// Optimized price extraction with type checking and validation
export function extractPricesFromTrades(trades: any[]): number[] {
  if (!Array.isArray(trades) || trades.length === 0) {
    return [];
  }

  return trades.reduce((prices: number[], trade) => {
    const price = typeof trade.price === 'number' ? 
      trade.price : 
      typeof trade.amountUSD === 'string' ? 
        parseFloat(trade.amountUSD) : 
        0;
        
    if (price > 0) prices.push(price);
    return prices;
  }, []);
}
