# DeFi Assistant

This is a [Next.js](https://nextjs.org) project that implements a DeFi trading assistant with Uniswap V3 integration.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

### Uniswap V3 Integration

The application implements Uniswap V3 trading functionality, including:

#### Multi-hop Swaps
- Supports both exact input and exact output multihop swaps
- Configurable slippage tolerance
- Automatic path encoding for token routes
- Supports intermediary tokens for optimal routing

Example usage of multihop swaps:

```typescript
// Execute a multihop swap with exact input
const result = await uniswapTradeService.executeTrade({
  userId: "user123",
  tokenAddress: "0x...", // Target token address
  amount: "1.0",
  maxSlippage: 0.5, // 0.5% slippage tolerance
  intermediaryToken: "0x..." // Optional intermediary token
});
```

The system supports two types of multihop swaps:
1. Exact Input Multihop: Swap a fixed amount of input token for maximum output
2. Exact Output Multihop: Swap minimum input amount for a fixed output amount

## Architecture

The project uses:
- Next.js for the frontend framework
- Prisma for database management
- Redis for caching trade data
- Ethers.js for blockchain interaction
- Uniswap V3 SDK for trading functionality

## Development

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load custom fonts.

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Uniswap V3 Documentation](https://docs.uniswap.org/contracts/v3/overview)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
