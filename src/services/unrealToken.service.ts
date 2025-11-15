"use server";

import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";
import { activeChain, activeChainConfig } from "@/utils/chains";

// Load private key of your treasury wallet
const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY!;
const account = privateKeyToAccount({
  client,
  privateKey: treasuryPrivateKey,
});

export async function sendWelcomeTokens(toWallet: string, amount: number) {
  try {
    // Get the Unreal token contract address with type guard
    const unrealTokenAddress = activeChainConfig.custom.tokens && 'UnrealToken' in activeChainConfig.custom.tokens
      ? activeChainConfig.custom.tokens.UnrealToken?.address
      : undefined;

    const unrealTokenDecimals = activeChainConfig.custom.tokens && 'UnrealToken' in activeChainConfig.custom.tokens
      ? activeChainConfig.custom.tokens.UnrealToken?.decimals
      : 18; // Default to 18 decimals if not found

    if (!unrealTokenAddress) {
      throw new Error("UnrealToken not configured for this chain");
    }

    // Get the Unreal token contract (ERC20)
    const contract = getContract({
      client,
      chain: activeChain,
      address: unrealTokenAddress,
    });

    // ERC20 usually has 18 decimals → convert to base units
    const value = BigInt(amount) * BigInt(10 ** unrealTokenDecimals);

    // Prepare transfer
    const tx = prepareContractCall({
      contract,
      method: "function transfer(address to, uint256 value)",
      params: [toWallet, value],
    });

    console.debug(
      `Prepare sending welcome token value:${value} to ${toWallet}`
    );

    // Execute transaction
    const receipt = await sendTransaction({
      account,
      transaction: tx,
    });

    console.log(`✅ Sent ${amount} Unreal tokens to ${toWallet}`);
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error("❌ Failed to send welcome tokens:", error);
    return { success: false, message: String(error) };
  }
}
