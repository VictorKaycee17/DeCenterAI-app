import { AccountId, Client, Hbar, PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

/** ✅ Define the type first */
export interface HederaClientConfig {
  id?: string;
  privateKey?: string;
  network?: "testnet" | "mainnet" | "previewnet" | "localnode";
  privateKeyType?: "ECDSA" | "EDDSA";
}

/** ✅ Now use the type */
export function createInstance(params: HederaClientConfig = {}) {
  let {
    id,
    privateKey,
    network,
    privateKeyType,
  } = params;

  id = id || process.env.HEDERA_ACCOUNT_ID!;
  privateKey = privateKey || process.env.HEDERA_ACCOUNT_PRIVATE_KEY!;
  network = network || (process.env.HEDERA_ACCOUNT_NETWORK as HederaClientConfig["network"]) || "testnet";
  privateKeyType = privateKeyType || (process.env.HEDERA_ACCOUNT_PRIVATE_KEY_TYPE as HederaClientConfig["privateKeyType"]) || "ECDSA";

  console.log("hedera client createInstance", {
    network,
    id,
    privateKey: privateKey.substring(0, 5) + "...",
    privateKeyType,
  });

  if (!id || !privateKey) {
    throw new Error("Must set env vars: HEDERA_ACCOUNT_ID and HEDERA_ACCOUNT_PRIVATE_KEY");
  }

  const operatorId = AccountId.fromString(id);

  const operatorKey =
    privateKeyType.toLowerCase() === "ecdsa"
      ? PrivateKey.fromStringECDSA(privateKey)
      : PrivateKey.fromStringED25519(privateKey);

  let client: Client;

  switch (network) {
    case "testnet":
      client = Client.forTestnet();
      break;
    case "mainnet":
      client = Client.forMainnet();
      break;
    case "previewnet":
      client = Client.forPreviewnet();
      break;
    case "localnode":
      client = Client.forLocalNode();
      break;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }

  client.setOperator(operatorId, operatorKey);
  client.setDefaultMaxQueryPayment(new Hbar(50));
  client.setDefaultMaxTransactionFee(new Hbar(100));

  return client;
}
