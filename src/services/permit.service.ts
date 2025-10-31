import { client } from "@/lib/thirdweb";
import { toast } from "react-toastify";
import { Chain, getContract, readContract } from "thirdweb";
import { Account } from "thirdweb/wallets";

// Type for permit message
type PermitMessage = {
  owner: string;
  spender: string;
  value: string;
  nonce: string;
  deadline: string;
};

// Type for EIP-712 domain
type EIP712Domain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
};

// Type for EIP-712 types
type EIP712Types = {
  Permit: { name: string; type: string }[];
};

// Prepare permit payload
export async function preparePermitPayload(
  account: Account,
  chain: Chain,
  tokenAddress: string,
  spender: string,
  amount: bigint,
  deadline: number
): Promise<{
  domain: EIP712Domain;
  permitTypes: EIP712Types;
  permitMessage: PermitMessage;
}> {
  try {
    const owner = account.address;

    // Create contract instance
    const contract = getContract({
      client,
      address: tokenAddress,
      chain: chain,
    });

    // Read token name (required for domain)
    const tokenName = (await readContract({
      contract,
      method: "function name() view returns (string)",
      params: [],
    })) as string;

    // Read nonce for the owner
    const nonce = (await readContract({
      contract,
      method: "function nonces(address) view returns (uint256)",
      params: [owner],
    })) as bigint;

    // Define domain
    const domain: EIP712Domain = {
      name: tokenName,
      version: "1",
      chainId: chain.id,
      verifyingContract: tokenAddress,
    };

    // Define EIP-712 permit type
    const types: EIP712Types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const message: PermitMessage = {
      owner,
      spender,
      value: amount.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    };

    console.debug("Prepared Permit payload", domain, types, message);

    return { domain, permitTypes: types, permitMessage: message };
  } catch (error) {
    console.error("Error in prepare permit payload:", error);
    toast.error("Failed to prepare permit payload");
    throw error;
  }
}

// Sign permit payload with the connected wallet
export async function signPermitPayload(
  account: Account,
  domain: EIP712Domain,
  types: EIP712Types,
  message: PermitMessage
): Promise<string> {
  try {
    // Sign typed data (EIP-712)
    const signature = await account.signTypedData({
      domain,
      types,
      primaryType: "Permit",
      message,
    });

    console.debug("Permit signature", signature);

    return signature;
  } catch (error) {
    console.error("Error in sign permit payload:", error);
    toast.error("Failed to sign permit payload");
    throw error;
  }
}
