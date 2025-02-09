'use client';

import { useSimulationStream } from '@/hooks/useSimulationStream';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Loader2, Wifi, WifiOff } from 'lucide-react';
import Button from './base/Button';
import ProgressBar from './base/ProgressBar';

interface StreamingSimulationResultsProps {
  simulationId: string;
  onClearStream?: () => void;
}

export default function StreamingSimulationResults({ 
  simulationId,
  onClearStream 
}: StreamingSimulationResultsProps) {
  const { trades, isStreaming, error, progress, isConnected } = useSimulationStream(simulationId);

  if (error) {
    return (
      <div className="card p-4 text-[var(--error)]">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Live Trading Decisions</h3>
          {isConnected ? (
            <Wifi className="w-4 h-4 text-[var(--success)]" />
          ) : (
            <WifiOff className="w-4 h-4 text-[var(--error)]" />
          )}
          {isStreaming && (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
          )}
        </div>
        {onClearStream && (
          <Button
            label="Clear Stream"
            onClick={onClearStream}
            variant="ghost"
            size="sm"
          />
        )}
      </div>

      {isStreaming && progress < 100 && (
        <div className="card p-4">
          <ProgressBar progress={progress} />
          <p className="text-sm text-[var(--muted)] mt-2 text-center">
            Processing simulation data...
          </p>
        </div>
      )}

      {progress === 100 && (
        <div className="card p-4 bg-[rgba(34,197,94,0.1)] border-[var(--success)]">
          <p className="text-sm text-[var(--success)] text-center">
            Simulation completed
          </p>
        </div>
      )}

      <div className="space-y-2">
        {trades.map((trade, i) => (
          <div 
            key={`${trade.timestamp}-${i}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--card-border)]"
          >
            <span className="text-sm">
              {format(new Date(trade.timestamp), 'HH:mm:ss')}
            </span>
            <div className="flex items-center gap-2">
              {trade.type === 'BUY' ? (
                <TrendingUp className="w-4 h-4 text-[var(--success)]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[var(--error)]" />
              )}
              <span>{trade.type}</span>
            </div>
            <span>${trade.price.toFixed(2)}</span>
            <span className="text-sm text-[var(--muted)]">
              {(trade.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        ))}

        {trades.length === 0 && (
          <div className="text-center text-[var(--muted)] py-4">
            {progress < 100 ? 'Preparing simulation...' : 'No trading decisions made'}
          </div>
        )}
      </div>
    </div>
  );
}
