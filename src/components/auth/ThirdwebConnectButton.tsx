import { client } from "@/lib/thirdweb";
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
    />
  );
}
