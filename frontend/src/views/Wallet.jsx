import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useWallet } from '../core/useWallet';
import { getContracts } from '../config/contracts.js';
import { BalanceCache } from '../utils/balanceCache';
import { Eye, Shield, ArrowRightLeft, Lock, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import LoadingSpinner from '../modules/common/LoadingSpinner';

const Wallet = () => {
    const {
        account,
        isConnected,
        connect,
        getPredictionHubContract,
        signer,
        chainId,
        currentNetwork,
        networkInfo,
        ethers
    } = useWallet();

    const [balances, setBalances] = useState({
        wallet: '0',
        platform: null,
        platformEncrypted: null
    });

    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingBalances, setIsLoadingBalances] = useState(false);
    const [isDecrypting, setIsDecrypting] = useState(false);

    useEffect(() => {
        if (account && chainId) {
            const cached = BalanceCache.get(account, chainId);
            if (cached) {
                setBalances(prev => ({ ...prev, platform: cached }));
            }
        }
    }, [account, chainId]);

    useEffect(() => {
        if (isConnected && account && chainId) {
            const timeoutId = setTimeout(() => {
                loadBalances();
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [isConnected, account, chainId]);

    const loadBalances = async () => {
        if (!isConnected || !account || !chainId) return;

        setIsLoadingBalances(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const contract = getPredictionHubContract();
            const usdcContract = await getUSDCContract();

            let walletBalance;
            try {
                walletBalance = await usdcContract.balanceOf(account);
            } catch (error) {
                walletBalance = 0;
            }

            const walletFormatted = ethers.formatUnits(walletBalance, 6);

            let encryptedBalance;
            try {
                encryptedBalance = await contract.getMyEncryptedBalance();
            } catch (error) {
                encryptedBalance = null;
            }

            const cachedPlatform = BalanceCache.get(account, chainId);

            setBalances({
                wallet: walletFormatted,
                platform: cachedPlatform,
                platformEncrypted: encryptedBalance
            });

        } catch (error) {
            console.error('Error loading balances:', error);
            if (!error.message?.includes('network changed') && !error.message?.includes('NETWORK_ERROR')) {
                toast.error('Failed to load balances');
            }
            setBalances({ wallet: '0', platform: null, platformEncrypted: null });
        } finally {
            setIsLoadingBalances(false);
        }
    };

    const handleDecryptBalance = async () => {
        if (!balances.platformEncrypted) {
            toast.error('No encrypted balance to decrypt');
            return;
        }
        if (balances.platform !== null) {
            toast.info('Balance already decrypted');
            return;
        }

        setIsDecrypting(true);
        try {
            const { decryptUserBalance } = await import('../lib/fhe.js');
            const contract = getPredictionHubContract();
            const contractAddress = await contract.getAddress();

            const clearBalance = await decryptUserBalance(contractAddress, account);
            const balanceFormatted = (parseInt(clearBalance) / 1000000).toFixed(2);

            setBalances(prev => ({ ...prev, platform: balanceFormatted }));
            BalanceCache.save(account, chainId, balanceFormatted);
            toast.success('Balance decrypted');
        } catch (error) {
            toast.error('Decryption failed');
        } finally {
            setIsDecrypting(false);
        }
    };

    const getUSDCContract = async () => {
        const contracts = getContracts(chainId);
        const usdcAddress = contracts.USDC_TOKEN;
        const usdcAbi = [
            'function balanceOf(address owner) view returns (uint256)',
            'function transfer(address to, uint256 amount) returns (bool)',
            'function approve(address spender, uint256 amount) returns (bool)',
            'function allowance(address owner, address spender) view returns (uint256)'
        ];
        return new ethers.Contract(usdcAddress, usdcAbi, signer);
    };

    const handleDeposit = async () => {
        if (!isConnected) return toast.error('Please connect your wallet');
        if (!depositAmount || parseFloat(depositAmount) <= 0) return toast.error('Please enter a valid amount');

        setIsLoading(true);
        try {
            const contract = getPredictionHubContract();
            const usdcContract = await getUSDCContract();
            const contractAddress = await contract.getAddress();
            const amount = ethers.parseUnits(depositAmount, 6);

            const walletBalance = await usdcContract.balanceOf(account);
            if (walletBalance < amount) return toast.error('Insufficient USDC balance');

            toast.loading('Approving USDC...', { id: 'deposit' });
            const allowance = await usdcContract.allowance(account, contractAddress);
            if (allowance < amount) {
                const approveTx = await usdcContract.approve(contractAddress, amount);
                await approveTx.wait();
            }

            toast.loading('Processing deposit...', { id: 'deposit' });
            const depositTx = await contract.deposit(amount, { gasLimit: 300000 });
            await depositTx.wait();

            toast.success('Deposit successful', { id: 'deposit' });
            setDepositAmount('');
            BalanceCache.clear(account, chainId);
            setBalances(prev => ({ ...prev, platform: null }));
            await loadBalances();
        } catch (error) {
            toast.error('Deposit failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!isConnected) return toast.error('Please connect your wallet');
        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return toast.error('Please enter a valid amount');
        if (balances.platform === null) return toast.error('Decrypt balance first');

        const platformBalance = parseFloat(balances.platform);
        const requestedAmount = parseFloat(withdrawAmount);
        if (requestedAmount > platformBalance) return toast.error('Insufficient platform balance');

        setIsLoading(true);
        try {
            const contract = getPredictionHubContract();
            const amount = ethers.parseUnits(withdrawAmount, 6);

            toast.loading('Processing withdrawal...', { id: 'withdraw' });
            const withdrawTx = await contract.withdraw(amount, { gasLimit: 300000 });
            await withdrawTx.wait();

            toast.success('Withdrawal successful', { id: 'withdraw' });
            setWithdrawAmount('');
            const newBalance = BalanceCache.optimisticUpdate(account, chainId, -parseFloat(withdrawAmount));
            setBalances(prev => ({ ...prev, platform: newBalance || null }));
            await loadBalances();
        } catch (error) {
            toast.error('Withdrawal failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center font-mono glass-panel p-8 max-w-md w-full">
                    <Lock className="w-12 h-12 text-[#71717A] mx-auto mb-6" />
                    <h2 className="text-xl text-[#ECEDEE] tracking-widest uppercase mb-2">Wallet Not Connected</h2>
                    <p className="text-[#A1A1AA] text-sm mb-8 leading-relaxed">
                        Connect your wallet to view your USDC balance and positions.
                    </p>
                    <button onClick={connect} className="btn-primary w-full">
                        Connect Wallet
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1C1D20] pb-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest">Wallet</h1>
                    <p className="text-sm font-mono text-[#71717A] uppercase">USDC Balance</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111214] border border-[#1C1D20]">
                        <div className={`w-2 h-2 rounded-full ${currentNetwork === 'localhost' ? 'bg-[#10B981]' : currentNetwork === 'sepolia' ? 'bg-[#3B82F6]' : 'bg-[#EF4444]'} animate-pulse`}></div>
                        <span className="text-xs font-mono text-[#A1A1AA] uppercase">{networkInfo?.name || currentNetwork}</span>
                    </div>
                    <button
                        onClick={loadBalances}
                        disabled={isLoadingBalances}
                        className="p-1.5 text-[#71717A] hover:text-[#ECEDEE] border border-[#1C1D20] hover:border-[#3B82F6] bg-[#111214] transition-colors"
                    >
                        <ArrowRightLeft className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Balances Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* External Wallet Cache */}
                <div className="glass-panel p-6 flex flex-col justify-between min-h-[140px] group border-l-2 border-l-[#3B82F6]">
                    <div className="flex justify-between items-start">
                        <span className="font-mono text-xs text-[#A1A1AA] uppercase tracking-widest">External Wallet</span>
                        <Shield className="w-4 h-4 text-[#71717A] group-hover:text-[#3B82F6] transition-colors" />
                    </div>
                    <div>
                        <div className="text-3xl font-mono text-[#ECEDEE] mt-4 flex items-center gap-3">
                            {isLoadingBalances ? <LoadingSpinner size="sm" /> : `${parseFloat(balances.wallet).toFixed(2)}`}
                            {!isLoadingBalances && <span className="text-sm text-[#71717A]">USDC</span>}
                        </div>
                    </div>
                </div>

                {/* Encrypted Balance */}
                <div className="glass-panel p-6 flex flex-col justify-between min-h-[140px] group border-l-2 border-l-[#10B981] relative overflow-hidden">
                    <div className="flex justify-between items-start z-10">
                        <span className="font-mono text-xs text-[#A1A1AA] uppercase tracking-widest">Encrypted Balance</span>
                        <Lock className="w-4 h-4 text-[#71717A] group-hover:text-[#10B981] transition-colors" />
                    </div>
                    
                    <div className="mt-4 z-10 flex items-end justify-between">
                        <div className="text-3xl font-mono text-[#ECEDEE] flex items-center gap-3">
                            {isLoadingBalances ? (
                                <LoadingSpinner size="sm" />
                            ) : balances.platform === null ? (
                                <span className="text-2xl tracking-[0.2em] text-[#71717A]">••••••</span>
                            ) : (
                                `${parseFloat(balances.platform).toFixed(2)}`
                            )}
                            {!isLoadingBalances && balances.platform !== null && <span className="text-sm text-[#71717A]">USDC</span>}
                        </div>

                        {balances.platform === null && balances.platformEncrypted && (
                            <button
                                onClick={handleDecryptBalance}
                                disabled={isDecrypting}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#161719] hover:bg-[#1C1D20] border border-[#10B981]/30 hover:border-[#10B981] text-[#10B981] transition-colors font-mono text-xs uppercase cursor-pointer"
                            >
                                {isDecrypting ? (
                                    <>
                                        <LoadingSpinner size="sm" className="text-[#10B981]" />
                                        <span>Decrypting</span>
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-3 h-3" />
                                        <span>Decrypt</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Transfer Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Deposit */}
                <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 border-b border-[#1C1D20] pb-4 mb-6">
                        <ArrowDownToLine className="w-5 h-5 text-[#3B82F6]" />
                        <h2 className="font-mono text-[#ECEDEE] tracking-widest uppercase">Deposit</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-mono text-[#71717A] uppercase mb-1">
                                <span>Amount (USDC)</span>
                                <span>MAX: {parseFloat(balances.wallet).toFixed(2)}</span>
                            </div>
                            <input 
                                type="number" 
                                value={depositAmount} 
                                onChange={(e) => setDepositAmount(e.target.value)} 
                                placeholder="0.00" 
                                className="w-full bg-[#090A0B] border border-[#1C1D20] text-[#ECEDEE] font-mono p-3 text-lg focus:outline-none focus:border-[#3B82F6] transition-colors rounded-none placeholder-[#2C2D30]" 
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            {[10, 50, 100].map(amt => (
                                <button key={amt} onClick={() => setDepositAmount(amt.toString())} className="flex-1 bg-[#111214] border border-[#1C1D20] hover:border-[#3B82F6] text-[#A1A1AA] hover:text-[#ECEDEE] p-2 font-mono text-xs transition-colors">
                                    +{amt}
                                </button>
                            ))}
                            <button onClick={() => setDepositAmount(balances.wallet)} className="flex-1 bg-[#111214] border border-[#1C1D20] hover:border-[#3B82F6] text-[#A1A1AA] hover:text-[#ECEDEE] p-2 font-mono text-xs transition-colors">
                                MAX
                            </button>
                        </div>

                        <button 
                            onClick={handleDeposit} 
                            disabled={isLoading || !depositAmount} 
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed group flex justify-center items-center gap-2"
                        >
                            {isLoading ? <LoadingSpinner size="sm" /> : <span>Deposit</span>}
                        </button>
                    </div>
                </div>

                {/* Withdraw */}
                <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 border-b border-[#1C1D20] pb-4 mb-6">
                        <ArrowUpFromLine className="w-5 h-5 text-[#10B981]" />
                        <h2 className="font-mono text-[#ECEDEE] tracking-widest uppercase">Withdraw</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-mono text-[#71717A] uppercase mb-1">
                                <span>Amount (USDC)</span>
                                <span>{balances.platform ? `Available: ${parseFloat(balances.platform).toFixed(2)}` : 'REQUIRES DECRYPTION'}</span>
                            </div>
                            <input 
                                type="number" 
                                value={withdrawAmount} 
                                onChange={(e) => setWithdrawAmount(e.target.value)} 
                                disabled={!balances.platform} 
                                placeholder="0.00" 
                                className="w-full bg-[#090A0B] border border-[#1C1D20] text-[#ECEDEE] font-mono p-3 text-lg focus:outline-none focus:border-[#10B981] transition-colors rounded-none placeholder-[#2C2D30] disabled:bg-[#111214] disabled:opacity-50" 
                            />
                        </div>

                        <div className="flex gap-2">
                            {[10, 50, 100].map(amt => (
                                <button key={amt} onClick={() => setWithdrawAmount(amt.toString())} disabled={!balances.platform} className="flex-1 bg-[#111214] border border-[#1C1D20] hover:border-[#10B981] text-[#A1A1AA] hover:text-[#ECEDEE] p-2 font-mono text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    +{amt}
                                </button>
                            ))}
                            <button onClick={() => balances.platform && setWithdrawAmount(balances.platform)} disabled={!balances.platform} className="flex-1 bg-[#111214] border border-[#1C1D20] hover:border-[#10B981] text-[#A1A1AA] hover:text-[#ECEDEE] p-2 font-mono text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                MAX
                            </button>
                        </div>

                        <button 
                            onClick={handleWithdraw} 
                            disabled={isLoading || !withdrawAmount || !balances.platform} 
                            className="w-full disabled:opacity-50 disabled:cursor-not-allowed bg-[#111214] hover:bg-[#161719] text-[#10B981] border border-[#10B981]/50 hover:border-[#10B981] p-3 font-mono text-sm tracking-wider uppercase transition-colors rounded-none"
                        >
                            {isLoading ? <LoadingSpinner size="sm" /> : <span>Withdraw</span>}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Wallet;


