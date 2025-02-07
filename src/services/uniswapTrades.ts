import { ethers } from "ethers";
import { ERC20_ABI, DEFAULT_GAS_LIMITS, MIN_REQUIRED_ETH } from "@/lib/constants";
import { UNISWAP_DEPLOYMENTS, WRAPPED_NATIVE_TOKEN } from "@/lib/uniswapDeployments";
import { redis } from "./redis";
import { getTokenDetails } from "@/lib/tokenHelpers";
import { providerService } from "./provider";
import { uniswapMultihopService } from "./uniswapMultihopService";
import { agentKit } from "./agentkit";
import { SWAP_ROUTER_ABI } from "@/lib/uniswapABI";

interface UniswapTradeParams {
  userId: string;
  tokenAddress: string;
  amount: string;
  maxSlippage?: number;
  intermediaryToken?: string;
}

class UniswapTradeService {
  private getChainAddresses() {
    const chain = (process.env.NEXT_PUBLIC_CHAIN as keyof typeof UNISWAP_DEPLOYMENTS) || "arbitrum-sepolia";
    return {
      router: UNISWAP_DEPLOYMENTS[chain].SwapRouter02,
      factory: UNISWAP_DEPLOYMENTS[chain].UniswapV3Factory,
      weth: WRAPPED_NATIVE_TOKEN[chain].address.toLowerCase(),
    };
  }

  private async checkSufficientGasFunds(signer: ethers.Signer): Promise<void> {
    const provider = await providerService.getProvider();
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    const minRequired = ethers.parseEther(MIN_REQUIRED_ETH);

    if (balance < minRequired) {
      throw new Error(
        `Insufficient ETH for gas fees. Required: ${MIN_REQUIRED_ETH} ETH, Current balance: ${ethers.formatEther(
          balance
        )} ETH`
      );
    }
  }

