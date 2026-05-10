import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './core/useWallet.jsx';

// Layout
import Sidebar from './modules/common/Sidebar';
import Header from './modules/common/Header';

// Pages
import Home from './views/Home';
import PredictionDetail from './views/PredictionDetail';
import Topic from './views/Topic';
import Admin from './views/Admin';
import Profile from './views/Profile';
import Wallet from './views/Wallet';
import Claims from './views/Claims';
import Dashboard from './views/Dashboard';
import Testfhevm from './views/Testfhevm';
import ContractDashboard from './modules/admin/ContractDashboard';
import Docs from './views/Docs';

// Styles
import './styles/globals.css';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000,
        },
    },
});

const NotFound = () => (
    <div className="h-full flex items-center justify-center">
        <div className="text-center font-mono">
            <div className="text-6xl font-bold text-[#3B82F6] mb-4">404</div>
            <h1 className="text-2xl font-bold text-[#ECEDEE] mb-2 uppercase tracking-widest">Sector Not Found</h1>
            <p className="text-[#A1A1AA] mb-8">The requested module does not exist on the network.</p>
            <button
                onClick={() => window.history.back()}
                className="btn-primary"
            >
                Return to Network
            </button>
        </div>
    </div>
);

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <WalletProvider>
                <Router>
                    <div className="flex min-h-screen bg-[#090A0B] text-[#ECEDEE] font-sans selection:bg-[#3B82F6] selection:text-white">
                        <Sidebar />
                        <div className="flex-1 flex flex-col max-w-full overflow-hidden">
                            <Header />
                            <main className="flex-1 overflow-x-hidden overflow-y-auto">
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/test" element={<Testfhevm />} />
                                    <Route path="/testfhevm" element={<Testfhevm />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/contract-dashboard" element={<ContractDashboard />} />
                                    <Route path="/prediction/:predictionId" element={<PredictionDetail />} />
                                    <Route path="/topic/:topicId" element={<Topic />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/wallet" element={<Wallet />} />
                                    <Route path="/claims" element={<Claims />} />
                                    <Route path="/admin/*" element={<Admin />} />
                                    <Route path="/docs" element={<Docs />} />
                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                            </main>
                        </div>
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                duration: 4000,
                                style: {
                                    background: '#111214',
                                    color: '#ECEDEE',
                                    border: '1px solid #1C1D20',
                                    borderRadius: '0px',
                                    fontFamily: 'monospace',
                                    fontSize: '14px',
                                },
                            }}
                        />
                    </div>
                </Router>
            </WalletProvider>
        </QueryClientProvider>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);