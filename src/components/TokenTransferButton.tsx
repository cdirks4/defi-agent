import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Button from "./base/Button";
import { agentKit } from "@/services/agentkit";
import { ethers } from "ethers";
import { ERC20_ABI } from "@/lib/constants";

interface TokenTransferButtonProps {
  userWalletAddress: string;
  agentWalletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
}

const TokenTransferButton = ({ 
  userWalletAddress, 
  agentWalletAddress, 
  tokenAddress,
  tokenSymbol
}: TokenTransferButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { authenticated, user } = usePrivy();

  const handleTransfer = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!authenticated || !user?.id) {
        throw new Error("Please connect your wallet first");
      }

      await agentKit.connectWallet(user.id);
      const signer = agentKit.getSigner();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      
      // Get token balance
      const balance = await tokenContract.balanceOf(agentWalletAddress);
      if (balance <= 0n) {
        throw new Error(`No ${tokenSymbol} available to transfer`);
      }

      // Transfer tokens
      const tx = await tokenContract.transfer(userWalletAddress, balance);
      await tx.wait();
      
      setSuccess(true);
    } catch (err) {
      console.error(`${tokenSymbol} transfer error:`, err);
      setError(err instanceof Error ? err.message : `Failed to transfer ${tokenSymbol}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      label={`Transfer ${tokenSymbol} to User Wallet`}
      onClick={handleTransfer}
      isLoading={isLoading}
      variant="secondary"
      disabled={isLoading || success}
    />
  );
};

export default TokenTransferButton;