  async executeTrade(params: UniswapTradeParams) {
    try {
      const { tokenAddress, amount, maxSlippage = 0.5, intermediaryToken, userId } = params;
      const addresses = this.getChainAddresses();

      // Normalize token address for comparison
      const normalizedTokenAddress = tokenAddress.toLowerCase();

      if (!ethers.isAddress(normalizedTokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }

      console.log("Executing trade with parameters:", {
        tokenAddress: normalizedTokenAddress,
        networkWETH: addresses.weth,
        amount,
        chain: process.env.NEXT_PUBLIC_CHAIN || "arbitrum-sepolia"
      });

      // Cache check with error handling
      try {
        const recentTradeStr = await redis.get(`recent_trade:${userId}`);
        if (recentTradeStr) {
          try {
            return JSON.parse(
              typeof recentTradeStr === "string"
                ? recentTradeStr
                : JSON.stringify(recentTradeStr)
            );
          } catch (parseError) {
            console.error("Failed to parse recent trade cache:", parseError);
          }
        }
      } catch (cacheError) {
        console.error("Cache retrieval error:", cacheError);
      }

      // Get provider with fallback support
      const provider = await providerService.getProvider();
      if (!provider) {
        throw new Error("Failed to initialize network provider");
      }

      // Verify network connection
      const network = await provider.getNetwork();
      console.log("Connected to network:", network.name);

      // Get token contract
      const tokenContract = new ethers.Contract(
        normalizedTokenAddress,
        ERC20_ABI,
        provider
      );

      try {
        const { decimals, symbol } = await getTokenDetails(tokenContract);
        console.log("Token details retrieved:", { symbol, decimals });

        // Get the agent kit signer
        const signer = agentKit.getSigner();
        const signerAddress = await signer.getAddress();

        // Check for sufficient gas funds before proceeding
        await this.checkSufficientGasFunds(signer);

        // Check and approve token spending using proper ethers v6 contract calls
        console.log("Checking token allowance...");
        const parsedAmount = ethers.parseUnits(amount, decimals);
        
        // Use safe allowance check that handles failures gracefully
        const { safeAllowanceCheck } = await import("@/lib/safeTokenHelpers");
        const currentAllowance = await safeAllowanceCheck(tokenContract, signerAddress, addresses.router);
        
        if (currentAllowance < parsedAmount) {
          console.log("Insufficient allowance, requesting approval...");
          const tokenWithSigner = tokenContract.connect(signer);
          
          try {
            // Get current gas price for approval
            const feeData = await provider.getFeeData();
            const gasPrice = feeData.gasPrice || ethers.parseUnits("0.1", "gwei");
            
            const approveTx = await tokenWithSigner.approve(
              addresses.router,
              parsedAmount,
              {
                gasLimit: DEFAULT_GAS_LIMITS.TOKEN_TRANSFER,
                gasPrice
              }
            );
            console.log("Approval transaction sent:", approveTx.hash);
            
            const approveReceipt = await approveTx.wait();
            console.log("Approval confirmed:", approveReceipt.hash);
          } catch (approvalError) {
            console.error("Token approval failed:", approvalError);
            throw new Error(
              `Failed to approve token spending: ${
                approvalError instanceof Error ? approvalError.message : "Unknown error"
              }`
            );
          }
        } else {
          console.log("Sufficient allowance exists");
        }

        // Determine if this is a multihop trade
        if (intermediaryToken && ethers.isAddress(intermediaryToken)) {
          console.log("Executing multihop trade");
          const swapResult = await uniswapMultihopService.executeExactInputMultihop({
            tokenIn: addresses.weth,
            tokenOut: normalizedTokenAddress,
            intermediaryToken: intermediaryToken.toLowerCase(),
            amount,
            recipient: userId,
            slippageTolerance: maxSlippage,
          });

          const tradeResult = {
            success: true,
            tokenAddress: normalizedTokenAddress,
            symbol,
            amount,
            type: 'multihop',
            intermediaryToken,
            timestamp: Date.now(),
            txHash: swapResult.hash || "pending"
          };

          try {
            await redis.set(
              `recent_trade:${userId}`,
              JSON.stringify(tradeResult),
              { ex: 60 }
            );
          } catch (cacheError) {
            console.error("Failed to cache trade result:", cacheError);
          }

          return tradeResult;
        } else {
          console.log("Executing single-hop trade");
          const minOutput = parsedAmount - (parsedAmount * BigInt(Math.floor(maxSlippage * 100))) / BigInt(10000);
          const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

          const swapParams = {
            tokenIn: addresses.weth,
            tokenOut: normalizedTokenAddress,
            fee: 3000, // 0.3% fee tier
            recipient: signerAddress,
            deadline,
            amountIn: parsedAmount,
            amountOutMinimum: minOutput,
            sqrtPriceLimitX96: 0n
          };

          console.log("Swap parameters:", {
            ...swapParams,
            amountIn: ethers.formatUnits(swapParams.amountIn, decimals),
            amountOutMinimum: ethers.formatUnits(swapParams.amountOutMinimum, decimals)
          });

          // Create router contract instance
          const router = new ethers.Contract(
            addresses.router,
            SWAP_ROUTER_ABI,
            signer
          );

          // Execute the swap using the router contract
          const tx = await router.exactInputSingle(swapParams);
          console.log("Transaction sent:", tx.hash);
          
          const receipt = await tx.wait();
          console.log("Transaction confirmed:", receipt?.hash);

          const tradeResult = {
            success: true,
            tokenAddress: normalizedTokenAddress,
            symbol,
            amount,
            type: 'single-hop',
            timestamp: Date.now(),
            txHash: receipt?.hash || tx.hash || "pending"
          };

          try {
            await redis.set(
              `recent_trade:${userId}`,
              JSON.stringify(tradeResult),
              { ex: 60 }
            );
          } catch (cacheError) {
            console.error("Failed to cache trade result:", cacheError);
          }

          return tradeResult;
        }
      } catch (contractError) {
        console.error("Token contract interaction failed:", contractError);
        const formattedError = (await import("@/lib/formatError")).formatContractError(contractError);
        throw new Error(
          `Failed to interact with token contract at ${normalizedTokenAddress}: ${formattedError}`
        );
      }
    } catch (error) {
      console.error("Uniswap trade execution failed:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to execute Uniswap trade"
      );
    }
  }
}

export const uniswapTradeService = new UniswapTradeService();
