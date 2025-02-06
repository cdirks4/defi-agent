import { ethers } from "ethers";
import {
  UNISWAP_DEPLOYMENTS,
  WRAPPED_NATIVE_TOKEN,
} from "@/lib/uniswapDeployments";
import { providerService } from "./provider";
import { ERC20_ABI } from "@/lib/constants";
import { TransferHelper } from "@uniswap/v3-periphery/contracts/libraries/TransferHelper";

interface SwapParams {
  path: string;
  recipient: string;
  deadline: number;
  amountIn: bigint;
  amountOutMinimum: bigint;
}

class UniswapMultihopService {
  private getChainAddresses() {
    const chain =
      (process.env.NEXT_PUBLIC_CHAIN as keyof typeof UNISWAP_DEPLOYMENTS) ||
      "arbitrum-sepolia";
    return {
      router: UNISWAP_DEPLOYMENTS[chain].SwapRouter02,
      weth: WRAPPED_NATIVE_TOKEN[chain].address,
    };
  }

  async executeExactInputMultihop({
    tokenIn,
    tokenOut,
    intermediaryToken,
    amount,
    recipient,
    slippageTolerance = 0.5, // 0.5% default slippage tolerance
  }: {
    tokenIn: string;
    tokenOut: string;
    intermediaryToken: string;
    amount: string;
    recipient: string;
    slippageTolerance?: number;
  }) {
    try {
      const provider = await providerService.getProvider();
      const addresses = this.getChainAddresses();

      // Get token contracts
      const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, provider);
      const decimals = await tokenInContract.decimals();

      // Parse amount with proper decimals
      const amountIn = ethers.parseUnits(amount, decimals);

      // Calculate minimum output amount based on slippage tolerance
      const minOutput =
        amountIn -
        (amountIn * BigInt(Math.floor(slippageTolerance * 100))) /
          BigInt(10000);

      // Encode the path for multihop swap (tokenIn -> intermediaryToken -> tokenOut)
      const path = ethers.solidityPacked(
        ["address", "uint24", "address", "uint24", "address"],
        [tokenIn, 3000, intermediaryToken, 3000, tokenOut]
      );

      // Construct swap parameters
      const params: SwapParams = {
        path,
        recipient,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from now
        amountIn,
        amountOutMinimum: minOutput,
      };

      return params;
    } catch (error) {
      console.error("Failed to execute multihop swap:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to execute multihop swap"
      );
    }
  }

  async executeExactOutputMultihop({
    tokenIn,
    tokenOut,
    intermediaryToken,
    amountOut,
    recipient,
    maxSlippage = 0.5, // 0.5% default max slippage
  }: {
    tokenIn: string;
    tokenOut: string;
    intermediaryToken: string;
    amountOut: string;
    recipient: string;
    maxSlippage?: number;
  }) {
    try {
      const provider = await providerService.getProvider();
      const addresses = this.getChainAddresses();

      // Get token contracts
      const tokenOutContract = new ethers.Contract(
        tokenOut,
        ERC20_ABI,
        provider
      );
      const decimals = await tokenOutContract.decimals();

      // Parse amount with proper decimals
      const exactAmountOut = ethers.parseUnits(amountOut, decimals);

      // Calculate maximum input amount based on slippage tolerance
      const maxAmountIn =
        exactAmountOut +
        (exactAmountOut * BigInt(Math.floor(maxSlippage * 100))) /
          BigInt(10000);

      // Encode the path for multihop swap in reverse order (tokenOut -> intermediaryToken -> tokenIn)
      const path = ethers.solidityPacked(
        ["address", "uint24", "address", "uint24", "address"],
        [tokenOut, 3000, intermediaryToken, 3000, tokenIn]
      );

      // Construct swap parameters
      const params = {
        path,
        recipient,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from now
        amountOut: exactAmountOut,
        amountInMaximum: maxAmountIn,
      };

      return params;
    } catch (error) {
      console.error("Failed to execute exact output multihop swap:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to execute exact output multihop swap"
      );
    }
  }
}

export const uniswapMultihopService = new UniswapMultihopService();
