'use client';

import Button from "@/components/base/Button";
import { TradingStrategyConfig } from "@/types/simulation";
import { useState } from "react";

interface StrategyConfigurationFormProps {
  onConfigChange: (config: TradingStrategyConfig) => void;
  defaultConfig?: TradingStrategyConfig;
}

export default function StrategyConfigurationForm({
  onConfigChange,
  defaultConfig
}: StrategyConfigurationFormProps) {
  const [config, setConfig] = useState<TradingStrategyConfig>(defaultConfig || {
    strategy: "momentum",
    stopLoss: 0.2,
    takeProfit: 0.5,
    tradeSizeScaling: 1.0
  });

  const handleChange = (field: keyof TradingStrategyConfig, value: string | number) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Trading Strategy
        </label>
        <select
          className="w-full px-3 py-2 border rounded bg-[var(--background)] text-[var(--foreground)]"
          value={config.strategy}
          onChange={(e) => handleChange('strategy', e.target.value)}
        >
          <option value="momentum">Momentum</option>
          <option value="meanReversion">Mean Reversion</option>
          <option value="volatilityBreakout">Volatility Breakout</option>
        </select>
        <p className="text-sm text-[var(--muted)] mt-1">
          {config.strategy === 'momentum' && 'Follows trend direction using momentum indicators'}
          {config.strategy === 'meanReversion' && 'Trades price returns to moving average'}
          {config.strategy === 'volatilityBreakout' && 'Captures significant price movements'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Stop Loss (%)
        </label>
        <input
          type="number"
          min="0.1"
          max="5"
          step="0.1"
          value={config.stopLoss}
          onChange={(e) => handleChange('stopLoss', parseFloat(e.target.value))}
          className="w-24 px-3 py-2 border rounded bg-[var(--background)] text-[var(--foreground)]"
        />
        <p className="text-sm text-[var(--muted)] mt-1">
          Maximum loss before exiting position (0.1-5%)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Take Profit (%)
        </label>
        <input
          type="number"
          min="0.2"
          max="10"
          step="0.1"
          value={config.takeProfit}
          onChange={(e) => handleChange('takeProfit', parseFloat(e.target.value))}
          className="w-24 px-3 py-2 border rounded bg-[var(--background)] text-[var(--foreground)]"
        />
        <p className="text-sm text-[var(--muted)] mt-1">
          Target profit level for position exit (0.2-10%)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Trade Size Scaling
        </label>
        <input
          type="number"
          min="0.1"
          max="2"
          step="0.1"
          value={config.tradeSizeScaling}
          onChange={(e) => handleChange('tradeSizeScaling', parseFloat(e.target.value))}
          className="w-24 px-3 py-2 border rounded bg-[var(--background)] text-[var(--foreground)]"
        />
        <p className="text-sm text-[var(--muted)] mt-1">
          Multiplier for base trade size (0.1-2x)
        </p>
      </div>
    </div>
  );
}
