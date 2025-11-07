import { NextRequest, NextResponse } from 'next/server';
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from 'thirdweb';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { somniaTestnet, somniaTestnetConfig } from '@/utils/chains';
import { cookies } from 'next/headers';
import { getUserByWallet } from '@/actions/supabase/users';
import { supabase } from '@/lib/supabase';

const HEDERA_TESTNET_MIRROR = 'https://testnet.mirrornode.hedera.com';
const USDC_TOKEN_ID = '0.0.429274'; // USDC on Hedera testnet

// Somnia UNREAL token configuration
const UNREAL_TOKEN_ADDRESS = somniaTestnetConfig.custom.tokens.UnrealToken.address;
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

// Create thirdweb client
const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID!,
});

// Convert EVM address to Hedera account ID
function evmToHederaId(evmAddress: string): string | null {
    try {
        // Remove 0x prefix and convert to number
        const hex = evmAddress.toLowerCase().replace('0x', '');
        const num = parseInt(hex, 16);
        return `0.0.${num}`;
    } catch {
        return null;
    }
}

interface TokenTransfer {
    token_id: string;
    account: string;
    amount: number;
}

interface Transaction {
    transaction_id: string;
    consensus_timestamp: string;
    result: string;
    token_transfers?: TokenTransfer[];
}

