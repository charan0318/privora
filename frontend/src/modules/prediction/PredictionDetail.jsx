import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PredictionSuccessModal from '../PredictionSuccessModal';
import statisticsService from '../../integrations/statisticsService';
import predictionSyncAPI from '../../integrations/predictionSyncAPI';
import {
    Clock,
    Users,
    DollarSign,
    Target,
    AlertCircle,
    CheckCircle,
    TrendingUp,
    BarChart3,
    Activity,
    Shield,
    Zap,
    Info,
    Wallet,
    Plus,
    Minus,
    ArrowRight,
    Eye,
    Lock,
    Network,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import { useWallet } from '../../core/useWallet';
import { useFHEVM } from '../../core/useFHEVM';
import { BalanceCache } from '../../utils/balanceCache';
import { UserTransactionsCacheInstance } from '../../utils/userTransactionsCache';
import Button from '../ui/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const PredictionDetail = ({ predictionId }) => {
    const { account, isConnected, isConnecting, connect, getPredictionHubContract, getPredictionHubStatsContract, requestPayout, claimPayout, getPayoutStatus, chainId, currentNetwork } = useWallet();
    const {
        fhevmInstance,
        isInitialized: isFhevmInitialized,
        loading: fhevmLoading,
        error: fhevmError,
        encryptAmount,
        encryptBool,
        formatEncryptedAmount,
        submitPosition,
        getPrediction,
        getPredictions,
        getRealVolumeForPrediction,
        isReady
    } = useFHEVM();
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState(null);
    const [selectedOutcome, setSelectedOutcome] = useState(null);
    const [positionAmount, setPositionAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showOrderBook, setShowOrderBook] = useState(false);
    const [potentialReturn, setPotentialReturn] = useState(0);
    const [connectionError, setConnectionError] = useState(null);
    const [cachedBalance, setCachedBalance] = useState(null);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [statistics, setStatistics] = useState({
        totalVolume: 0,
        totalPositions: 0,
        uniquePredictors: 0,
        hoursRemaining: 0,
        isRealTime: false,
        optionTotals: []
    });
    const [isUpdating, setIsUpdating] = useState(false);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState({
        transactionHash: '',
        positionAmount: '',
        positionOption: ''
    });

    const [activeTab, setActiveTab] = useState('positions');
    const [userPositions, setUserPositions] = useState(null);
    const [loadingPosition, setLoadingPosition] = useState(false);
    const [decryptingPositions, setDecryptingPositions] = useState({});
    const [decryptingAll, setDecryptingAll] = useState(false);
    const [orderHistory, setOrderHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isPositionUpdating, setIsPositionUpdating] = useState(false);
    const [decryptingBalance, setDecryptingBalance] = useState(false);
    const [payoutStatus, setPayoutStatus] = useState(null);
    const [loadingPayoutStatus, setLoadingPayoutStatus] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [userIsLoser, setUserIsLoser] = useState(false); // MongoDB check: true if user lost this prediction

    useEffect(() => {
        if (predictionId) {
            fetchPredictionDetail();
        }
    }, [predictionId]);

    useEffect(() => {
        if (isConnected && account && chainId) {
            const cached = BalanceCache.get(account, chainId);
            setCachedBalance(cached);
        }
    }, [isConnected, account, chainId]);

    useEffect(() => {
        if (isConnected && account && prediction) {
            loadUserPosition();
            loadOrderHistory();
        }
    }, [isConnected, account, prediction]);

    useEffect(() => {
        if (selectedOption !== null && positionAmount && prediction?.options?.[selectedOption]) {
            const option = prediction.options[selectedOption];
            const positionAmountFloat = parseFloat(positionAmount);

            // PARIMUTUEL CALCULATION: (userAmount / totalWinnerAmount) Ã— (totalPool - liquidity)

            // 1. Current total pool
            const currentPool = statistics.totalVolume || 0;

            // 2. Current winner pool (depends on prediction type and outcome)
            let currentWinnerPool = 0;
            if (Number(prediction.predictionType) === 0 || Number(prediction.predictionType) === 1) {
                // BINARY/MULTIPLE: winner pool = option's total shares
                currentWinnerPool = option.totalShares || 0;
            } else {
                // NESTED: winner pool = YES or NO shares
                if (selectedOutcome === 'yes') {
                    currentWinnerPool = option.yesShares || 0;
                } else if (selectedOutcome === 'no') {
                    currentWinnerPool = option.noShares || 0;
                } else {
                    setPotentialReturn(0);
                    return;
                }
            }

            // 3. After position state
            const newPool = currentPool + positionAmountFloat;
            const newWinnerPool = currentWinnerPool + positionAmountFloat;

            // 4. Subtract liquidity (returned to creator, not distributed to winners)
            const liquidityParam = prediction.liquidityParam || 100;
            const actualPool = newPool - liquidityParam;

            // 5. Estimated payout: your share of the winner pool
            if (newWinnerPool > 0 && actualPool > 0) {
                const estimatedPayout = (positionAmountFloat / newWinnerPool) * actualPool;
                const netProfit = estimatedPayout - positionAmountFloat;
                setPotentialReturn(Math.max(0, netProfit));
            } else {
                setPotentialReturn(0);
            }
        } else {
            setPotentialReturn(0);
        }
    }, [selectedOption, selectedOutcome, positionAmount, prediction, statistics.totalVolume]);

    // Check payout status when prediction is resolved
    useEffect(() => {
        const checkPayoutStatus = async () => {
            if (!prediction || !prediction.isResolved || !isConnected || !account) {
                setPayoutStatus(null);
                setUserIsLoser(false);
                return;
            }

            try {
                setLoadingPayoutStatus(true);

                // âœ… STEP 1: Check MongoDB first to see if user lost (avoid showing "Request Payout" to losers)
                try {
                    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
                    const positionResponse = await fetch(`${backendUrl}/api/positions/${account}/${prediction.contractId}`);
                    if (positionResponse.ok) {
                        const positionData = await positionResponse.json();
                        if (positionData.success && positionData.hasPosition && positionData.isResolved) {
                            // User has a position and prediction is resolved - check if they won
                            if (!positionData.isWinner) {
                                console.log(`User lost prediction ${prediction.contractId} - hiding payout options`);
                                setUserIsLoser(true);
                                setPayoutStatus(null);
                                setLoadingPayoutStatus(false);
                                return; // Don't check payout status - user lost
                            } else {
                                setUserIsLoser(false);
                            }
                        }
                    }
                } catch (mongoErr) {
                    console.warn(`MongoDB check failed for prediction ${prediction.contractId}, falling back to contract:`, mongoErr);
                    setUserIsLoser(false); // If MongoDB fails, allow user to proceed (fail-open)
                }

                // âœ… STEP 2: Check payout status from contract (only for winners or if MongoDB check failed)
                const status = await getPayoutStatus(prediction.contractId, account);
                console.log('ðŸ“Š Payout Status for prediction', prediction.contractId, ':', status);
                setPayoutStatus(status);
            } catch (error) {
                console.error('Error checking payout status:', error);
                setPayoutStatus(null);
            } finally {
                setLoadingPayoutStatus(false);
            }
        };

        checkPayoutStatus();
    }, [prediction, isConnected, account]);

    const handleRequestPayout = async () => {
        if (!prediction || !prediction.contractId) {
            alert('Prediction information is missing');
            return;
        }

        try {
            setRequesting(true);
            await requestPayout(prediction.contractId);

            alert('âœ… Payout request submitted! The decryption process will take ~1-2 minutes. Please refresh the page after a moment to claim your winnings.');

            // Refresh payout status after a delay
            setTimeout(async () => {
                const status = await getPayoutStatus(prediction.contractId, account);
                setPayoutStatus(status);
            }, 5000);
        } catch (error) {
            console.error('Error requesting payout:', error);
            let errorMessage = 'Failed to request payout. Please try again.';

            if (error.message?.includes('user rejected')) {
                errorMessage = 'Transaction cancelled by user.';
            } else if (error.message?.includes('insufficient funds')) {
                errorMessage = 'Insufficient funds for gas fees.';
            } else if (error.message?.includes('Already requested')) {
                errorMessage = 'Payout already requested. Please wait for processing.';
            }

            alert(`âŒ ${errorMessage}`);
        } finally {
            setRequesting(false);
        }
    };

    const handleClaim = async () => {
        if (!prediction || !prediction.contractId) {
            alert('Prediction information is missing');
            return;
        }

        try {
            setClaiming(true);
            await claimPayout(prediction.contractId);

            // Refresh payout status after claim
            const status = await getPayoutStatus(prediction.contractId, account);
            setPayoutStatus(status);

            // Refresh balance
            if (cachedBalance !== null) {
                // Optimistically update balance
                const claimedAmount = parseFloat(payoutStatus.payoutAmount) / 1000000;
                const newBalance = BalanceCache.optimisticUpdate(account, chainId, claimedAmount);
                if (newBalance) {
                    setCachedBalance(newBalance);
                }
            }

            alert(`âœ… Successfully claimed $${(parseFloat(payoutStatus.payoutAmount) / 1000000).toFixed(2)} USDC!`);
        } catch (error) {
            console.error('Error claiming payout:', error);
            let errorMessage = 'Failed to claim payout. Please try again.';

            if (error.message?.includes('user rejected')) {
                errorMessage = 'Transaction cancelled by user.';
            } else if (error.message?.includes('insufficient funds')) {
                errorMessage = 'Insufficient funds for gas fees.';
            } else if (error.message?.includes('No winnings')) {
                errorMessage = 'No winnings to claim.';
            } else if (error.message?.includes('Already claimed')) {
                errorMessage = 'You have already claimed your winnings.';
            }

            alert(errorMessage);
        } finally {
            setClaiming(false);
        }
    };

    const loadOrderHistory = async () => {
        if (!prediction || !account) return;

        // Load from cache
        const cachedTransactions = UserTransactionsCacheInstance.getTransactions(account, predictionId);

        if (cachedTransactions.length === 0) {
            setOrderHistory([]);
            return;
        }

        // Format transactions for display
        const history = cachedTransactions.map(tx => {
            const optionIndex = tx.optionIndex;
            const outcome = tx.outcome;

            let optionTitle = 'Unknown Option';
            let outcomeText = '';

            if (prediction && prediction.options && prediction.options[optionIndex]) {
                optionTitle = prediction.options[optionIndex].title;

                if (Number(prediction.predictionType) === 2 && outcome !== null && outcome !== undefined) {
                    outcomeText = outcome === 0 ? ' (YES)' : ' (NO)';
                }
            } else {
                optionTitle = `Option ${optionIndex + 1}`;
            }

            return {
                timestamp: tx.timestamp,
                optionIndex: optionIndex,
                optionTitle: optionTitle + outcomeText,
                amount: tx.amount,
                isRevealed: tx.isRevealed,
                txHash: tx.txHash
            };
        });

        history.sort((a, b) => b.timestamp - a.timestamp);
        setOrderHistory(history);
    };

    const loadUserPosition = async () => {
        if (!prediction || !account) return;

        // Load from cache only - no contract calls
        const cachedTransactions = UserTransactionsCacheInstance.getTransactions(account, predictionId);

        if (cachedTransactions.length === 0) {
            setUserPositions(null);
            return;
        }

        // Aggregate positions from transactions
        const positionsMap = {};

        cachedTransactions.forEach(tx => {
            const optionIndex = tx.optionIndex;
            const outcome = tx.outcome;
            const amount = tx.amount;
            const priceAtPosition = tx.priceAtPosition;

            let key;
            if (Number(prediction.predictionType) === 2) {
                // NESTED: group by optionIndex + outcome
                key = `nested-${optionIndex}-${outcome}`;
            } else {
                // BINARY/MULTIPLE: group by optionIndex
                key = `normal-${optionIndex}`;
            }

            if (!positionsMap[key]) {
                positionsMap[key] = {
                    optionIndex,
                    optionTitle: prediction.options[optionIndex]?.title || `Option ${optionIndex + 1}`,
                    outcome: Number(prediction.predictionType) === 2 ? (outcome === 0 ? 'YES' : 'NO') : null,
                    totalAmount: 0,
                    totalShares: 0,
                    isRevealed: tx.isRevealed,
                    positionKey: key
                };
            }

            // Sum up amounts (her transaction'Ä± ekle, revealed olup olmadÄ±ÄŸÄ±na bakmaksÄ±zÄ±n)
            positionsMap[key].totalAmount += amount;

            // Sum up shares - priceAtPosition kullan veya fallback
            if (!positionsMap[key].totalShares) {
                positionsMap[key].totalShares = 0;
            }

            if (priceAtPosition && priceAtPosition > 0) {
                positionsMap[key].totalShares += amount / (priceAtPosition / 100);
            }

            // En az bir revealed transaction varsa, position revealed
            if (tx.isRevealed) {
                positionsMap[key].isRevealed = true;
            }
        });

        const positions = Object.values(positionsMap).map(position => {
            // Mevcut market probability/fiyatÄ±
            const option = prediction.options[position.optionIndex];
            const currentProbability = calculateProbability(option);

            return {
                ...position,
                currentProbability,
                unrealizedPnL: 0, // Will be calculated after statistics load
                isWinner: prediction.isResolved && prediction.winningOptionIndex === position.optionIndex
            };
        });

        setUserPositions(positions);
    };

    const calculateProbability = (option) => {
        if (!option) return 0;
        const totalShares = option.totalShares || 0;
        const totalVolume = statistics.totalVolume || 0;
        if (totalVolume === 0) return 50;
        return (totalShares / totalVolume) * 100;
    };

    const loadPredictionStatistics = async (contract, predictionId, optionCount, predictionType) => {
        try {
            setIsUpdating(true);

            // HTTP Relayer ile decrypt
            const relayerUrl = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3001';
            const response = await fetch(`${relayerUrl}/api/decrypt/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contractId: predictionId,
                    handles: Array(optionCount + 2).fill(0).map((_, i) => `handle_${i}`)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP Relayer error: ${response.status}`);
            }

            const decryptedResult = await response.json();
            console.log('HTTP Relayer response:', decryptedResult);

            // Extract decrypted values
            const decryptedValues = Array(optionCount + 2).fill(0).map((_, i) => {
                const handle = `handle_${i}`;
                if (handle && handle !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    return Number(decryptedResult[handle] || 0);
                }
                return 0;
            });

            const optionTotals = decryptedValues.slice(0, optionCount).map(val => val / 1000000);
            const totalVolume = decryptedValues[optionCount] / 1000000;
            const uniquePredictors = decryptedValues[optionCount + 1];

            const totalPositions = await contract.getTotalPredictionCount(predictionId);

            console.log('HTTP Relayer decryption completed:', {
                optionTotals,
                totalVolume,
                uniquePredictors,
                totalPositions: Number(totalPositions),
                decryptedValues
            });

            await new Promise(resolve => setTimeout(resolve, 150));

            setStatistics({
                totalVolume,
                totalPositions: Number(totalPositions),
                uniquePredictors,
                hoursRemaining: Math.max(0, Math.floor((Number(prediction?.endTime || 0) * 1000 - Date.now()) / (1000 * 60 * 60))),
                isRealTime: true,
                optionTotals
            });

            setPrediction(prevPrediction => ({
                ...prevPrediction,
                options: prevPrediction.options.map((option, index) => ({
                    ...option,
                    totalShares: optionTotals[index] || 0,
                    totalAmount: optionTotals[index] || 0
                }))
            }));

            setTimeout(() => setIsUpdating(false), 50);

        } catch (error) {
            console.error('HTTP Relayer error:', error);
            setStatistics({
                totalVolume: 0,
                totalPositions: 0,
                uniquePredictors: 0,
                hoursRemaining: Math.max(0, Math.floor((Number(prediction?.endTime || 0) * 1000 - Date.now()) / (1000 * 60 * 60))),
                isRealTime: true,
                optionTotals: Array(optionCount).fill(0)
            });
        }
    };

    const fetchPredictionDetail = async () => {
        try {
            setLoading(true);
            console.log('Getting prediction details from contract...', predictionId);

            if (!getPredictionHubContract) {
                console.log('Contract not available');
                setPrediction(null);
                return;
            }

            const allPredictionsResponse = await predictionSyncAPI.getAllPredictions({ limit: 1000 });
            const allPredictions = allPredictionsResponse.data || [];
            const matchedPrediction = allPredictions.find((prediction) => {
                return String(prediction.contractId) === String(predictionId)
                    || String(prediction.id) === String(predictionId)
                    || String(prediction._id) === String(predictionId);
            });
            const resolvedPredictionId = matchedPrediction?.contractId || predictionId;

            // Use read-only contract (no signer needed for viewing)
            const contract = getPredictionHubContract(true);
            const contractPrediction = await contract.getSignal(resolvedPredictionId);
            console.log('Raw contract prediction:', contractPrediction);

            // Get all options at once using getPredictionOptions
            const optionsData = await contract.getSignalOptions(resolvedPredictionId);
            console.log('Fetched options:', optionsData);

            const options = [];
            for (let i = 0; i < optionsData.length; i++) {
                const option = optionsData[i];
                console.log(`Option ${i}:`, option);

                options.push({
                    title: option.title || option[0],
                    totalShares: 0,
                    totalAmount: 0,
                    yesShares: 0,
                    noShares: 0,
                    isWinner: option.isWinner || option[1]
                });
            }

            console.log('Fetched options:', options);

            const transformedPrediction = {
                id: contractPrediction.id.toString(),
                contractId: contractPrediction.id.toString(),
                title: contractPrediction.title,
                description: contractPrediction.description,
                predictionType: Number(contractPrediction.signalType),
                endTime: contractPrediction.endTime.toString(),
                createdAt: contractPrediction.createdAt.toString(),
                isActive: contractPrediction.isActive,
                isResolved: contractPrediction.isResolved,
                minPositionAmount: contractPrediction.minAllocationAmount.toString(),
                maxPositionAmount: contractPrediction.maxAllocationAmount.toString(),
                optionCount: contractPrediction.optionCount.toString(),
                liquidityParam: Number(contractPrediction.liquidityParam),
                options: options,
                useFHEVM: true
            };

            console.log('Transformed prediction:', transformedPrediction);
            setPrediction(transformedPrediction);

            await loadPredictionStatistics(contract, resolvedPredictionId, Number(contractPrediction.optionCount), Number(contractPrediction.signalType));

        } catch (error) {
            console.error('Contract call failed:', error);
            try {
                const allPredictionsResponse = await predictionSyncAPI.getAllPredictions({ limit: 1000 });
                const allPredictions = allPredictionsResponse?.data || allPredictionsResponse?.data?.data || [];
                const fallbackPrediction = allPredictions.find((prediction) => {
                    return String(prediction.contractId) === String(predictionId)
                        || String(prediction.id) === String(predictionId)
                        || String(prediction._id) === String(predictionId);
                });

                if (fallbackPrediction) {
                    setPrediction({
                        id: String(fallbackPrediction.contractId || fallbackPrediction.id || fallbackPrediction._id),
                        contractId: String(fallbackPrediction.contractId || fallbackPrediction.id || fallbackPrediction._id),
                        title: fallbackPrediction.title,
                        description: fallbackPrediction.description,
                        predictionType: Number(fallbackPrediction.predictionType || fallbackPrediction.betType || 0),
                        endTime: fallbackPrediction.endTime,
                        createdAt: fallbackPrediction.createdAt,
                        isActive: fallbackPrediction.isActive,
                        isResolved: fallbackPrediction.isResolved,
                        minPositionAmount: String(fallbackPrediction.minPositionAmount || 0),
                        maxPositionAmount: String(fallbackPrediction.maxPositionAmount || 0),
                        optionCount: String(fallbackPrediction.options?.length || 0),
                        liquidityParam: Number(fallbackPrediction.liquidityParam || 100),
                        options: fallbackPrediction.options || [],
                        useFHEVM: !!fallbackPrediction.useFHEVM
                    });
                    return;
                }
            } catch (fallbackError) {
                console.error('Fallback prediction lookup failed:', fallbackError);
            }

            setPrediction(null);
        } finally {
            setLoading(false);
        }
    };

    const handleConnectWallet = async () => {
        try {
            setConnectionError(null);
            await connect();
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            setConnectionError(
                error.message || 'Failed to connect wallet. Please try again.'
            );
        }
    };

    const handleSubmitPosition = async () => {
        if (!isConnected || !account) {
            alert('Please connect your wallet first');
            return;
        }

        if (!selectedOption && !selectedOutcome) {
            alert('Please select an option');
            return;
        }

        if (!positionAmount || parseFloat(positionAmount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        try {
            setSubmitting(true);

            // Determine the final option index based on prediction type
            let finalOptionIndex = selectedOption;
            if (Number(prediction.predictionType) === 2 && selectedOutcome) {
                // For nested predictions, we need to pass both optionIndex and outcome
                // The contract handles this internally
            }

            const result = await submitPosition(
                prediction.contractId,
                selectedOption,
                parseFloat(positionAmount),
                selectedOutcome
            );

            console.log('Position submitted:', result);

            setSuccessData({
                transactionHash: result.transactionHash,
                positionAmount: positionAmount,
                positionOption: prediction.options[selectedOption]?.title || 'Unknown'
            });
            setShowSuccessModal(true);

            // Reset form
            setPositionAmount('');
            setSelectedOption(null);
            setSelectedOutcome(null);

            // Refresh prediction data
            setTimeout(() => {
                fetchPredictionDetail();
                if (isConnected && account) {
                    loadUserPosition();
                }
            }, 2000);

        } catch (error) {
            console.error('Error submitting position:', error);
            alert(error.message || 'Failed to submit position');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <LoadingSpinner size="lg" text="Loading prediction..." />
            </div>
        );
    }

    if (!prediction) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#ECEDEE] font-mono tracking-widest uppercase mb-2">Prediction not found</h3>
                <p className="text-[#A1A1AA] font-mono">The prediction you're looking for doesn't exist or has been removed.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Prediction Header */}
            <div className="glass-panel p-6 mb-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-[#ECEDEE] font-mono tracking-widest uppercase mb-2">{prediction.title}</h1>
                        <p className="text-[#A1A1AA] font-mono mb-4">{prediction.description}</p>
                        
                        <div className="flex items-center space-x-6 text-sm text-[#71717A] font-mono">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                prediction.isActive && !prediction.isResolved 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-[#1C1D20] text-[#ECEDEE] font-mono'
                            }`}>
                                {prediction.isActive && !prediction.isResolved ? 'Active' : 'Ended'}
                            </span>
                            <span>Volume: ${statistics.totalVolume?.toFixed(2) || '0.00'}</span>
                            <span>Positions: {statistics.totalPositions || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {prediction.options?.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => setSelectedOption(index)}
                        className={`p-4 border rounded-lg text-left transition-all ${
                            selectedOption === index
                                ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                                : 'border-[#1C1D20] hover:border-[#1C1D20]'
                        }`}
                    >
                        <div className="font-medium text-[#ECEDEE] font-mono tracking-widest uppercase">{option.title}</div>
                        <div className="text-sm text-[#71717A] font-mono mt-1">
                            {option.totalShares ? `${option.totalShares.toFixed(2)} shares` : 'No shares yet'}
                        </div>
                    </button>
                ))}
            </div>

            {/* Position Form */}
            {prediction.isActive && !prediction.isResolved && (
                <div className="glass-panel p-6 mb-6">
                    <h3 className="text-lg font-semibold text-[#ECEDEE] font-mono tracking-widest uppercase mb-4">Place Allocation</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#A1A1AA] font-mono mb-2">
                                Amount (USDC)
                            </label>
                            <input
                                type="number"
                                value={positionAmount}
                                onChange={(e) => setPositionAmount(e.target.value)}
                                placeholder="Enter amount"
                                className="w-full px-4 py-2 border border-[#1C1D20] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>

                        <Button
                            onClick={handleSubmitPosition}
                            disabled={submitting || !selectedOption || !positionAmount}
                            className="w-full"
                        >
                            {submitting ? 'Placing...' : 'Place Allocation'}
                        </Button>
                    </div>
                </div>
            )}

            <PredictionSuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                transactionHash={successData.transactionHash}
                positionAmount={successData.positionAmount}
                positionOption={successData.positionOption}
            />
        </div>
    );
};

export default PredictionDetail;


