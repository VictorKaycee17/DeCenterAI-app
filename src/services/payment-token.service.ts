import {
  amoyTestnet,
  amoyTestnetConfig,
  titanAITestnet,
  titanAITestnetConfig,
  torusMainnet,
  torusMainnetConfig,
} from "@/utils/chains";

// Get payment token address by Chain
export function getPaymentTokenAddress(chainId: number): `0x${string}` {
  switch (chainId) {
    case torusMainnet.id:
      return torusMainnetConfig.custom.tokens.UnrealToken.address as `0x${string}`;

    case titanAITestnet.id:
      return titanAITestnetConfig.custom.tokens.UnrealToken.address as `0x${string}`;

    case amoyTestnet.id:
      return amoyTestnetConfig.custom.tokens.UnrealToken.address as `0x${string}`;

    default:
      return "" as `0x${string}`;
  }
}
