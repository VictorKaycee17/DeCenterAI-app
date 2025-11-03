import { client } from "@/lib/thirdweb";
import {
  activeChain,
  titanAITestnet,
  titanAITestnetConfig,
  torusMainnet,
  torusMainnetConfig,
  amoyTestnet,
  amoyTestnetConfig,
} from "@/utils/chains";
import React from "react";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";

export function ThirdwebConnectButton() {
  const wallets = [
    inAppWallet({
      auth: {
        options: ["google", "email"],
      },
    }),
  ];

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      connectButton={{ label: "Sign-In" }}
      connectModal={{ showThirdwebBranding: true, size: "wide" }}
      theme={"dark"}
      chain={activeChain}
      supportedTokens={{
        [titanAITestnet.id]: [
          {
            address: titanAITestnetConfig.custom.tokens.UnrealToken.address,
            name: titanAITestnetConfig.custom.tokens.UnrealToken.name,
            symbol: titanAITestnetConfig.custom.tokens.UnrealToken.symbol,
          },
        ],
        [torusMainnet.id]: [
          {
            address: torusMainnetConfig.custom.tokens.UnrealToken.address,
            name: torusMainnetConfig.custom.tokens.UnrealToken.name,
            symbol: torusMainnetConfig.custom.tokens.UnrealToken.symbol,
          },
        ],
        [amoyTestnet.id]: [
          {
            address: amoyTestnetConfig.custom.tokens.UnrealToken.address,
            name: amoyTestnetConfig.custom.tokens.UnrealToken.name,
            symbol: amoyTestnetConfig.custom.tokens.UnrealToken.symbol,
          },
        ],
      }}
    />
  );
}
