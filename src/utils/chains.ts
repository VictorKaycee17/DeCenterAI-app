import { defineChain } from "thirdweb";

// Torus Mainnet configuration
export const torusMainnetConfig = {
  id: 8192,
  name: "Torus Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Torus Ether",
    symbol: "TQF",
  },
  rpcUrls: {
    default: { http: ["https://rpc.toruschain.com/"] },
  },
  blockExplorers: {
    default: { name: "Torus Explorer", url: "https://toruscan.com" },
  },
  testnet: false,
  custom: {
    maxRPS: 3,
    tokens: {
      UnrealToken: {
        address: "0xA409B5E5D34928a0F1165c7a73c8aC572D1aBCDB" as const,
        symbol: "UNREAL",
        name: "Unreal Token",
        decimals: 18,
      },
    },
  },
};

// Titan AI Testnet configuration
export const titanAITestnetConfig = {
  id: 1020352220,
  name: "Titan AI",
  nativeCurrency: {
    decimals: 18,
    name: "Skale Fuel",
    symbol: "FUEL",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.skalenodes.com/v1/aware-fake-trim-testnet"],
    },
  },
  blockExplorers: {
    default: {
      name: "Titan AI Explorer",
      url: "https://aware-fake-trim-testnet.explorer.testnet.skalenodes.com/",
    },
  },
  testnet: true,
  custom: {
    tokens: {
      UnrealToken: {
        address: "0x8bcEac95cb3AAF12358Dde73c16bB293f4b028C1" as const,
        symbol: "UNREAL",
        name: "Unreal Token",
        decimals: 18,
      },
    },
  },
};

// Polygon Amoy Testnet configuration
export const amoyTestnetConfig = {
  id: 80002,
  name: "Polygon Amoy",
  nativeCurrency: {
    decimals: 18,
    name: "POL",
    symbol: "POL",
  },
  rpcUrls: {
    default: {
      http: [
        "https://rpc-amoy.polygon.technology",
        "https://polygon-amoy.drpc.org",
        "https://polygon-amoy-bor-rpc.publicnode.com",
      ],
    },
    public: {
      http: [
        "https://rpc-amoy.polygon.technology",
        "https://polygon-amoy-bor-rpc.publicnode.com",
      ],
    },
  },
  blockExplorers: {
    default: { name: "PolygonScan", url: "https://amoy.polygonscan.com" },
  },
  testnet: true,
  custom: {
    tokens: {
      UnrealToken: {
        address: "0x535D9D557f15ff50E46D51a6726C1Eb5FAf9D326" as const,
        symbol: "UNREAL",
        name: "Unreal Token",
        decimals: 18,
      },
    },
  },
};

export const torusMainnet = defineChain(torusMainnetConfig);
export const titanAITestnet = defineChain(titanAITestnetConfig);
export const amoyTestnet = defineChain(amoyTestnetConfig);

// Map of chain IDs to defined chain objects
const chainsById = {
  [torusMainnet.id]: torusMainnet,
  [titanAITestnet.id]: titanAITestnet,
  [amoyTestnet.id]: amoyTestnet,
} as const;

// Map of chain IDs to configuration objects
const chainConfigsById = {
  [torusMainnetConfig.id]: torusMainnetConfig,
  [titanAITestnetConfig.id]: titanAITestnetConfig,
  [amoyTestnetConfig.id]: amoyTestnetConfig,
} as const;

// Function to get chain by ID
export function getChainById(chainId: number) {
  return chainsById[chainId] ?? null;
}

// Function to get chain configuration by ID
export function getChainConfigById(chainId: number) {
  return chainConfigsById[chainId] ?? null;
}
