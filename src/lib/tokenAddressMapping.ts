import { TOKEN_ADDRESSES } from "./constants";

/**
 * Maps mainnet token addresses to their testnet equivalents on Arbitrum Sepolia
 * @param address The token address to map
 * @returns The mapped testnet address or the original address if no mapping exists
 */
export function mapTokenAddress(address: string): string {
  if (!address) return address;
  
  const normalizedAddress = address.toLowerCase();
  const mappedAddress = TOKEN_ADDRESSES["mainnet-to-testnet"][normalizedAddress];
  
  if (mappedAddress) {
    console.log('Successfully mapped mainnet token address to testnet:', {
      from: normalizedAddress,
      to: mappedAddress,
      note: 'Using Arbitrum Sepolia testnet address'
    });
    return mappedAddress;
  }
  
  console.log('No testnet mapping found for address:', {
    address: normalizedAddress,
    note: 'Using original address - ensure this is a valid Arbitrum Sepolia address'
  });
  
  return address;
}
