import { usePrivy, useWallets } from "@privy-io/react-auth";
import Button from "./base/Button";

interface WalletConnectProps {
  onConnect: () => void;
}

const WalletConnect = ({ onConnect }: WalletConnectProps) => {
  const { login, ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const handleConnect = async () => {
    if (!authenticated) {
      await login();
    }
    onConnect();
  };

  return (
    <div className="flex items-center space-x-4">
      {authenticated && user ? (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            {wallets[0]?.address.slice(0, 6)}...{wallets[0]?.address.slice(-4)}
          </span>
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          label="Connect Wallet"
          variant="secondary"
        />
      )}
    </div>
  );
};

export default WalletConnect;
