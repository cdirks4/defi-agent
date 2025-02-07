import { useState } from "react";
import { ethers } from "ethers";
import Button from "./base/Button";
import { WETH_ADDRESSES, WETH_ABI } from "@/lib/constants";

interface UnwrapWethButtonProps {
  walletAddress: string;
  balance: string;
}

const UnwrapWethButton = ({ walletAddress, balance }: UnwrapWethButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUnwrap = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const network = process.env.NEXT_PUBLIC_CHAIN || "arbitrum-sepolia";
      const wethAddress = WETH_ADDRESSES[network as keyof typeof WETH_ADDRESSES];
      
      // Connect to provider using window.ethereum
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const wethContract = new ethers.Contract(wethAddress, WETH_ABI, signer);
      
      // Convert balance to BigInt
      const amount = ethers.parseEther(balance);
      
      // Unwrap WETH to ETH
      const tx = await wethContract.withdraw(amount);
      await tx.wait();
      
      setSuccess(true);
    } catch (err) {
      console.error("Failed to unwrap WETH:", err);
      setError(err instanceof Error ? err.message : "Failed to unwrap WETH");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <Button
        label={isLoading ? "Unwrapping..." : "Unwrap to ETH"}
        onClick={handleUnwrap}
        disabled={isLoading || success}
        variant="secondary"
      />
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      {success && <div className="text-green-500 text-sm mt-1">Successfully unwrapped WETH to ETH!</div>}
    </div>
  );
};

export default UnwrapWethButton;