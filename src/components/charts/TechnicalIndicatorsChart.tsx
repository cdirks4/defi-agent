"use client";

import { TechnicalIndicators } from "@/types/simulation";
import { useMemo } from "react";

interface TechnicalIndicatorsChartProps {
  indicators?: TechnicalIndicators;
  height?: number;
}

// Default empty indicators object to prevent undefined errors
const DEFAULT_INDICATORS: TechnicalIndicators = {
  sma: [],
  ema: [],
  rsi: [],
  macd: {
    macdLine: [],
    signalLine: [],
    histogram: [],
  },
  bollingerBands: {
    upper: [],
    middle: [],
    lower: [],
  },
};

export default function TechnicalIndicatorsChart({
  indicators = DEFAULT_INDICATORS,
  height = 200,
}: TechnicalIndicatorsChartProps) {
  const chartData = useMemo(() => {
    // Early return with empty data if no indicators
    if (!indicators) {
      return {
        sma: "",
        ema: "",
        bbUpper: "",
        bbLower: "",
        bbMiddle: "",
        minValue: 0,
        maxValue: 0,
      };
    }

    const allValues = [
      ...(indicators.sma || []),
      ...(indicators.ema || []),
      ...(indicators.macd?.macdLine || []),
      ...(indicators.macd?.signalLine || []),
      ...(indicators.bollingerBands?.upper || []),
      ...(indicators.bollingerBands?.lower || []),
    ].filter((value) => typeof value === "number" && !isNaN(value));

    // If no valid values, return empty chart data
    if (allValues.length === 0) {
      return {
        sma: "",
        ema: "",
        bbUpper: "",
        bbLower: "",
        bbMiddle: "",
        minValue: 0,
        maxValue: 0,
      };
    }

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue || 1; // Prevent division by zero

    const scaleY = (value: number) =>
      height - ((value - minValue) / valueRange) * height;

    const createLine = (data: number[] = []) => {
      if (data.length === 0) return "";

      return data
        .map((value, i) => {
          const x = (i / (data.length - 1)) * 1000;
          const y = scaleY(value);
          return `${x},${y}`;
        })
        .join(" ");
    };

    return {
      sma: createLine(indicators.sma),
      ema: createLine(indicators.ema),
      bbUpper: createLine(indicators.bollingerBands?.upper),
      bbLower: createLine(indicators.bollingerBands?.lower),
      bbMiddle: createLine(indicators.bollingerBands?.middle),
      minValue,
      maxValue,
    };
  }, [indicators, height]);

  // If no data, return null or a placeholder
  if (!indicators || !chartData.sma) {
    return (
      <div className="h-[200px] flex items-center justify-center text-gray-400">
        No technical indicator data available
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-lg font-medium mb-4">Technical Indicators</h3>
      <div className="relative">
        <svg
          viewBox={`0 0 1000 ${height}`}
          className="w-full h-[200px]"
          style={{ overflow: "visible" }}
        >
          {/* Y-axis labels */}
          <text x="0" y="15" className="text-xs fill-[var(--muted)]">
            ${chartData.maxValue.toFixed(2)}
          </text>
          <text x="0" y={height} className="text-xs fill-[var(--muted)]">
            ${chartData.minValue.toFixed(2)}
          </text>

          {/* Bollinger Bands */}
          <polyline
            points={chartData.bbUpper}
            fill="none"
            strokeWidth="1"
            className="stroke-[var(--muted)] opacity-50"
          />
          <polyline
            points={chartData.bbLower}
            fill="none"
            strokeWidth="1"
            className="stroke-[var(--muted)] opacity-50"
          />
          <polyline
            points={chartData.bbMiddle}
            fill="none"
            strokeWidth="1"
            className="stroke-[var(--accent)] opacity-50"
          />

          {/* Moving Averages */}
          <polyline
            points={chartData.sma}
            fill="none"
            strokeWidth="2"
            className="stroke-[var(--primary)]"
          />
          <polyline
            points={chartData.ema}
            fill="none"
            strokeWidth="2"
            className="stroke-[var(--secondary)]"
          />
        </svg>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[var(--primary)]" />
            <span>SMA</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[var(--secondary)]" />
            <span>EMA</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[var(--muted)] opacity-50" />
            <span>Bollinger Bands</span>
          </div>
        </div>
      </div>
    </div>
  );
}
