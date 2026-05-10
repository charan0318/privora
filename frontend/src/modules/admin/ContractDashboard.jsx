import React, { useState, useEffect } from 'react';
import { useWallet } from '../../core/useWallet';
import { getNetworkConfig, getContracts } from '../../config/contracts';
import { contractService } from '../../integrations/contractService';

const ContractDashboard = () => {
    const { account, chainId, provider } = useWallet();
    const [networkInfo, setNetworkInfo] = useState(null);
    const [contracts, setContracts] = useState(null);
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (chainId && provider) {
            loadContractInfo();
        }
    }, [chainId, provider]);

    const loadContractInfo = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔧 Dashboard using wallet chainId:', chainId);

            // Get network and contract info
            const network = getNetworkConfig(chainId);
            const contractAddresses = getContracts(chainId);

            setNetworkInfo(network);
            setContracts(contractAddresses);

            // Load bets from contract
            await contractService.initializeReadOnly(chainId, contractAddresses);
            const allBets = await contractService.getAllBets();
            setBets(allBets);

        } catch (err) {
            console.error('Error loading contract info:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatAddress = (address) => {
        if (!address) return 'N/A';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // You could add a toast notification here
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-none-full h-32 w-32 border-b-2 border-[#5ce1e6]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-none">
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Protocol Dashboard</h1>
                <p className="text-gray-400">Monitor your FHEVM Privora contracts and predictions</p>
            </div>

            {/* Network Info */}
            <div className="bg-[#0A1424] rounded-none shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-none-full mr-2"></span>
                    Network Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Network</label>
                        <p className="text-lg font-semibold text-[#5ce1e6]">{networkInfo?.name || 'Unknown'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Chain ID</label>
                        <p className="text-lg font-semibold">{networkInfo?.chainId || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">RPC URL</label>
                        <p className="text-sm text-gray-400">{networkInfo?.rpcUrl || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Contract Addresses */}
            <div className="bg-[#0A1424] rounded-none shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <span className="w-3 h-3 bg-[#5ce1e6] rounded-none-full mr-2"></span>
                    Contract Addresses
                </h2>
                <div className="space-y-3">
                    {contracts && Object.entries(contracts).map(([name, address]) => (
                        <div key={name} className="flex items-center justify-between p-3 bg-[#0F1E32] rounded-none">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">{name}</label>
                                <p className="text-sm text-gray-400">{formatAddress(address)}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => copyToClipboard(address)}
                                    className="px-3 py-1 bg-[#5ce1e6] text-white text-xs rounded-none hover:bg-[#5ce1e6] transition-colors"
                                >
                                    Copy
                                </button>
                                <a
                                    href={networkInfo?.blockExplorerUrl ? `${networkInfo.blockExplorerUrl}/address/${address}` : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-green-500 text-white text-xs rounded-none hover:bg-[#5ce1e6] text-[#020813] transition-colors disabled:opacity-50"
                                >
                                    Explorer
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bet Statistics */}
            <div className="bg-[#0A1424] rounded-none shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <span className="w-3 h-3 bg-purple-500 rounded-none-full mr-2"></span>
                    Bet Statistics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-primary-50 rounded-none">
                        <p className="text-2xl font-bold text-[#5ce1e6]">{bets.length}</p>
                        <p className="text-sm text-gray-400">Total Bets</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-none">
                        <p className="text-2xl font-bold text-[#5ce1e6]">
                            {bets.filter(bet => bet.status === 'active').length}
                        </p>
                        <p className="text-sm text-gray-400">Active Bets</p>
                    </div>
                    <div className="text-center p-4 bg-primary-50 rounded-none">
                        <p className="text-2xl font-bold text-[#5ce1e6]">
                            {bets.filter(bet => bet.status === 'ended').length}
                        </p>
                        <p className="text-sm text-gray-400">Ended Bets</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-none">
                        <p className="text-2xl font-bold text-purple-600">
                            {bets.filter(bet => bet.status === 'resolved').length}
                        </p>
                        <p className="text-sm text-gray-400">Resolved Bets</p>
                    </div>
                </div>
            </div>

            {/* Bet List */}
            <div className="bg-[#0A1424] rounded-none shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <span className="w-3 h-3 bg-orange-500 rounded-none-full mr-2"></span>
                    All Bets ({bets.length})
                </h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr className="bg-[#0F1E32]">
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">ID</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Title</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Options</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">End Time</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Status</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bets.map((bet) => (
                                <tr key={bet.id} className="border-t hover:bg-[#0F1E32]">
                                    <td className="px-4 py-3 text-sm font-medium text-white">#{bet.id}</td>
                                    <td className="px-4 py-3 text-sm text-white">
                                        <div className="max-w-xs truncate" title={bet.title}>
                                            {bet.title}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-400">{bet.optionCount}</td>
                                    <td className="px-4 py-3 text-sm text-gray-400">
                                        {new Date(bet.endTime * 1000).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-none-full ${
                                            bet.status === 'active' ? 'bg-green-100 text-green-800' :
                                            bet.status === 'ended' ? 'bg-primary-100 text-primary-800' :
                                            'bg-[#1A2F45] text-gray-100'
                                        }`}>
                                            {bet.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <a
                                            href={`/prediction/${prediction.id}`}
                                            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                                        >
                                            View
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Refresh Button */}
            <div className="mt-6 text-center">
                <button
                    onClick={loadContractInfo}
                    disabled={loading}
                    className="px-6 py-2 bg-[#5ce1e6] text-white rounded-none hover:bg-[#5ce1e6] transition-colors disabled:opacity-50"
                >
                    {loading ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </div>
        </div>
    );
};

export default ContractDashboard;





