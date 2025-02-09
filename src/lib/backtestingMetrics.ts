/**
 * Helper functions for calculating advanced trading performance metrics
 */

// Calculate Sharpe Ratio
// Assumes returns are already annualized and we're using a 0% risk-free rate for simplicity
export function calculateSharpeRatio(returns: number[]): number {
  if (returns.length < 2) return 0;
  
  const averageReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - averageReturn, 2), 0) / (returns.length - 1);
  const standardDeviation = Math.sqrt(variance);
  
  // Avoid division by zero
  if (standardDeviation === 0) return 0;
  
  // Using 0 as risk-free rate for simplicity
  return averageReturn / standardDeviation;
}

// Calculate Profit Factor (total gains / total losses)
export function calculateProfitFactor(trades: { profit: number }[]): number {
  const gains = trades
    .filter(trade => trade.profit > 0)
    .reduce((sum, trade) => sum + trade.profit, 0);
  
  const losses = Math.abs(
    trades
      .filter(trade => trade.profit < 0)
      .reduce((sum, trade) => sum + trade.profit, 0)
  );
  
  // Avoid division by zero
  if (losses === 0) return gains > 0 ? Infinity : 1;
  
  return gains / losses;
}

// Calculate transaction costs based on trade size and fixed percentage
export function calculateTransactionCosts(trades: { amount: string }[], feePercentage: number = 0.003): number {
  return trades.reduce((total, trade) => {
    const amount = parseFloat(trade.amount);
    return total + (amount * feePercentage);
  }, 0);
}

// Calculate average slippage (assuming 0.1% base slippage plus volume-based adjustment)
export function calculateAverageSlippage(trades: { amount: string }[], baseSlippage: number = 0.001): number {
  if (trades.length === 0) return 0;
  
  const slippageTotal = trades.reduce((total, trade) => {
    const amount = parseFloat(trade.amount);
    // Increase slippage for larger trades (simplified model)
    const volumeAdjustment = amount > 1 ? Math.log10(amount) * 0.0001 : 0;
    return total + (baseSlippage + volumeAdjustment);
  }, 0);
  
  return slippageTotal / trades.length;
}

// Calculate benchmark return (buy and hold strategy)
export function calculateBenchmarkReturn(firstPrice: number, lastPrice: number): number {
  return ((lastPrice - firstPrice) / firstPrice) * 100;
}

// Calculate benchmark profit factor
export function calculateBenchmarkProfitFactor(firstPrice: number, lastPrice: number): number {
  const profit = lastPrice - firstPrice;
  if (profit > 0) return Infinity; // Only gains, no losses
  if (profit < 0) return 0; // Only losses, no gains
  return 1; // No change
}

// Calculate periodic returns from trade prices
export function calculatePeriodicReturns(trades: { price: number }[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < trades.length; i++) {
    const returnValue = (trades[i].price - trades[i-1].price) / trades[i-1].price;
    returns.push(returnValue);
  }
  return returns;
}
