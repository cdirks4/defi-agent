/**
 * Uniswap contract deployment addresses for supported networks.
 * All addresses are stored in lowercase for consistent comparison.
 */
export const UNISWAP_DEPLOYMENTS = {
  arbitrum: {
    UniswapV3Factory: "0x1f98431c8ad98523631ae4a59f267346ea31f984",
    Multicall: "0xadf885960b47ea2cd9b55e6dac6b42b7cb2806db",
    ProxyAdmin: "0xb753548f6e010e7e680ba186f9ca1bdab2e90cf2",
    TickLens: "0xbfd8137f7d1516d3ea5ca83523914859ec47f573",
    Quoter: "0xb27308f9f90d607463bb33ea1bebb41c27ce5ab6",
    SwapRouter: "0xe592427a0aece92de3edee1f18e0157c05861564",
    NFTDescriptor: "0x42b24a95702b9986e82d421cc3568932790a48ec",
    NonfungibleTokenPositionDescriptor: "0x91ae842a5ffd8d12023116943e72a606179294f3",
    TransparentUpgradeableProxy: "0xee6a57ec80ea46401049e92587e52f5ec1c24785",
    NonfungiblePositionManager: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
    V3Migrator: "0xa5644e29708357803b5a882d272c41cc0df92b34",
    QuoterV2: "0x61ffe014ba17989e743c5f6cb21bf9697530b21e",
    SwapRouter02: "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
    Permit2: "0x000000000022d473030f116ddee9f6b43ac78ba3",
    UniversalRouter: "0x5e325eda8064b456f4781070c0738d849c824258",
    v3StakerAddress: "0xe34139463ba50bd61336e0c446bd8c0867c6fe65",
  },
  "arbitrum-sepolia": {
    UniswapV3Factory: "0x248ab79bbb9bc29bb72f7cd42f17e054fc40188e",
    Multicall: "0x2b718b475e385ed29f56775a66aab1f5cc6b2a0a",
    ProxyAdmin: "",
    TickLens: "0x0fd18587734e5c2dce2dccdcc7dd1ec89ba557d9",
    Quoter: "",
    SwapRouter: "",
    NFTDescriptor: "",
    NonfungibleTokenPositionDescriptor: "",
    TransparentUpgradeableProxy: "",
    NonfungiblePositionManager: "0x6b2937bde17889edcf8fbd8de31c3c2a70bc4d65",
    V3Migrator: "0x398f43ef2c67b941147157da1c5a868e906e043d",
    QuoterV2: "0x2779a0cc1c3e0e44d2542ec3e79e3864ae93ef0b",
    SwapRouter02: "0x101f443b4d1b059569d643917553c771e1b9663e",
    Permit2: "0x000000000022d473030f116ddee9f6b43ac78ba3",
    UniversalRouter: "0x4a7b5da61326a6379179b40d00f57e5bbdc962c2",
    v3StakerAddress: "",
  },
} as const;

/**
 * Wrapped native token (WETH) addresses for each supported network.
 * All addresses are stored in lowercase for consistent comparison.
 * 
 * IMPORTANT: When comparing addresses, always use .toLowerCase() on the input
 * address to ensure correct matching against these stored addresses.
 */
export const WRAPPED_NATIVE_TOKEN = {
  arbitrum: {
    address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    name: "WETH",
  },
  "arbitrum-sepolia": {
    address: "0x980b62da83eff3d4576c647993b0c1d7faf17c73",
    name: "WETH",
  },
} as const;
