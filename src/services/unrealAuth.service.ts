import {
  deleteUnrealTokenByWallet,
  getUserByWallet,
  updateUserUnrealToken,
} from "@/actions/supabase/users";
import { getChainById, getChainConfigById } from "@/utils/chains";
import { defineChain, ThirdwebClient } from "thirdweb";
import { GetBalanceResult } from "thirdweb/extensions/erc20";
import { Account } from "thirdweb/wallets";
import { fetchTokenBalance } from "./thirdweb.service";
import { UNREAL_REG_PAYLOAD_CONFIG } from "@/utils/config";
import { toast } from "react-toastify";
import { getPaymentTokenAddress } from "./payment-token.service";
import { client } from "@/lib/thirdweb";
import { preparePermitPayload, signPermitPayload } from "./permit.service";
import { UnrealRegistrationPayload } from "@/utils/types";
import { registerUnrealApiAccess } from "@/actions/unreal/auth";

// Checks whether a given account has a sufficient Unreal Token balance
const checkUnrealBalance = async (
  account: Account,
  chainId: number,
  client: ThirdwebClient
): Promise<{
  sufficient: boolean;
  balance?: GetBalanceResult;
  message?: string;
}> => {
  // Resolve chain metadata & Unreal token address from configuration
  const chain = getChainById(chainId);
  const chainConfig = getChainConfigById(chainId);
  const unrealTokenAddress = chainConfig?.custom?.tokens && 'UnrealToken' in chainConfig.custom.tokens
    ? chainConfig.custom.tokens.UnrealToken?.address
    : undefined;

  if (!chain || !unrealTokenAddress)
    throw new Error("Invalid chain configuration");

  // Fetch the current Unreal token balance of the account
  const balance = await fetchTokenBalance(
    account.address,
    chain,
    client,
    unrealTokenAddress
  );

  // Required balance = minimum calls * token decimals (assumed 18)
  const required =
    BigInt(UNREAL_REG_PAYLOAD_CONFIG.CALLS_INITIAL) * BigInt(10 ** 18);

  // Fail early if no balance, zero balance, or insufficient funds
  if (!balance || balance.value <= 0 || balance.value < required) {
    return {
      sufficient: false,
      balance,
      message: `You have ${balance.displayValue} Unreal, please top up at least ${UNREAL_REG_PAYLOAD_CONFIG.CALLS_INITIAL} Unreal Token.`,
    };
  }

  // Sufficient balance: return balance with success flag
  return { sufficient: true, balance };
};

// Safely parses the number of API calls from a balance object.
// Falls back to the configured initial calls if the value is missing or invalid.
function parseCalls(
  balance: { displayValue?: string } | null | undefined
): number {
  if (!balance?.displayValue) return UNREAL_REG_PAYLOAD_CONFIG.CALLS_INITIAL;

  // Parse string into integer; fall back to default if invalid
  const parsed = parseInt(balance.displayValue, 10);
  return isNaN(parsed) ? UNREAL_REG_PAYLOAD_CONFIG.CALLS_INITIAL : parsed;
}

// Sign registration payload and register to Unreal API
export async function signAndRegisterAccount(
  account: Account,
  chainId: number | undefined
): Promise<{ success: boolean; error?: string }> {
  if (!account || !chainId) {
    toast.error("Please connect your wallet");
    return { success: false, error: "Wallet not connected" }; // Indicate failure
  }

  try {
    // Create or Get User from Supabase by wallet address
    const userRes = await getUserByWallet(account.address);
    if (!userRes.success) throw new Error("Get user by wallet failed.");

    const unrealPaymentToken = getPaymentTokenAddress(chainId);

    // If user does not have Unreal session token, register to Unreal API and get session token
    if (!userRes.data.unreal_token) {
      // Send permit payload and permit signature with registration payload

      // Get Token balance from Thirdweb
      const { sufficient, balance, message } = await checkUnrealBalance(
        account,
        chainId,
        client
      );

      if (!sufficient) {
        toast.error(message);
        return { success: false }; // Allow dashboard access with warning
      }

      // Step 1. Prepare permit payload
      const amount =
        balance!.value ||
        BigInt(UNREAL_REG_PAYLOAD_CONFIG.CALLS_INITIAL) * BigInt(10 ** 18); // 18 decimals

      const deadline =
        Math.floor(Date.now() / 1000) +
        UNREAL_REG_PAYLOAD_CONFIG.EXPIRY_SECONDS;

      const { domain, permitTypes, permitMessage } = await preparePermitPayload(
        account,
        defineChain(chainId),
        unrealPaymentToken,
        UNREAL_REG_PAYLOAD_CONFIG.UNREAL_OPENAI_ADDRESS,
        amount,
        deadline
      );

      // Step 2. Sign permit payload and get permit signature
      const permitSignature = await signPermitPayload(
        account,
        domain,
        permitTypes,
        permitMessage
      );

      // Step 3. Build and send Unreal registration payload with permit
      // Unreal registration payload
      const payload: UnrealRegistrationPayload = {
        iss: account.address,
        iat: Math.floor(Date.now() / 1000), // Current timestamp in seconds
        exp:
          Math.floor(Date.now() / 1000) +
          UNREAL_REG_PAYLOAD_CONFIG.EXPIRY_SECONDS, // Expires in EXPIRY_SECONDS
        calls: parseCalls(balance),
        paymentToken: unrealPaymentToken,
        sub: UNREAL_REG_PAYLOAD_CONFIG.UNREAL_OPENAI_ADDRESS,
      };

      const jsonPayload = JSON.stringify(payload);
      const signature = await account.signMessage({ message: jsonPayload });

      const jsonPermitMessage = JSON.stringify(permitMessage);

      // Step 4. Register Unreal API Accress Token
      const unrealRegisterRes = await registerUnrealApiAccess(
        jsonPayload,
        account.address,
        signature,
        jsonPermitMessage,
        permitSignature
      );

      // Allow user to the API dashboard but notice that Unreal session token was not generated.
      if (!unrealRegisterRes.success) {
        toast.error(
          "Unreal API registration failed. Unreal session token was not generated."
        );
        return { success: false };
      }

      if (unrealRegisterRes.unrealToken) {
        // Update session token in Supabase users table
        await updateUserUnrealToken(account.address, {
          unreal_token: unrealRegisterRes.unrealToken,
        });
      }
    }
    return { success: true }; // Indicate success
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An error occurred during login";
    console.error("Error in Sign-in And Register Account:", error);
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Refresh Unreal session token
export async function refreshUnrealSessionToken(
  account: Account,
  chainId: number | undefined
): Promise<{ success: boolean; error?: string }> {
  if (!account || !chainId) {
    toast.error("Please connect your wallet");
    return { success: false, error: "Wallet not connected" }; // Indicate failure
  }

  try {
    // Delete existing Unreal session token
    await deleteUnrealTokenByWallet(account.address);

    // Re-register Unreal account and retrieve new session token
    return await signAndRegisterAccount(account, chainId);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to refresh Unreal session token";
    console.error("Error in refresh Unreal session token:", error);
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
}
