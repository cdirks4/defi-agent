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

export function formatContractError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown error occurred";
  }

  const contractError = error as ContractError;
  let errorMessage = contractError.message;

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

export function formatGasEstimationError(error: unknown, tokenAddress: string): string {
  const baseMessage = `Failed to estimate gas for token ${tokenAddress}`;
  
  if (!(error instanceof Error)) {
    return `${baseMessage}: Unknown error`;
  }

  const formattedError = formatContractError(error);
  return `${baseMessage}: ${formattedError}`;
}
