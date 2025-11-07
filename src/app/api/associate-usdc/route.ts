import { NextRequest, NextResponse } from 'next/server';
import {
    Client,
    PrivateKey,
    AccountId,
    TransferTransaction,
    Hbar,
} from '@hashgraph/sdk';

const USDC_TOKEN_ID = '0.0.429274'; // Hedera USDC testnet token

export async function POST(request: NextRequest) {
    try {
        const { userAddress } = await request.json();

        if (!userAddress) {
            return NextResponse.json(
                { success: false, error: 'User address is required' },
                { status: 400 }
            );
        }

        // Validate environment variables
        const operatorIdStr = process.env.HEDERA_OPERATOR_ID;
        const operatorKeyStr = process.env.HEDERA_OPERATOR_KEY;

        if (!operatorIdStr || !operatorKeyStr) {
            console.error('Missing Hedera credentials in environment');
            return NextResponse.json(
                { success: false, error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Convert user's EVM address to Hedera Account ID
        const userAccountId = AccountId.fromEvmAddress(0, 0, userAddress);
        const accountIdString = userAccountId.toString();

        // Check if already associated using Mirror Node API (free)
        const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountIdString}/tokens?token.id=${USDC_TOKEN_ID}`;
        const mirrorResponse = await fetch(mirrorNodeUrl);

        if (mirrorResponse.ok) {
            const data = await mirrorResponse.json();
            if (data.tokens && data.tokens.length > 0) {
                return NextResponse.json({
                    success: true,
                    message: 'USDC token already associated',
                    alreadyAssociated: true,
                });
            }
        }

        // Check if user already has HBAR
        const accountInfoUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountIdString}`;
        const accountInfoResponse = await fetch(accountInfoUrl);

        let needsHbar = true;
        if (accountInfoResponse.ok) {
            const accountData = await accountInfoResponse.json();
            const hbarBalance = parseInt(accountData.balance?.balance || '0');
            // If user has more than 0.05 HBAR (50000000 tinybars), they don't need more
            if (hbarBalance > 50000000) {
                needsHbar = false;
            }
        }

        // Setup Hedera client
        const operatorId = AccountId.fromString(operatorIdStr);
        const operatorKey = PrivateKey.fromStringECDSA(operatorKeyStr);

        const client = Client.forTestnet();
        client.setOperator(operatorId, operatorKey);

        try {
            // Send HBAR to user account for association fee (if needed)
            if (needsHbar) {
                console.log(`Sending 0.5 HBAR to ${accountIdString} for association fee...`);
                const hbarTransferTx = await new TransferTransaction()
                    .addHbarTransfer(operatorId, new Hbar(-0.5)) // Deduct from service account
                    .addHbarTransfer(userAccountId, new Hbar(0.5)) // Send to user
                    .execute(client);

                const hbarReceipt = await hbarTransferTx.getReceipt(client);
                console.log(`HBAR transfer status: ${hbarReceipt.status.toString()}`);
            }

            return NextResponse.json({
                success: true,
                message: 'Ready for token association. User must sign the association transaction.',
                hbarSent: needsHbar,
                needsAssociation: true,
            });
        } finally {
            client.close();
        }
    } catch (error) {
        console.error('Error in associate-usdc endpoint:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: `Failed to prepare association: ${errorMessage}` },
            { status: 500 }
        );
    }
}
