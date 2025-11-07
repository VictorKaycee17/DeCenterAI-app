# Token Association Flow for Social Login Users

## Problem
Users created via thirdweb social login don't have access to their private keys, making it impossible to:
- Execute Hedera-native transactions (token association)
- Pay HBAR fees for queries/transactions

## Solution: Backend Auto-Association Service

### Option 1: Auto-Associate on User Registration (Recommended)

**Backend Service** (`src/app/api/associate-token/route.ts`):
```typescript
import {
  Client,
  PrivateKey,
  AccountId,
  TokenAssociateTransaction,
  TransferTransaction,
  Hbar
} from "@hashgraph/sdk";

export async function POST(req: Request) {
  const { userAddress } = await req.json();

  // Your service account (pays for association)
  const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID!);
  const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY!);

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  try {
    const userAccountId = AccountId.fromEvmAddress(0, 0, userAddress);
    const tokenId = TokenId.fromString("0.0.429274"); // USDC

    // Step 1: Send HBAR to user account for association fee (~0.05 HBAR)
    const hbarTransfer = await new TransferTransaction()
      .addHbarTransfer(operatorId, new Hbar(-0.1)) // Deduct from service account
      .addHbarTransfer(userAccountId, new Hbar(0.1)) // Send to user
      .execute(client);

    await hbarTransfer.getReceipt(client);

    // Step 2: Associate token (user signs via thirdweb, pays with HBAR you sent)
    // OR: Use your service account to pay for association
    const associateTx = await new TokenAssociateTransaction()
      .setAccountId(userAccountId)
      .setTokenIds([tokenId])
      .freezeWith(client)
      .sign(operatorKey); // Service account pays

    const associateReceipt = await associateTx.execute(client);
    await associateReceipt.getReceipt(client);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Association error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    client.close();
  }
}
```

### Option 2: Use HashConnect for Association

Let users connect a **Hedera wallet (HashPack, Blade)** alongside thirdweb for one-time association:

```typescript
// Install: npm install hashconnect
import { HashConnect } from 'hashconnect';

const hashconnect = new HashConnect();

// User clicks "Associate USDC" button
async function associateWithHashPack() {
  await hashconnect.init();
  const pairingData = await hashconnect.connect();

  const provider = hashconnect.getProvider();
  const signer = hashconnect.getSigner(provider);

  const tx = new TokenAssociateTransaction()
    .setAccountId(userHederaAccountId)
    .setTokenIds([TokenId.fromString("0.0.429274")]);

  await tx.freezeWithSigner(signer);
  const result = await tx.executeWithSigner(signer);
}
```

### Option 3: Skip Association Check (Simpler but Less UX)

Just try the transfer and handle the error:
- Remove association check entirely
- When transfer fails, show: "Please associate USDC first using HashPack"
- Provide link to instructions

## Recommended Flow

**For your use case** (getting USDC from faucet):

1. **On user signup**: Call backend API to auto-associate USDC for them
2. **Backend service account**:
   - Sends 0.1 HBAR to user account
   - Associates USDC token on their behalf (pays fee from service account)
3. **User can now**: Receive USDC from faucet and make payments

**Cost**: ~$0.05 per user for association (one-time)

## Environment Variables Needed

```env
HEDERA_OPERATOR_ID=0.0.YOUR_SERVICE_ACCOUNT_ID
HEDERA_OPERATOR_KEY=302e020100300506032b657004220420...
```

Would you like me to implement the backend auto-association service?
