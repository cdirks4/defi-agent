'use client';

import { SimulationTrade } from '@/types/simulation';
import { useMemo } from 'react';
import { safeFormatNumber } from '@/lib/safeFormatNumber';

interface PerformanceChartProps {
  trades: SimulationTrade[];
  height?: number;
}

export default function PerformanceChart({ trades, height = 200 }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    if (!trades.length) return null;

    const prices = trades.map(t => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // Scale points to fit in the SVG
    const points = trades.map((trade, i) => {
      // If there's only one trade, center it horizontally
      const x = trades.length === 1 ? 500 : (i / (trades.length - 1)) * 1000;
      const y = height - ((trade.price - minPrice) / priceRange) * height;
      return `${x},${y}`;
    }).join(' ');

    return {
      points,
      minPrice,
      maxPrice,
      priceRange
    };
  }, [trades, height]);

  if (!chartData) return null;

  return (
    <div className="card p-4">
      <h3 className="text-lg font-medium mb-4">Price Performance</h3>
      <div className="relative">
        <svg
          viewBox={`0 0 1000 ${height}`}
          className="w-full h-[200px] stroke-[var(--primary)]"
          style={{ overflow: 'visible' }}
        >
          {/* Y-axis labels */}
          <text x="0" y="15" className="text-xs fill-[var(--muted)]">
            ${chartData.maxPrice.toFixed(2)}
          </text>
          <text x="0" y={height} className="text-xs fill-[var(--muted)]">
            ${chartData.minPrice.toFixed(2)}
          </text>

          {/* Price line */}
          <polyline
            points={chartData.points}
            fill="none"
            strokeWidth="2"
            className="stroke-[var(--primary)]"
          />

          {/* Trade points */}
          {trades.map((trade, i) => {
            // Calculate x position, centering if there's only one trade
            const x = trades.length === 1 ? 500 : (i / (trades.length - 1)) * 1000;
            const y = height - ((trade.price - chartData.minPrice) / chartData.priceRange) * height;
            
            // Ensure x and y are valid numbers and convert to strings
            const safeX = safeFormatNumber(x, 0, 500);
            const safeY = safeFormatNumber(y, 0, height / 2);
            
            return (
              <circle
                key={i}
                cx={safeX}
                cy={safeY}
                r="4"
                className={`fill-current ${
                  trade.type === 'BUY' ? 'text-[var(--success)]' : 'text-[var(--error)]'
                }`}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
