'use client';

import { SimulationResult } from '@/types/simulation';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import StreamingSimulationResults from './StreamingSimulationResults';
import PerformanceChart from './charts/PerformanceChart';
import { safeFormatDate } from '@/lib/safeFormatDate';
import TechnicalIndicatorsChart from './charts/TechnicalIndicatorsChart';
import { useState } from 'react';
import { safeFormatPercentage, safeFormatCurrency, safeFormatNumber } from '@/lib/safeFormatNumber';

interface SimulationResultProps {
  result: SimulationResult;
}

export default function SimulationResultDisplay({ result }: SimulationResultProps) {
  const [showCharts, setShowCharts] = useState(true);
  const simulationId = result.simulationId || (result.isLiveSimulation && result.trades[0] ? 
    `sim_${new Date(result.trades[0].timestamp).getTime()}` : null);

  const formatVolume = (volume: number | null | undefined) => {
    if (volume == null) return '$0';
    return `$${volume.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="space-y-6">
      {simulationId && (
        <StreamingSimulationResults simulationId={simulationId} />
      )}

      <div className="card p-4 mb-4">
        <p className="text-sm text-[var(--muted)] mb-2">
          {result.isLiveSimulation 
            ? `This simulation shows where the AI agent would have entered and exited positions during a ${result.simulationDuration}-minute live trading session.`
            : `This simulation shows where the AI agent would have entered and exited positions based on ${result.simulationDuration} minutes of historical market data.`}
          {" "}No actual trades were executed.
        </p>
      </div>

      {/* Charts Section */}
      <div className="card p-4">
        <button 
          onClick={() => setShowCharts(!showCharts)}
          className="flex items-center justify-between w-full text-lg font-medium mb-4"
        >
          <span>Performance Analysis</span>
          {showCharts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {showCharts && (
          <div className="space-y-6">
            <PerformanceChart trades={result.trades} />
            <TechnicalIndicatorsChart indicators={result.marketContext.technicalIndicators} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">Simulated Win Rate</h3>
          <div className="text-2xl font-bold">
            {safeFormatPercentage(result.metrics.winRate, 1)}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">Projected Profit</h3>
          <div className="text-2xl font-bold">
            {safeFormatCurrency(result.metrics.totalProfit, 2)}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">Simulated Trades</h3>
          <div className="text-2xl font-bold">
            {result.metrics.totalTrades || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">Sharpe Ratio</h3>
          <div className="text-2xl font-bold">
            {safeFormatNumber(result.metrics.sharpeRatio, 2)}
          </div>
          <p className="text-sm text-[var(--muted)]">Risk-adjusted return metric</p>
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">Profit Factor</h3>
          <div className="text-2xl font-bold">
            {safeFormatNumber(result.metrics.profitFactor, 2)}
          </div>
          <p className="text-sm text-[var(--muted)]">Ratio of gains to losses</p>
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">Max Drawdown</h3>
          <div className="text-2xl font-bold">
            {safeFormatPercentage(result.metrics.maxDrawdown, 1)}
          </div>
          <p className="text-sm text-[var(--muted)]">Largest peak-to-trough decline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">Transaction Costs</h3>
          <div className="text-2xl font-bold">
            {safeFormatCurrency(result.metrics.totalTransactionCost, 2)}
          </div>
          <p className="text-sm text-[var(--muted)]">Estimated fees and costs</p>
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">Average Slippage</h3>
          <div className="text-2xl font-bold">
            {safeFormatPercentage(result.metrics.averageSlippage * 100, 2)}
          </div>
          <p className="text-sm text-[var(--muted)]">Average price impact</p>
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-medium mb-2">vs. Buy & Hold</h3>
          <div className="text-2xl font-bold">
            {safeFormatPercentage(result.metrics.benchmarkReturn, 1)}
          </div>
          <p className="text-sm text-[var(--muted)]">Benchmark strategy return</p>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-lg font-medium mb-4">Market Context</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Average Spread</p>
            <p className="text-lg">{safeFormatNumber(result.marketContext.averageSpread, 4)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Volatility</p>
            <p className="text-lg">{safeFormatNumber(result.marketContext.volatility, 4)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">Volume</p>
            <p className="text-lg">{formatVolume(result.marketContext?.volume)}</p>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-lg font-medium mb-4">AI Trading Decisions</h3>
        <div className="space-y-2">
          {result.trades.map((trade, i) => {
            const prevTradeTime = i > 0 ? new Date(result.trades[i-1].timestamp).getTime() : 0;
            const currentTradeTime = new Date(trade.timestamp).getTime();
            const linkedTrades = result.linkedHistoricalTrades?.filter(ht => {
              const htTime = new Date(ht.timestamp).getTime();
              return htTime > prevTradeTime && htTime < currentTradeTime;
            }) || [];

            return (
              <div key={i}>
                {linkedTrades.length > 0 && (
                  <div className="pl-4 border-l-2 border-[var(--card-border)] mb-2 space-y-1">
                    {linkedTrades.map((ht, j) => (
                      <div key={j} className="flex items-center justify-between p-1 text-sm text-[var(--muted)]">
                        <span>{safeFormatDate(ht.timestamp, 'HH:mm:ss')}</span>
                        <div className="flex items-center gap-2">
                          {ht.type === 'buy' ? (
                            <TrendingUp className="w-3 h-3 text-[var(--success)]" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-[var(--error)]" />
                          )}
                          <span>{ht.type.toUpperCase()}</span>
                        </div>
                        <span>{safeFormatCurrency(parseFloat(ht.amountUSD), 2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--card-border)]">
                  <span className="text-sm">
                    {safeFormatDate(trade.timestamp, 'MMM d, HH:mm:ss')}
                  </span>
                  <div className="flex items-center gap-2">
                    {trade.type === 'BUY' ? (
                      <TrendingUp className="w-4 h-4 text-[var(--success)]" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-[var(--error)]" />
                    )}
                    <span>Simulated {trade.type}</span>
                  </div>
                  <span>{safeFormatCurrency(trade.price, 2)}</span>
                  <span className={trade.profit && trade.profit > 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                    {trade.profit ? safeFormatCurrency(trade.profit, 2) : '-'}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {safeFormatPercentage(trade.confidence * 100, 0)} confidence
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