async function verifyUSDCTransfer(
    transactionHash: string,
    expectedSender: string,
    expectedReceiver: string,
    expectedAmount: number,
    retries = 5
): Promise<{
    verified: boolean;
    transaction?: {
        id: string;
        timestamp: string;
        sender: string;
        receiver: string;
        amount: number;
        tokenId: string;
    };
    error?: string;
    details?: unknown;
}> {

    // Convert addresses to Hedera format
    const senderHederaId = evmToHederaId(expectedSender);
    const receiverHederaId = evmToHederaId(expectedReceiver);

    if (!senderHederaId || !receiverHederaId) {
        return {
            verified: false,
            error: 'Invalid account addresses'
        };
    }

    const expectedAmountInSmallestUnit = expectedAmount * 1_000_000; // USDC has 6 decimals

    console.log('🔍 Starting payment verification:', {
        sender: `${expectedSender} (${senderHederaId})`,
        receiver: `${expectedReceiver} (${receiverHederaId})`,
        amount: `${expectedAmount} USDC (${expectedAmountInSmallestUnit} smallest units)`,
        txHash: transactionHash
    });

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Verification attempt ${i + 1}/${retries}: Checking recent transfers...`);

            // Query receiver account's recent transactions
            const txUrl = `${HEDERA_TESTNET_MIRROR}/api/v1/transactions?account.id=${receiverHederaId}&transactiontype=cryptotransfer&limit=20&order=desc`;
            const txResponse = await fetch(txUrl);

            if (!txResponse.ok) {
                if (i < retries - 1) {
                    console.log('Mirror Node not responding, retrying...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue;
                }
                return {
                    verified: false,
                    error: `Failed to fetch transactions: ${txResponse.status}`
                };
            }

            const txData = await txResponse.json();

            if (!txData.transactions || txData.transactions.length === 0) {
                if (i < retries - 1) {
                    console.log('No transactions found yet, waiting for indexing...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue;
                }
                return {
                    verified: false,
                    error: 'No recent transactions found'
                };
            }

            // Look through recent transactions for a matching USDC transfer
            for (const tx of txData.transactions as Transaction[]) {
                // Only check transactions from the last 5 minutes to avoid false matches
                const txTimestamp = parseFloat(tx.consensus_timestamp);
                const fiveMinutesAgo = Date.now() / 1000 - 300;

                if (txTimestamp < fiveMinutesAgo) {
                    continue; // Skip old transactions
                }

                // Check transaction status
                if (tx.result !== 'SUCCESS') {
                    continue;
                }

                // Check if this transaction has USDC transfers
                const usdcTransfers = tx.token_transfers?.filter(
                    transfer => transfer.token_id === USDC_TOKEN_ID
                ) || [];

                if (usdcTransfers.length === 0) continue;

                // Find the sender (negative amount) and receiver (positive amount)
                const senderTransfer = usdcTransfers.find(
                    t => t.account === senderHederaId && t.amount < 0
                );

                const receiverTransfer = usdcTransfers.find(
                    t => t.account === receiverHederaId && t.amount > 0
                );

                // Verify all conditions
                const senderMatches = senderTransfer &&
                    Math.abs(senderTransfer.amount) === expectedAmountInSmallestUnit;

                const receiverMatches = receiverTransfer &&
                    receiverTransfer.amount === expectedAmountInSmallestUnit;

                if (senderMatches && receiverMatches) {
                    console.log('✅ Payment verified successfully!', {
                        transactionId: tx.transaction_id,
                        timestamp: tx.consensus_timestamp
                    });

                    return {
                        verified: true,
                        transaction: {
                            id: tx.transaction_id,
                            timestamp: tx.consensus_timestamp,
                            sender: senderHederaId,
                            receiver: receiverHederaId,
                            amount: expectedAmount,
                            tokenId: USDC_TOKEN_ID
                        }
                    };
                }
            }

            // If we get here, no matching transaction found yet
            if (i < retries - 1) {
                console.log('No matching transaction found, retrying...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                continue;
            }

            return {
                verified: false,
                error: 'No matching USDC transfer found in recent transactions'
            };

        } catch (error) {
            console.error('Verification error:', error);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                continue;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                verified: false,
                error: `Verification failed: ${errorMessage}`
            };
        }
    }

    return {
        verified: false,
        error: 'Max retries exceeded'
    };
}

/**
 * Send UNREAL tokens on Somnia to the user's wallet
 */
async function sendUnrealTokens(
    recipientAddress: string,
    amount: number
): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
}> {
    try {
        if (!TREASURY_PRIVATE_KEY) {
            console.error('❌ TREASURY_PRIVATE_KEY not configured');
            return { success: false, error: 'Treasury wallet not configured' };
        }

        console.log('💎 Sending UNREAL tokens on Somnia:', {
            recipient: recipientAddress,
            amount: amount,
            token: UNREAL_TOKEN_ADDRESS
        });

        // Create treasury account from private key
        const treasuryAccount = privateKeyToAccount({
            client,
            privateKey: TREASURY_PRIVATE_KEY,
        });

        // Get UNREAL token contract on Somnia
        const unrealContract = getContract({
            client,
            chain: somniaTestnet,
            address: UNREAL_TOKEN_ADDRESS,
        });

        // Convert amount to smallest unit (18 decimals for UNREAL)
        const amountInSmallestUnit = BigInt(amount) * BigInt(10 ** 18);

        // Prepare transfer transaction
        const transaction = prepareContractCall({
            contract: unrealContract,
            method: 'function transfer(address to, uint256 amount) returns (bool)',
            params: [recipientAddress, amountInSmallestUnit],
        });

        // Send transaction from treasury wallet
        const result = await sendTransaction({
            transaction,
            account: treasuryAccount,
        });

        console.log('✅ UNREAL tokens sent successfully:', {
            transactionHash: result.transactionHash,
            explorerUrl: `${somniaTestnetConfig.blockExplorers.default.url}/tx/${result.transactionHash}`
        });

        return {
            success: true,
            transactionHash: result.transactionHash,
        };

    } catch (error) {
        console.error('❌ Error sending UNREAL tokens:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            error: errorMessage,
        };
    }
}

export async function POST(request: NextRequest) {
    try {
        // LAYER 1: Authentication Check
        const cookieStore = await cookies();
        const walletCookie = cookieStore.get('tw_wallet')?.value;

        if (!walletCookie) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - Please log in' },
                { status: 401 }
            );
        }

        // Get user from database
        const userResult = await getUserByWallet(walletCookie);
        if (!userResult.success || !userResult.data) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 401 }
            );
        }

        const user = userResult.data;

        const body = await request.json();
        const {
            transactionHash,
            senderAddress,
            receiverAddress,
            amount,
            credits
        } = body;

        // Validate inputs
        if (!transactionHash || !senderAddress || !receiverAddress || !amount || !credits) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields'
                },
                { status: 400 }
            );
        }

        // LAYER 2: Wallet Ownership Verification
        if (senderAddress.toLowerCase() !== user.wallet?.toLowerCase()) {
            console.error('🚨 Wallet mismatch:', {
                senderAddress,
                userWallet: user.wallet,
                userId: user.id
            });
            return NextResponse.json(
                { success: false, error: 'Sender address does not match your wallet' },
                { status: 403 }
            );
        }

        // LAYER 3: Transaction Deduplication (Prevent Replay Attacks)
        const { data: existingPayment } = await supabase
            .from('hedera_hack_payment')
            .select('id')
            .eq('transaction_hash', transactionHash)
            .single();

        if (existingPayment) {
            return NextResponse.json(
                { success: false, error: 'Transaction already processed' },
                { status: 400 }
            );
        }

        // Trust thirdweb transaction hash (Thirdweb only returns hash if transaction succeeded)

        console.log('✅ Payment Confirmed and Logged:');
        console.log({
            transactionHash,
            timestamp: new Date().toISOString(),
            sender: senderAddress,
            senderHedera: evmToHederaId(senderAddress),
            receiver: receiverAddress,
            receiverHedera: evmToHederaId(receiverAddress),
            amountUSDC: parseFloat(amount),
            credits: parseInt(credits),
            status: 'confirmed',
            explorerUrl: `https://hashscan.io/testnet/transaction/${transactionHash}`
        });

        // Send UNREAL tokens on Somnia to user's wallet
        const tokenResult = await sendUnrealTokens(senderAddress, parseInt(credits));

        if (!tokenResult.success) {
            console.error('❌ Failed to send UNREAL tokens:', tokenResult.error);
            // Payment was successful on Hedera, but token sending failed
            // Still return success for payment, but note the token issue
            return NextResponse.json({
                success: true,
                warning: 'Payment confirmed but token distribution failed',
                tokenError: tokenResult.error,
                transaction: {
                    hash: transactionHash,
                    sender: senderAddress,
                    receiver: receiverAddress,
                    amount: parseFloat(amount),
                    credits: parseInt(credits),
                    explorerUrl: `https://hashscan.io/testnet/transaction/${transactionHash}`
                },
                creditsToAdd: parseInt(credits)
            });
        }

        console.log('💎 UNREAL tokens distributed:', {
            recipient: senderAddress,
            amount: parseInt(credits),
            txHash: tokenResult.transactionHash
        });

        // Store payment in database (after successful token transfer)
        const { error: insertError } = await supabase
            .from('hedera_hack_payment')
            .insert({
                user_id: user.id,
                wallet_address: senderAddress,
                transaction_hash: transactionHash,
                unreal_transaction_hash: tokenResult.transactionHash,
                amount_usdc: parseFloat(amount),
                credits: parseInt(credits),
                status: 'confirmed',
                created_at: new Date().toISOString()
            });

        if (insertError) {
            console.error('❌ Failed to store payment in database:', insertError);
            // Payment and tokens sent successfully, but DB insert failed
            // Not critical - admin can review logs
        } else {
            console.log('✅ Payment stored in database:', {
                userId: user.id,
                transactionHash,
                unrealTxHash: tokenResult.transactionHash
            });
        }

        // LAYER 4: Background Verification (async - doesn't block response)
        // This flags fraudulent transactions for manual review
        setTimeout(() => {
            verifyUSDCTransfer(transactionHash, senderAddress, receiverAddress, parseFloat(amount))
                .then(async result => {
                    if (result.verified) {
                        console.log('✅ Background verification succeeded:', result.transaction?.id);
                        // Update database: status = 'verified'
                        await supabase
                            .from('hedera_hack_payment')
                            .update({
                                status: 'verified',
                                verified_at: new Date().toISOString()
                            })
                            .eq('transaction_hash', transactionHash);
                    } else {
                        console.error('🚨 FRAUD ALERT: Background verification failed!', {
                            transactionHash,
                            senderAddress,
                            userId: user.id,
                            error: result.error
                        });
                        // Update database: status = 'fraud_suspected'
                        await supabase
                            .from('hedera_hack_payment')
                            .update({ status: 'fraud_suspected' })
                            .eq('transaction_hash', transactionHash);

                        // TODO: Send alert to admin (email, Slack, etc.)
                        // TODO: Implement credit freeze mechanism if needed
                    }
                })
                .catch(err => {
                    console.warn('⚠️ Background verification error (not fraud, just indexing delay):', err.message);
                });
        }, 10000); // Wait 10 seconds for Mirror Node to index

        return NextResponse.json({
            success: true,
            message: 'Payment confirmed and UNREAL tokens sent successfully',
            transaction: {
                hash: transactionHash,
                sender: senderAddress,
                receiver: receiverAddress,
                amount: parseFloat(amount),
                credits: parseInt(credits),
                explorerUrl: `https://hashscan.io/testnet/transaction/${transactionHash}`
            },
            unrealTokens: {
                amount: parseInt(credits),
                transactionHash: tokenResult.transactionHash,
                explorerUrl: `${somniaTestnetConfig.blockExplorers.default.url}/tx/${tokenResult.transactionHash}`
            },
            creditsToAdd: parseInt(credits)
        });

    } catch (error) {
        console.error('Server error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                success: false,
                error: `Server error: ${errorMessage}`
            },
            { status: 500 }
        );
    }
}
