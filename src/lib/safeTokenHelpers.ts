import { ethers } from "ethers";

/**
 * Safely checks token allowance with fallback to 0 if the call fails
 * Handles empty responses ("0x") and missing revert data by returning 0
 */
export async function safeAllowanceCheck(
  tokenContract: ethers.Contract,
  owner: string,
  spender: string
): Promise<bigint> {
  try {
    const allowance = await tokenContract.allowance(owner, spender);
    // Handle empty response case
    if (!allowance || allowance === "0x") {
      console.warn(
        `Empty allowance response for token ${tokenContract.target}, defaulting to 0`
      );
      return 0n;
    }
    return allowance;
  } catch (error) {
    // Enhanced error logging for missing revert data
    const errorDetails = error instanceof Error ? 
      (!error.data ? "missing revert data" : error.message) : 
      "unknown error";

    console.warn(
      `Allowance check failed for token ${tokenContract.target}: ${errorDetails}`,
      {
        owner,
        spender,
        tokenAddress: tokenContract.target,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      }
    );

    // Log the full error details using formatContractError
    try {
      const formattedError = (await import("./formatError")).formatContractError(error);
      console.debug(`Detailed allowance check error: ${formattedError}`);
    } catch (formatError) {
      console.debug("Failed to format contract error:", formatError);
    }

    return 0n;
  }
}
