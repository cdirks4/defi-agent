# Uniswap V3 Multihop Deployment Guide

This guide explains how to deploy and test the Uniswap V3 multihop swap functionality in different environments.

## Prerequisites

- Access to an Arbitrum node (Mainnet or Sepolia testnet)
- Environment variables properly configured
- Sufficient ETH for gas fees

## Configuration

### Environment Variables

Make sure your `.env` file includes:

```env
NEXT_PUBLIC_CHAIN=arbitrum-sepolia  # or "arbitrum" for mainnet
NEXT_PUBLIC_RPC_URL=<your-rpc-url>
```

### Network Support

The implementation supports:
- Arbitrum Mainnet
- Arbitrum Sepolia Testnet

## Testing Multihop Swaps

1. **Token Setup**
   - Ensure you have test tokens on Arbitrum Sepolia
   - Default test tokens are configured in `src/utils/testnet-tokens.ts`
   - WETH and USDC are available by default

2. **Executing Test Trades**
   ```typescript
   // Example test trade
   const trade = await uniswapTradeService.executeTrade({
     userId: "<user-id>",
     tokenAddress: TESTNET_TOKENS.USDC,
     amount: "0.1",
     intermediaryToken: TESTNET_TOKENS.WETH
   });
   ```

3. **Monitoring Results**
   - Check Redis cache for recent trades
   - Monitor transaction status on Arbiscan
   - Review logs for detailed execution flow

## Common Issues

1. **Insufficient Liquidity**
   - Ensure pools exist for your token pairs
   - Check minimum liquidity requirements

2. **Price Impact Too High**
   - Adjust slippage tolerance
   - Try different intermediary tokens
   - Reduce trade size

3. **Failed Transactions**
   - Verify gas settings
   - Check token approvals
   - Confirm pool fee tiers

## Security Considerations

- Always test with small amounts first
- Monitor slippage settings
- Verify token addresses
- Use trusted intermediary tokens

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Network RPC endpoints accessible
- [ ] Test tokens available
- [ ] Redis instance running
- [ ] Gas estimation working
- [ ] Slippage protection configured

## Monitoring

Monitor your deployment using:
- Transaction logs
- Redis cache status
- Provider connection status
- Token balance changes

## Support

For issues or questions:
1. Check error logs
2. Verify network status
3. Confirm token configurations
4. Review recent trades in cache
