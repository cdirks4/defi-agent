'use client';

interface ProgressBarProps {
  progress: number;
  showPercentage?: boolean;
}

export default function ProgressBar({ progress, showPercentage = true }: ProgressBarProps) {
  // Ensure progress is between 0 and 100
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      <div className="w-full h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[var(--primary)] transition-all duration-500 ease-in-out"
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-sm text-[var(--muted)] mt-1 text-center">
          {normalizedProgress.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
