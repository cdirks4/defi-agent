export const SIMULATION_BASE_DELAY = 15000; // 15 seconds for simulations
export const DEFAULT_BASE_DELAY = 30000; // 30 seconds for other contexts

export interface RetryConfig {
  isSimulation?: boolean;
  maxRetries?: number;
  context?: { [key: string]: any };
}

export function handleRetryError(error: any, attempt: number, config: RetryConfig = {}): void {
  const context = {
    module: 'retry',
    method: 'handleRetryError',
    attempt,
    maxRetries: config.maxRetries || 3,
    isSimulation: config.isSimulation,
    ...config.context
  };

  if (error?.status === 429) {
    logger.warn('Rate limit exceeded', context, error);
  } else if (error?.status === 524) {
    logger.warn('Timeout error encountered', context, error);
  } else {
    logger.error('Unexpected error during retry', context, error);
  }

  // Log additional context for the last retry attempt
  if (attempt === (config.maxRetries || 3)) {
    logger.error('All retry attempts exhausted', {
      ...context,
      totalAttempts: attempt,
      finalError: error?.message
    });
  }
}

import { logger } from "@/lib/logger";

export function calculateWaitTime(error: any, attempt: number, config: RetryConfig = {}): number {
  const { isSimulation = false, maxRetries = 3 } = config;
  
  const context = {
    module: 'retry',
    method: 'calculateWaitTime',
    attempt,
    maxRetries,
    isSimulation,
    errorStatus: error?.status,
    errorMessage: error?.message
  };
  
  try {
    // Try to parse wait time from error message
    const match = error?.message?.match(/try again in (\d+\.?\d*)s/i);
    if (match) {
      const waitTime = Math.ceil(parseFloat(match[1]) * 1000);
      logger.debug('Parsed wait time from error message', {
        ...context,
        parsedWaitTime: waitTime
      });
      return waitTime;
    }
  } catch (e) {
    logger.warn('Failed to parse wait time from error message', context, e as Error);
  }

  // For simulations, use shorter delays
  const baseDelay = isSimulation ? SIMULATION_BASE_DELAY : DEFAULT_BASE_DELAY;
  
  let waitTime: number;
  
  // For timeout errors (524), use a modified backoff strategy for simulations
  if (error?.status === 524 && isSimulation) {
    // Linear backoff for simulations instead of exponential
    waitTime = baseDelay * (attempt);
    logger.info('Using linear backoff for simulation timeout', {
      ...context,
      waitTime,
      strategy: 'linear'
    });
  } else {
    // Standard exponential backoff with reduced jitter for other cases
    waitTime = baseDelay * Math.pow(1.5, attempt - 1) * (0.8 + Math.random() * 0.4);
    logger.info('Using exponential backoff', {
      ...context,
      waitTime,
      strategy: 'exponential'
    });
  }

  // Log if we're on the last retry
  if (attempt === maxRetries) {
    logger.warn('Final retry attempt', {
      ...context,
      waitTime
    });
  }

  return waitTime;
}
