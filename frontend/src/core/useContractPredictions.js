import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getNetworkConfig } from '../config/contracts';
import PredictionHubABI from '@artifacts/PredictionHub.sol/PredictionHub.json';
import IntelligenceLedgerABI from '@artifacts/IntelligenceLedger.sol/IntelligenceLedger.json';
import { getFhevmInstance } from '../lib/fhe.js';

/**
 * Hook to fetch prediction data directly from blockchain
 * NO DATABASE - Pure contract data
 */
export const useContractPredictions = (chainId) => {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const fetchPredictionsFromContract = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get contract configuration
                const networkConfig = getNetworkConfig(chainId);
                console.log('🌐 useContractPredictions - Network Config:', {
                    inputChainId: chainId,
                    detectedNetwork: networkConfig.name,
                    hubContract: networkConfig.contracts.PREDICTION_HUB,
                    rpcUrl: networkConfig.rpcUrl
                });
                const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);

                // Initialize Hub and Ledger contracts
                const hubContract = new ethers.Contract(
                    networkConfig.contracts.PREDICTION_HUB,
                    PredictionHubABI.abi,
                    provider
                );

                const ledgerContract = networkConfig.contracts.INTELLIGENCE_LEDGER ? new ethers.Contract(
                    networkConfig.contracts.INTELLIGENCE_LEDGER,
                    IntelligenceLedgerABI.abi,
                    provider
                ) : null;

                // Get total number of predictions
                const totalPredictions = Number(await hubContract.getTotalPredictions());
                console.log(`📊 Total predictions in contract: ${totalPredictions}`);

                if (!mounted) return;

                if (totalPredictions === 0) {
                    setPredictions([]);
                    setLoading(false);
                    return;
                }

                // Fetch all predictions
                const predictionPromises = [];
                for (let predictionId = 1; predictionId <= totalPredictions; predictionId++) {
                    predictionPromises.push(fetchSinglePrediction(hubContract, ledgerContract, predictionId));
                }

                const fetchedPredictions = await Promise.all(predictionPromises);

                if (!mounted) return;

                // Filter out null values (failed fetches) and only active predictions
                const validPredictions = fetchedPredictions.filter(prediction => prediction !== null && prediction.isActive);

                console.log(`✅ Loaded ${validPredictions.length} active predictions from contract`);
                setPredictions(validPredictions);
                setLoading(false);

            } catch (err) {
                console.error('Error fetching predictions from contract:', err);
                if (mounted) {
                    setError(err);
                    setPredictions([]);
                    setLoading(false);
                }
            }
        };

        const fetchSinglePrediction = async (hubContract, ledgerContract, predictionId) => {
            try {
                // Get prediction basic info
                const predictionData = await hubContract.getPrediction(predictionId);
                const optionsData = await hubContract.getPredictionOptions(predictionId);

                const predictionType = Number(predictionData.predictionType);
                const optionCount = optionsData.length;
                const liquidityParam = Number(predictionData.liquidityParam || 100);

                // Get options with decrypted statistics
                const options = [];

                if (predictionType === 2) {
                    // NESTED: Get Yes/No shares for each option
                    let yesSharesArray, noSharesArray, isDecrypted;

                    try {
                        if (ledgerContract) {
                            [yesSharesArray, noSharesArray, isDecrypted] = await ledgerContract.getNestedSignalStatistics(predictionId);
                        } else {
                            throw new Error('Ledger contract not available');
                        }
                    } catch (err) {
                        console.warn(`getNestedSignalStatistics failed for signal ${predictionId}, using defaults:`, err);
                        isDecrypted = false;
                        yesSharesArray = Array(optionCount).fill(0);
                        noSharesArray = Array(optionCount).fill(0);
                    }

                    // If oracle hasn't decrypted yet, use HTTP Relayer
                    if (!isDecrypted) {
                        try {
                            const instance = await getFhevmInstance();
                            const handles = [];

                            // Get encrypted handles for each option's Yes/No
                            for (let i = 0; i < optionCount; i++) {
                                const yesHandle = await hubContract.getNestedOptionEncryptedTotal(predictionId, i, 0);
                                const noHandle = await hubContract.getNestedOptionEncryptedTotal(predictionId, i, 1);
                                handles.push(yesHandle, noHandle);
                            }

                            const validHandles = handles.filter(h => h && h !== '0x0000000000000000000000000000000000000000000000000000000000000000');

                            if (validHandles.length > 0) {
                                const decryptedResult = await instance.publicDecrypt(validHandles);

                                const decryptedValues = handles.map(handle => {
                                    if (handle && handle !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                                        return Number(decryptedResult[handle] || 0);
                                    }
                                    return 0;
                                });

                                // Extract Yes/No values
                                yesSharesArray = [];
                                noSharesArray = [];
                                for (let i = 0; i < optionCount; i++) {
                                    yesSharesArray.push(decryptedValues[i * 2]);
                                    noSharesArray.push(decryptedValues[i * 2 + 1]);
                                }
                            }
                        } catch (httpError) {
                            console.warn(`HTTP Relayer decryption failed for prediction ${predictionId}:`, httpError);
                        }
                    }

                    // Build options with prices
                    for (let i = 0; i < optionCount; i++) {
                        const optionInfo = optionsData[i];

                        const yesShares = Number(yesSharesArray[i]) / 1000000;
                        const noShares = Number(noSharesArray[i]) / 1000000;

                        // Calculate Yes price for this option
                        const yesWithLiquidity = yesShares + liquidityParam;
                        const noWithLiquidity = noShares + liquidityParam;
                        const totalWithLiquidity = yesWithLiquidity + noWithLiquidity;
                        const currentPrice = Number(((yesWithLiquidity / totalWithLiquidity) * 100).toFixed(1));

                        options.push({
                            title: optionInfo.title,
                            totalShares: yesShares + noShares,
                            yesShares: yesShares,
                            noShares: noShares,
                            currentPrice: currentPrice,
                            isWinner: optionInfo.isWinner
                        });
                    }
                } else {
                    // BINARY or MULTIPLE: Get total shares for each option
                    let optionTotals, isDecrypted;

                    try {
                        if (ledgerContract) {
                            [optionTotals, isDecrypted] = await ledgerContract.getSignalStatistics(predictionId);
                        } else {
                            throw new Error('Ledger contract not available');
                        }
                    } catch (err) {
                        console.warn(`getSignalStatistics failed for signal ${predictionId}, using defaults:`, err);
                        isDecrypted = false;
                        optionTotals = Array(optionCount).fill(0);
                    }

                    // If oracle hasn't decrypted yet, use HTTP Relayer
                    if (!isDecrypted) {
                        try {
                            const instance = await getFhevmInstance();
                            const handles = [];

                            // Get encrypted handles for each option
                            for (let i = 0; i < optionCount; i++) {
                                const handle = await hubContract.getOptionEncryptedTotal(predictionId, i);
                                handles.push(handle);
                            }

                            const validHandles = handles.filter(h => h && h !== '0x0000000000000000000000000000000000000000000000000000000000000000');

                            if (validHandles.length > 0) {
                                const decryptedResult = await instance.publicDecrypt(validHandles);

                                optionTotals = handles.map(handle => {
                                    if (handle && handle !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                                        return decryptedResult[handle] || 0;
                                    }
                                    return 0;
                                });
                            }
                        } catch (httpError) {
                            console.warn(`HTTP Relayer decryption failed for prediction ${predictionId}:`, httpError);
                        }
                    }

                    let totalSharesSum = 0;
                    const optionData = [];

                    for (let i = 0; i < optionCount; i++) {
                        const optionInfo = optionsData[i];
                        const totalShares = Number(optionTotals[i]) / 1000000;

                        optionData.push({
                            title: optionInfo.title,
                            totalShares: totalShares,
                            isWinner: optionInfo.isWinner
                        });

                        totalSharesSum += totalShares + liquidityParam;
                    }

                    // Calculate prices
                    optionData.forEach(option => {
                        const optionWithLiquidity = option.totalShares + liquidityParam;
                        option.currentPrice = Number(((optionWithLiquidity / totalSharesSum) * 100).toFixed(1));
                        options.push(option);
                    });
                }

                // Calculate total volume (sum of all shares)
                const volume = options.reduce((sum, opt) => sum + opt.totalShares, 0);

                return {
                    id: predictionId.toString(),
                    contractId: predictionId,
                    title: predictionData.title,
                    description: predictionData.description,
                    predictionType: predictionType,
                    optionCount: optionCount,
                    options: options,
                    endTime: Number(predictionData.endTime) * 1000, // Convert to milliseconds
                    isActive: predictionData.isActive,
                    isResolved: predictionData.isResolved,
                    minPositionAmount: Number(predictionData.minPositionAmount || 0) / 1000000,
                    maxPositionAmount: Number(predictionData.maxPositionAmount || 0) / 1000000,
                    liquidityParam: liquidityParam,
                    volume: volume,
                    imageUrl: null, // No image URL in contract, can add default or generate
                    topic: null, // No topic in contract
                    createdAt: Date.now() // Approximation
                };

            } catch (err) {
                console.error(`Failed to fetch prediction ${predictionId}:`, err);
                return null;
            }
        };

        fetchPredictionsFromContract();

        return () => {
            mounted = false;
        };
    }, [chainId]);

    return { predictions, loading, error };
};

