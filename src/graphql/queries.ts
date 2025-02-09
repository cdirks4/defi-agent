export const POOL_DETAILS_QUERY = `
  query PoolDetails($poolId: ID!) {
    pool(id: $poolId) {
      id
      createdAtTimestamp
      token0Price
      token1Price
      volumeUSD
      volumeToken0
      volumeToken1
      feesUSD
      collectedFeesUSD
      collectedFeesToken0
      collectedFeesToken1
      liquidity
      tick
      sqrtPrice
      token0 {
        symbol
        decimals
        totalValueLockedUSD
        volumeUSD
        feesUSD
      }
      token1 {
        symbol
        decimals
        totalValueLockedUSD
        volumeUSD
        feesUSD
      }
      totalValueLockedToken0
      totalValueLockedToken1
      totalValueLockedETH
      totalValueLockedUSD
      liquidityProviderCount
      poolDayData(orderBy: date, orderDirection: desc, first: 30) {
        date
        volumeUSD
        feesUSD
        liquidity
        token0Price
        token1Price
        high
        low
        close
        volumeToken0
        volumeToken1
      }
    }
    factory(id: "0x1F98431c8aD98523631AE4a59f267346ea31F984") {
      totalValueLockedUSD
      totalFeesUSD
      poolCount
    }
  }
`;