import { Chain, GetUserResult, ThirdwebClient } from "thirdweb";
import { GetBalanceResult } from "thirdweb/extensions/erc20";
import { getUser, getWalletBalance } from "thirdweb/wallets";

// Fetch a user from Thirdweb based on wallet address.
export const fetchUserFromThirdWeb = async (
  client: ThirdwebClient,
  walletAddress: string
): Promise<GetUserResult | null> => {
  try {
    if (!client || !walletAddress) {
      throw new Error("Client and wallet address are required");
    }
    const user = await getUser({
      client,
      walletAddress,
    });
    return user || null;
  } catch (error) {
    console.error(`Failed to fetch user for wallet ${walletAddress}:`, error);
    throw error instanceof Error
      ? error
      : new Error("Error retrieving user from Thirdweb");
  }
};

// Retrieve the token balance for a given address on a specific chain.
export const fetchTokenBalance = async (
  address: string,
  chain: Chain,
  client: ThirdwebClient,
  tokenAddress?: string
): Promise<GetBalanceResult> => {
  try {
    if (!client || !address || !chain) {
      throw new Error("Client, address, and chain are required");
    }
    const balance = await getWalletBalance({
      address,
      client,
      chain,
      tokenAddress,
    });

    return balance;
  } catch (error) {
    console.error(`Failed to fetch balance for address ${address}:`, error);
    throw error instanceof Error
      ? error
      : new Error("Error retrieving balance from Thirdweb");
  }
};
