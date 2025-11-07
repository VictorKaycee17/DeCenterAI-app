// components/TopUpModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { WalletIcon, LightningIcon, X} from '@phosphor-icons/react';
import {useActiveAccount} from 'thirdweb/react';
import { prepareContractCall, sendTransaction, getContract } from 'thirdweb';
import {client} from "@/lib/thirdweb"
import {hederaTestnet} from "@/utils/chains";
import { useTopUpModalState } from '@/hooks/useTopUpModalState';
import { AccountId } from "@hashgraph/sdk";
import { toast } from "react-toastify";
import { getBalance } from "thirdweb/extensions/erc20";
import {useUser} from "@/hooks/useUser";


// USDC contract on Hedera testnet
const USDC_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000068cda'; // 0.0.429274
const USDC_TOKEN_ID = "0.0.429274"; // Hedera Token ID for USDC
const RECEIVER_ACCOUNT_EVM = '0x00000000000000000000000000000000006ddaeb';

// Hedera Token Service (HTS) precompiled contract for token association
const HTS_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000167';

export default function TopUpModal() {
    const account = useActiveAccount();
    const { isOpen, toggleModal } = useTopUpModalState();
    const [credits, setCredits] = useState('0');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [txHash, setTxHash] = useState('');
    const [isAssociated, setIsAssociated] = useState(false);
    const [hasUsdcBalance, setHasUsdcBalance] = useState(false);
    const { clearUser, email, username, profile_image, wallet } = useUser();


    const creditValue = parseInt(credits) || 0;
    const amount = creditValue; // 1 cent = 1 credit = 1 inference

    // Hedera Mirror Node API base URL for testnet
    const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com/api/v1';

    // Poll Mirror Node to verify token association
    const pollForAssociation = useCallback(async (accountAddress: string, maxRetries = 10): Promise<boolean> => {
        const hederaAccountId = AccountId.fromEvmAddress(0, 0, accountAddress);
        const accountIdString = hederaAccountId.toString();

        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`Polling for association... attempt ${i + 1}/${maxRetries}`);

                const response = await fetch(
                    `${MIRROR_NODE_URL}/accounts/${accountIdString}/tokens?token.id=${USDC_TOKEN_ID}`
                );

                if (response.ok) {
                    const data = await response.json();
                    const foundAssociation = data.tokens && data.tokens.length > 0;

                    if (foundAssociation) {
                        console.log('✅ Association confirmed on Mirror Node!');
                        return true;
                    }
                }

                // Wait 3 seconds before next attempt
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            } catch (error) {
                console.error('Polling error:', error);
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }

        return false; // Association not found after max retries
    }, []);

    const checkAndAssociateToken = useCallback(async () => {
        if (!account) return;

        setStatus("Checking token association...");
        try {
            // Convert EVM address to Hedera Account ID format
            const hederaAccountId = AccountId.fromEvmAddress(0, 0, account.address);
            const accountIdString = hederaAccountId.toString();

            // Use Mirror Node API to check token associations (free, no operator needed)
            const response = await fetch(
                `${MIRROR_NODE_URL}/accounts/${accountIdString}/tokens?token.id=${USDC_TOKEN_ID}`
            );

            // Handle 404 - account not indexed yet (normal for fresh wallets)
            if (response.status === 404) {
                console.log('Account not found in Mirror Node yet. This is normal for fresh wallets.');
                setStatus("💡 Your wallet is new. USDC setup required. Click 'Setup USDC' to continue.");
                setIsAssociated(false);
                return;
            }

            // Handle other errors
            if (!response.ok) {
                throw new Error(`Mirror Node API error: ${response.statusText}`);
            }

            const data = await response.json();
            const foundAssociation = data.tokens && data.tokens.length > 0;

            if (!foundAssociation) {
                setStatus("💡 USDC setup required. Click 'Setup USDC' below to get started!");
                setIsAssociated(false);
            } else {
                setIsAssociated(true);
                setStatus("✅ USDC token ready. Enter credits and click 'Proceed' to top up.");
            }
        } catch (error) {
            console.error("Error checking token association:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            setStatus(`Error checking token: ${errorMessage}`);
            setIsAssociated(false);
            toast.error("Failed to check token association.");
        }
    }, [account]);

    const associateTokenViaHTS = useCallback(async () => {
        if (!account) return false;

        setStatus("Setting up USDC on your wallet...");
        try {
            // Get HTS contract
            const htsContract = getContract({
                client,
                chain: hederaTestnet,
                address: HTS_CONTRACT_ADDRESS,
            });

            // Prepare associateToken transaction
            // function associateToken(address account, address token) external returns (int64 responseCode)
            const transaction = prepareContractCall({
                contract: htsContract,
                method: 'function associateToken(address account, address token) external returns (int64)',
                params: [account.address, USDC_CONTRACT_ADDRESS],
                gas: BigInt(800_000), // Explicit gas limit for HTS operations
            });

            setStatus('Processing USDC setup...');

            // In-app wallet auto-signs the association transaction (no popup needed!)
            const result = await sendTransaction({
                transaction,
                account,
            });

            console.log('Token association transaction:', result.transactionHash);
            setStatus('Confirming association on blockchain...');

            // Poll Mirror Node to verify association (up to 30 seconds)
            const verified = await pollForAssociation(account.address, 10);

            if (verified) {
                // Association confirmed!
                setIsAssociated(true);
                setStatus('✅ USDC ready!');
                toast.success("USDC is now ready to use!");
                return true;
            } else {
                // Polling timed out - save pending state
                localStorage.setItem('pendingUsdcAssociation', JSON.stringify({
                    address: account.address,
                    timestamp: Date.now(),
                    txHash: result.transactionHash
                }));

                setStatus('⏳ Association is processing. Please wait 1 minute and refresh this page.');
                toast.warning("Association is processing on the blockchain. Please refresh the page in 1 minute.");
                return false;
            }
        } catch (error) {
            console.error("Error associating token via HTS:", error);

            // Extract detailed error message
            let errorMessage = "Unknown error";
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null) {
                // Handle blockchain errors that aren't standard Error objects
                const err = error as unknown as { reason?: string; message?: string; data?: { message?: string } };
                if (err.reason) errorMessage = err.reason;
                else if (err.message) errorMessage = err.message;
                else if (err.data?.message) errorMessage = err.data.message;
                else errorMessage = JSON.stringify(error);
            }

            console.error("Detailed error message:", errorMessage);
            setStatus(`Error setting up USDC: ${errorMessage}`);
            toast.error("Failed to setup USDC token. Check console for details.");
            return false;
        }
    }, [account, pollForAssociation]);

    const checkUsdcBalance = useCallback(async () => {
        if (!account) return;

        try {
            const balance = await getBalance({
                contract: getContract({
                    client,
                    chain: hederaTestnet,
                    address: USDC_CONTRACT_ADDRESS,
                }),
                address: account.address,
            });
            // getBalance returns a TokenBalance object, check its value
            const readableBalance = Number(balance.value) / (10 ** balance.decimals); // Use token decimals for accurate conversion
            if (readableBalance > 0) {
                setHasUsdcBalance(true);
            } else {
                setHasUsdcBalance(false);
            }
        } catch (error) {
            console.error("Error checking USDC balance:", error);
            setHasUsdcBalance(false);
        }
    }, [account]);

    // Check for pending associations on modal open
    useEffect(() => {
        if (account && isOpen) {
            // Check if there's a pending association from previous session
            const pendingData = localStorage.getItem('pendingUsdcAssociation');

            if (pendingData) {
                try {
                    const pending = JSON.parse(pendingData);
                    const timeSinceSubmit = Date.now() - pending.timestamp;

                    // If less than 5 minutes old and same address, auto-retry verification
                    if (timeSinceSubmit < 5 * 60 * 1000 && pending.address.toLowerCase() === account.address.toLowerCase()) {
                        setStatus('Checking for pending association...');

                        pollForAssociation(account.address, 5).then(verified => {
                            if (verified) {
                                setIsAssociated(true);
                                setStatus('✅ USDC ready!');
                                toast.success("USDC association completed!");
                                localStorage.removeItem('pendingUsdcAssociation');
                            } else {
                                setStatus('⏳ Association still processing. Please try again in 1 minute.');
                            }
                        });
                    } else {
                        // Too old or different address, clear it
                        localStorage.removeItem('pendingUsdcAssociation');
                        checkAndAssociateToken();
                        checkUsdcBalance();
                    }
                } catch (error) {
                    console.error('Error parsing pending association:', error);
                    localStorage.removeItem('pendingUsdcAssociation');
                    checkAndAssociateToken();
                    checkUsdcBalance();
                }
            } else {
                // No pending association, normal check
                checkAndAssociateToken();
                checkUsdcBalance();
            }
        }
    }, [account, isOpen, checkAndAssociateToken, checkUsdcBalance, pollForAssociation]);

    const handleProceed = async () => {
        if (!account) {
            setStatus('Please connect your wallet first');
            return;
        }

        if (creditValue <= 0) {
            setStatus('Please enter a valid amount');
            return;
        }

        setLoading(true);

        // Step 1: Handle token association if needed
        if (!isAssociated) {
            try {
                setStatus("Preparing your wallet for USDC...");

                // Call backend to send HBAR for association fee
                const prepResponse = await fetch('/api/associate-usdc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userAddress: account.address }),
                });

                const prepResult = await prepResponse.json();

                if (!prepResponse.ok) {
                    setStatus(`Setup failed: ${prepResult.error}`);
                    toast.error("Failed to prepare wallet for USDC.");
                    setLoading(false);
                    return;
                }

                if (prepResult.alreadyAssociated) {
                    // Already associated, just update state
                    setIsAssociated(true);
                    setStatus("✅ Wallet is ready for USDC!");
                } else if (prepResult.needsAssociation) {
                    // Backend sent HBAR, wait for it to arrive for gas fees
                    setStatus('⏳ Waiting for HBAR to arrive for gas fees...');
                    await new Promise(resolve => setTimeout(resolve, 8000)); // Wait 8 seconds

                    // Now associate token
                    const associated = await associateTokenViaHTS();
                    if (!associated) {
                        setLoading(false);
                        return;
                    }
                }
            } catch (error) {
                console.error('Association error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setStatus(`Failed to setup USDC: ${errorMessage}`);
                toast.error("Failed to setup USDC for your wallet.");
                setLoading(false);
                return;
            }
        }

        // Step 2: Check USDC balance
        if (!hasUsdcBalance) {
            setStatus("You need to have some USDC in your wallet to top up.");
            toast.error("Insufficient USDC balance.");
            setLoading(false);
            return;
        }

        // Step 3: Proceed with payment
        setStatus('Preparing payment...');

        try {
            // Get USDC contract
            const usdcContract = getContract({
                client,
                chain: hederaTestnet,
                address: USDC_CONTRACT_ADDRESS,
            });

            // Convert amount to USDC (amount in cents, USDC has 6 decimals)
            // $1 = 100 cents = 1 USDC
            const usdcAmount = (creditValue / 100) * 1_000_000; // Convert to smallest unit
            const amountInSmallestUnit = BigInt(Math.floor(usdcAmount));

            // Prepare the transfer transaction
            const transaction = prepareContractCall({
                contract: usdcContract,
                method: 'function transfer(address to, uint256 amount) returns (bool)',
                params: [RECEIVER_ACCOUNT_EVM, amountInSmallestUnit],
            });

            setStatus('Processing payment...');

            // In-app wallet auto-signs the transaction (no popup needed!)
            const result = await sendTransaction({
                transaction,
                account,
            });

            const transactionHash = result.transactionHash;
            setTxHash(transactionHash);
            setStatus('Payment confirmed! Processing...');

            // Log transaction on backend (no verification needed - trust thirdweb)
            const logResponse = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionHash,
                    senderAddress: account.address,
                    receiverAddress: RECEIVER_ACCOUNT_EVM,
                    amount: creditValue / 100, // Amount in USDC
                    credits: creditValue, // Number of credits to add
                }),
            });

            const logResult = await logResponse.json();

            if (logResult.success) {
                setStatus(`✅ Payment successful! ${creditValue} credits purchased.`);
                toast.success(`Successfully purchased ${creditValue} credits!`);

                console.log(`Purchase confirmed: ${creditValue} credits for $${(creditValue / 100).toFixed(2)} USDC`);
                console.log(`Transaction: ${logResult.transaction.explorerUrl}`);

                // Close modal after success
                setTimeout(() => {
                    toggleModal();
                    setStatus('');
                    setCredits('0');
                    setTxHash('');
                }, 2000);
            } else {
                setStatus(`❌ Logging failed: ${logResult.error}`);
                toast.error("Payment succeeded but logging failed. Please contact support.");
            }
        } catch (error) {
            console.error('Payment error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
            setStatus(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };


    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80"
                onClick={() => !loading && toggleModal()}
            />


            {/* Modal */}
            <div className="relative bg-[#050505] border border-[#191919] rounded-2xl w-full max-w-md p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-[#F5F5F5] tracking-wide">TOP UP</h2>
                    <button
                        onClick={() => !loading && toggleModal()}
                        disabled={loading}
                        className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X size={24} weight="bold" />
                    </button>
                </div>

                {/* Wallet Connection Status */}
                {account ? (
                    <div
                        className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg flex items-center gap-2 cursor-pointer"
                        onClick={() => {
                            navigator.clipboard.writeText(account.address);
                            toast.success("Wallet address copied!");
                        }}
                    >
                        <WalletIcon size={20} className="text-green-400" />
                        <span className="text-green-400 text-sm">
              Wallet Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}

            </span>
                    </div>
                ) : (
                    <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg flex items-center gap-2">
                        <WalletIcon size={20} className="text-yellow-400" />
                        <span className="text-yellow-400 text-sm">
              Please connect your wallet to proceed
            </span>
                    </div>
                )}

                {/* Number of credits input */}
                <div className="mb-2">
                    <label className="block text-[#C1C1C1] text-sm mb-2">
                        Number of credits
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={credits}
                            onChange={(e) => setCredits(e.target.value)}
                            disabled={loading}
                            className="w-full bg-[#191919] text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:opacity-50"
                            placeholder="0"
                            min="0"
                        />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                            <LightningIcon size={20} weight="fill" />
                        </button>
                    </div>
                </div>

                {/* Conversion info */}
                <p className="text-gray-500 text-xs mb-6">
                    1 credit = 0.01 USDC | Paying with USDC on Hedera
                </p>

                {/* Amount display */}
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#191919]">
                    <span className="text-[#C1C1C1]">Amount</span>
                    <span className="text-white text-2xl font-semibold">
            ${(amount / 100).toFixed(2)} USDC
          </span>
                </div>

                {/* Status message */}
                {status && (
                    <div className="mb-4 p-3 bg-[#191919] rounded-lg border border-gray-700">
                        <p className="text-sm text-[#C1C1C1]">{status}</p>
                        {txHash && (
                            <a
                                href={`https://hashscan.io/testnet/transaction/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 text-xs hover:underline mt-2 block"
                            >
                                View transaction on HashScan →
                            </a>
                        )}
                        {status.includes('Please wait 1 minute and refresh') && (
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-3 w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                Refresh Page
                            </button>
                        )}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={() => toggleModal()}
                        disabled={loading}
                        className="flex-1 bg-[#191919] cursor-pointer text-white rounded-lg py-3 font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleProceed}
                        disabled={loading || !account || (isAssociated && creditValue <= 0)}
                        className="flex-1 bg-white  cursor-pointer text-black rounded-lg py-3 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : (!isAssociated ? 'Setup USDC' : 'Proceed')}
                    </button>
                </div>
            </div>
        </div>
    );
}