import { ethers } from "ethers";

interface ContractError extends Error {
  data?: string;
  code?: string;
  reason?: string;
  transaction?: {
    data?: string;
    from?: string;
    to?: string;
  };
  method?: string;
  errorArgs?: any[];
}

import { logger } from "./logger";

export function formatContractError(error: unknown, context: { [key: string]: any } = {}): string {
  if (!(error instanceof Error)) {
    logger.warn('Non-Error object passed to formatContractError', {
      module: 'error',
      method: 'formatContractError',
      errorType: typeof error,
      context
    });
    return "Unknown error occurred";
  }

  const contractError = error as ContractError;
  let errorMessage = contractError.message;

  logger.debug('Formatting contract error', {
    module: 'error',
    method: 'formatContractError',
    errorMessage,
    context
  });

  // Build detailed error message
  const details: string[] = [];

  // Check for missing revert data specifically
  if (!contractError.data && !contractError.reason) {
    details.push("missing revert data");
  }

  if (contractError.code) {
    details.push(`Code: ${contractError.code}`);
  }

  if (contractError.reason) {
    details.push(`Reason: ${contractError.reason}`);
  }

  if (contractError.data) {
    details.push(`Data: ${contractError.data}`);
  }

  if (contractError.transaction) {
    const tx = contractError.transaction;
    if (tx.data) details.push(`TX Data: ${tx.data.slice(0, 66)}...`);
    if (tx.from) details.push(`From: ${tx.from}`);
    if (tx.to) details.push(`To: ${tx.to}`);
  }

  // If we have additional details, append them to the error message
  if (details.length > 0) {
    errorMessage += ` (${details.join(", ")})`;
  }

  return errorMessage;
}

export function formatGasEstimationError(error: unknown, tokenAddress: string, context: { [key: string]: any } = {}): string {
  const baseMessage = `Failed to estimate gas for token ${tokenAddress}`;
  
  logger.error('Gas estimation failed', {
    module: 'error',
    method: 'formatGasEstimationError',
    tokenAddress,
    ...context
  }, error instanceof Error ? error : new Error('Unknown error'));

  if (!(error instanceof Error)) {
    return `${baseMessage}: Unknown error`;
  }

  const formattedError = formatContractError(error, {
    tokenAddress,
    ...context
  });
  return `${baseMessage}: ${formattedError}`;
}

// Helper function for simulation-specific errors
export function formatSimulationError(error: unknown, context: { [key: string]: any } = {}): string {
  logger.error('Simulation error occurred', {
    module: 'error',
    method: 'formatSimulationError',
    ...context
  }, error instanceof Error ? error : new Error('Unknown error'));

  if (!(error instanceof Error)) {
    return "Unknown simulation error occurred";
  }

  // Check for specific simulation error types
  if (error.message.includes('No historical trades found')) {
    return `No trading data available: ${error.message}`;
  }

  if (error.message.includes('LLAMA_API')) {
    return `AI service error: ${error.message}`;
  }

  if (error.message.includes('rate limit')) {
    return `Service temporarily unavailable: ${error.message}`;
  }

  return error.message;
}
