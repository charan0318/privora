import React, { useState } from 'react';
import { BookOpen, Code, Shield, Users, Settings, Zap, FileText, HelpCircle, ChevronRight, ExternalLink } from 'lucide-react';

const Docs = () => {
    const [activeSection, setActiveSection] = useState('getting-started');

    const sections = [
        { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
        { id: 'user-guide', label: 'User Guide', icon: Users },
        { id: 'admin-guide', label: 'Admin Guide', icon: Shield },
        { id: 'technical', label: 'Technical Architecture', icon: Code },
        { id: 'fhevm', label: 'FHEVM Integration', icon: Zap },
        { id: 'api', label: 'API Reference', icon: FileText },
        { id: 'contracts', label: 'Smart Contracts', icon: Code },
        { id: 'enterprise', label: 'Enterprise Guide', icon: Settings },
        { id: 'intelligence', label: 'Intelligence Framework', icon: Zap },
        { id: 'troubleshooting', label: 'Troubleshooting', icon: HelpCircle },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'getting-started':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">Getting Started with Privora</h2>
                            <p className="text-[#A1A1AA] font-mono mb-6">Complete guide for installing, setting up, and running the Privora platform locally or in production.</p>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Prerequisites</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border border-[#1C1D20] p-4">
                                    <h4 className="font-mono text-[#3B82F6] uppercase text-sm mb-2">Required</h4>
                                    <ul className="space-y-2 font-mono text-sm text-[#A1A1AA]">
                                        <li>• Node.js 18+ (recommended: 20.x LTS)</li>
                                        <li>• npm 9+ or yarn 1.22+</li>
                                        <li>• Git 2.30+</li>
                                        <li>• MongoDB 6+ (local or Atlas)</li>
                                    </ul>
                                </div>
                                <div className="border border-[#1C1D20] p-4">
                                    <h4 className="font-mono text-[#3B82F6] uppercase text-sm mb-2">Optional</h4>
                                    <ul className="space-y-2 font-mono text-sm text-[#A1A1AA]">
                                        <li>• Yarn (alternative package manager)</li>
                                        <li>• Docker (for containerized MongoDB)</li>
                                        <li>• VS Code (recommended IDE)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Installation</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="font-mono text-[#A1A1AA] mb-2">1. Clone the repository</p>
                                    <div className="bg-[#0A0A0A] border border-[#1C1D20] p-3 font-mono text-sm">
                                        <code className="text-[#10B981]">git clone https://github.com/charan0318/privora.git</code>
                                    </div>
                                </div>
                                <div>
                                    <p className="font-mono text-[#A1A1AA] mb-2">2. Install all dependencies</p>
                                    <div className="bg-[#0A0A0A] border border-[#1C1D20] p-3 font-mono text-sm">
                                        <code className="text-[#10B981]">npm run install:all</code>
                                    </div>
                                </div>
                                <div>
                                    <p className="font-mono text-[#A1A1AA] mb-2">3. Set up environment variables</p>
                                    <div className="bg-[#0A0A0A] border border-[#1C1D20] p-3 font-mono text-sm">
                                        <code className="text-[#10B981]">cp .env.example .env</code>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Development</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-[#3B82F6]">npm run dev</span>
                                    <span className="text-[#A1A1AA] font-mono text-sm">Start all services (frontend + backend)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-[#3B82F6]">npm run dev:backend</span>
                                    <span className="text-[#A1A1AA] font-mono text-sm">Backend API on port 5002</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-[#3B82F6]">npm run dev:frontend</span>
                                    <span className="text-[#A1A1AA] font-mono text-sm">Frontend on port 5173</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'user-guide':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">User Guide</h2>
                            <p className="text-[#A1A1AA] font-mono mb-6">Complete guide for using the Privora confidential prediction infrastructure as an end user.</p>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Connecting Your Wallet</h3>
                            <ol className="space-y-3 font-mono text-sm text-[#A1A1AA]">
                                <li>1. Visit the platform homepage</li>
                                <li>2. Click "Connect Wallet" button in the top navigation</li>
                                <li>3. Select your preferred wallet provider (MetaMask, WalletConnect)</li>
                                <li>4. Approve the connection request in your wallet</li>
                                <li>5. Wait for FHEVM initialization (~1-2 seconds)</li>
                            </ol>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Browsing Markets</h3>
                            <div className="space-y-4">
                                <div className="border-l-2 border-[#3B82F6] pl-4">
                                    <h4 className="font-mono text-[#ECEDEE] uppercase text-sm mb-2">Filter Options</h4>
                                    <ul className="font-mono text-sm text-[#A1A1AA] space-y-1">
                                        <li>• <strong>Trending</strong> - High volume markets</li>
                                        <li>• <strong>New</strong> - Recently created markets</li>
                                        <li>• <strong>Expiring</strong> - Ending soon</li>
                                        <li>• <strong>Saved</strong> - Your bookmarked markets</li>
                                    </ul>
                                </div>
                                <div className="border-l-2 border-[#3B82F6] pl-4">
                                    <h4 className="font-mono text-[#ECEDEE] uppercase text-sm mb-2">Categories</h4>
                                    <ul className="font-mono text-sm text-[#A1A1AA] space-y-1">
                                        <li>• Crypto & Web3</li>
                                        <li>• Technology</li>
                                        <li>• Politics & Policy</li>
                                        <li>• Sports & Entertainment</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Placing Encrypted Bets</h3>
                            <div className="space-y-3 font-mono text-sm text-[#A1A1AA]">
                                <p>Your bet amounts and positions are encrypted using FHEVM technology. No one can see your positions until resolution.</p>
                                <p><strong>Parimutuel Formula:</strong> Payout = Total Pool / Your Option Pool</p>
                            </div>
                        </div>
                    </div>
                );

            case 'admin-guide':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">Admin Guide</h2>
                            <p className="text-[#A1A1AA] font-mono mb-6">Administrative operations and management documentation.</p>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Access Control</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full font-mono text-sm">
                                    <thead>
                                        <tr className="border-b border-[#1C1D20]">
                                            <th className="text-left text-[#3B82F6] uppercase py-2">Role</th>
                                            <th className="text-left text-[#3B82F6] uppercase py-2">Permissions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[#A1A1AA]">
                                        <tr className="border-b border-[#1C1D20]">
                                            <td className="py-2">SUPER_ADMIN</td>
                                            <td className="py-2">Full system access, contract upgrades</td>
                                        </tr>
                                        <tr className="border-b border-[#1C1D20]">
                                            <td className="py-2">ADMIN</td>
                                            <td className="py-2">Create markets, resolve predictions</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2">MODERATOR</td>
                                            <td className="py-2">View analytics, manage users</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Signal Management</h3>
                            <ul className="space-y-2 font-mono text-sm text-[#A1A1AA]">
                                <li>• Create new prediction markets</li>
                                <li>• Set resolution criteria and deadlines</li>
                                <li>• Report outcomes via oracle</li>
                                <li>• Trigger payout distribution</li>
                            </ul>
                        </div>
                    </div>
                );

            case 'technical':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">Technical Architecture</h2>
                            <p className="text-[#A1A1AA] font-mono mb-6">System design and architecture overview for the Privora platform.</p>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Architecture Layers</h3>
                            <div className="space-y-4">
                                <div className="border border-[#1C1D20] p-4">
                                    <h4 className="font-mono text-[#3B82F6] uppercase text-sm mb-2">Frontend (React)</h4>
                                    <p className="font-mono text-sm text-[#A1A1AA]">Vite + React 18 with TailwindCSS. Uses fhevmjs for client-side encryption.</p>
                                </div>
                                <div className="border border-[#1C1D20] p-4">
                                    <h4 className="font-mono text-[#3B82F6] uppercase text-sm mb-2">Backend (Node.js)</h4>
                                    <p className="font-mono text-sm text-[#A1A1AA]">Express API with MongoDB for metadata storage and Redis for caching.</p>
                                </div>
                                <div className="border border-[#1C1D20] p-4">
                                    <h4 className="font-mono text-[#3B82F6] uppercase text-sm mb-2">Smart Contracts (Solidity)</h4>
                                    <p className="font-mono text-sm text-[#A1A1AA]">FHEVM-enabled contracts for encrypted operations on Sepolia testnet.</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Tech Stack</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="text-center border border-[#1C1D20] p-3">
                                    <div className="text-[#3B82F6] font-mono text-xs uppercase">Solidity</div>
                                    <div className="text-[#A1A1AA] font-mono text-sm">0.8.27</div>
                                </div>
                                <div className="text-center border border-[#1C1D20] p-3">
                                    <div className="text-[#3B82F6] font-mono text-xs uppercase">React</div>
                                    <div className="text-[#A1A1AA] font-mono text-sm">18.x</div>
                                </div>
                                <div className="text-center border border-[#1C1D20] p-3">
                                    <div className="text-[#3B82F6] font-mono text-xs uppercase">Node.js</div>
                                    <div className="text-[#A1A1AA] font-mono text-sm">18.x</div>
                                </div>
                                <div className="text-center border border-[#1C1D20] p-3">
                                    <div className="text-[#3B82F6] font-mono text-xs uppercase">FHEVM</div>
                                    <div className="text-[#A1A1AA] font-mono text-sm">0.8+</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'fhevm':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">FHEVM Integration</h2>
                            <p className="text-[#A1A1AA] font-mono mb-6">Encryption implementation details using Zama's Fully Homomorphic Encryption.</p>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Privacy Features</h3>
                            <ul className="space-y-2 font-mono text-sm text-[#A1A1AA]">
                                <li>✓ Private Bet Amounts - Encrypted and never revealed publicly</li>
                                <li>✓ Private Positions - Option choices remain encrypted until resolution</li>
                                <li>✓ Private Balances - Wallet balances within contract are encrypted</li>
                                <li>✓ Private Pool Totals - Total amounts per option encrypted during betting</li>
                            </ul>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Encryption Flow</h3>
                            <div className="space-y-3 font-mono text-sm text-[#A1A1AA]">
                                <p>1. User submits signal with allocation</p>
                                <p>2. fhevmjs encrypts amount & confidence client-side</p>
                                <p>3. Encrypted transaction sent to smart contract</p>
                                <p>4. Oracle reports outcome after deadline</p>
                                <p>5. Zama coprocessor computes accuracy homomorphically</p>
                                <p>6. Researchers claim verified rewards</p>
                            </div>
                        </div>
                    </div>
                );

            case 'api':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">API Reference</h2>
                            <p className="text-[#A1A1AA] font-mono mb-6">REST API endpoints and schemas for the Privora backend.</p>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Base URL</h3>
                            <div className="bg-[#0A0A0A] border border-[#1C1D20] p-3 font-mono text-sm">
                                <code className="text-[#10B981]">http://localhost:5002/api</code>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Key Endpoints</h3>
                            <div className="space-y-3">
                                <div className="border-l-2 border-[#3B82F6] pl-4">
                                    <code className="font-mono text-[#10B981]">GET /predictions</code>
                                    <p className="font-mono text-sm text-[#A1A1AA] mt-1">List all predictions with filtering</p>
                                </div>
                                <div className="border-l-2 border-[#3B82F6] pl-4">
                                    <code className="font-mono text-[#10B981]">GET /predictions/:id</code>
                                    <p className="font-mono text-sm text-[#A1A1AA] mt-1">Get single prediction details</p>
                                </div>
                                <div className="border-l-2 border-[#3B82F6] pl-4">
                                    <code className="font-mono text-[#10B981]">GET /analytics/stats</code>
                                    <p className="font-mono text-sm text-[#A1A1AA] mt-1">Platform statistics</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'contracts':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">Smart Contracts</h2>
                            <p className="text-[#A1A1AA] font-mono mb-6">Solidity smart contract documentation for the Privora protocol.</p>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Core Contracts</h3>
                            <div className="space-y-3">
                                <div className="border border-[#1C1D20] p-3">
                                    <h4 className="font-mono text-[#3B82F6] uppercase text-sm">PredictionHub</h4>
                                    <p className="font-mono text-sm text-[#A1A1AA]">Main contract for prediction market management</p>
                                </div>
                                <div className="border border-[#1C1D20] p-3">
                                    <h4 className="font-mono text-[#3B82F6] uppercase text-sm">SettlementEngine</h4>
                                    <p className="font-mono text-sm text-[#A1A1AA]">Handles payout calculations and distributions</p>
                                </div>
                                <div className="border border-[#1C1D20] p-3">
                                    <h4 className="font-mono text-[#3B82F6] uppercase text-sm">TopicRegistry</h4>
                                    <p className="font-mono text-sm text-[#A1A1AA]">Manages categories and metadata</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Contract Addresses (Sepolia)</h3>
                            <div className="space-y-2 font-mono text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[#A1A1AA]">PredictionHub</span>
                                    <code className="text-[#10B981]">0x9C79...B813</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#A1A1AA]">SettlementEngine</span>
                                    <code className="text-[#10B981]">0xfAD4...Cbe9</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#A1A1AA]">GovernanceController</span>
                                    <code className="text-[#10B981]">0x780a...522A</code>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'enterprise':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">Enterprise Guide</h2>
                            <p className="text-[#A1A1AA] font-mono mb-6">Enterprise deployment, security, and compliance documentation.</p>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Deployment Options</h3>
                            <div className="space-y-4">
                                <div className="border border-[#1C1D20] p-4">
                                    <h4 className="font-mono text-[#3B82F6] uppercase text-sm mb-2">Cloud Deployment</h4>
                                    <ul className="font-mono text-sm text-[#A1A1AA] space-y-1">
                                        <li>• AWS/Azure/GCP with Kubernetes</li>
                                        <li>• Auto-scaling node infrastructure</li>
                                        <li>• Managed MongoDB Atlas</li>
                                    </ul>
                                </div>
                                <div className="border border-[#1C1D20] p-4">
                                    <h4 className="font-mono text-[#3B82F6] uppercase text-sm mb-2">On-Premise</h4>
                                    <ul className="font-mono text-sm text-[#A1A1AA] space-y-1">
                                        <li>• Private network deployment</li>
                                        <li>• Custom domain & SSL</li>
                                        <li>• Internal MongoDB instance</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Security Features</h3>
                            <ul className="space-y-2 font-mono text-sm text-[#A1A1AA]">
                                <li>• End-to-end encryption via FHEVM</li>
                                <li>• Role-based access control</li>
                                <li>• Audit logging for all operations</li>
                                <li>• Rate limiting & DDoS protection</li>
                            </ul>
                        </div>
                    </div>
                );

            case 'intelligence':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">Intelligence Framework</h2>
                            <p className="text-[#A1A1AA] font-mono mb-6">AI-powered prediction market intelligence and analytics.</p>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Signal Processing</h3>
                            <div className="space-y-3 font-mono text-sm text-[#A1A1AA]">
                                <p>Researchers submit encrypted signals with confidence scores. The system aggregates these signals to identify market opportunities.</p>
                                <p><strong>Accuracy Verification:</strong> Zama's FHEVM coprocessor verifies signal accuracy without revealing individual positions.</p>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Reward Distribution</h3>
                            <div className="space-y-3 font-mono text-sm text-[#A1A1AA]">
                                <p>Researchers earn rewards based on prediction accuracy:</p>
                                <ul className="space-y-1">
                                    <li>• High accuracy signals receive bonus multipliers</li>
                                    <li>• Early signals get higher weight in aggregation</li>
                                    <li>• Verified accuracy unlocks reputation tiers</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                );

            case 'troubleshooting':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">Troubleshooting</h2>
                            <p className="text-[#A1A1AA] font-mono mb-6">Common issues and solutions for the Privora platform.</p>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Common Issues</h3>
                            <div className="space-y-4">
                                <div className="border-l-2 border-[#3B82F6] pl-4">
                                    <h4 className="font-mono text-[#ECEDEE] uppercase text-sm mb-1">Wallet Connection Failed</h4>
                                    <p className="font-mono text-sm text-[#A1A1AA]">Ensure MetaMask is installed and connected to Sepolia testnet. Refresh the page and try again.</p>
                                </div>
                                <div className="border-l-2 border-[#3B82F6] pl-4">
                                    <h4 className="font-mono text-[#ECEDEE] uppercase text-sm mb-1">Transaction Pending</h4>
                                    <p className="font-mono text-sm text-[#A1A1AA]">FHEVM transactions may take longer due to coprocessor processing. Wait 1-2 minutes.</p>
                                </div>
                                <div className="border-l-2 border-[#3B82F6] pl-4">
                                    <h4 className="font-mono text-[#ECEDEE] uppercase text-sm mb-1">Backend Connection Error</h4>
                                    <p className="font-mono text-sm text-[#A1A1AA]">Check if backend is running on port 5002. Run `npm run dev:backend` to start.</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-mono text-[#ECEDEE] uppercase tracking-wider mb-4">Support</h3>
                            <div className="space-y-2 font-mono text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#A1A1AA]">GitHub Issues:</span>
                                    <a href="https://github.com/charan0318/privora/issues" className="text-[#3B82F6] hover:underline">Report bugs</a>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#A1A1AA]">Documentation:</span>
                                    <a href="/docs" className="text-[#3B82F6] hover:underline">Browse docs</a>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-mono text-[#ECEDEE] uppercase tracking-widest mb-4">Documentation</h2>
                            <p className="text-[#A1A1AA] font-mono">Select a section from the sidebar to view documentation.</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-full bg-[#090A0B]">
            {/* Sidebar */}
            <aside className="w-64 h-full bg-[#111214] border-r border-[#1C1D20] flex flex-col overflow-y-auto">
                <div className="h-16 flex items-center px-6 border-b border-[#1C1D20]">
                    <div className="flex items-center gap-3 text-white">
                        <BookOpen className="w-5 h-5 text-[#3B82F6]" />
                        <span className="font-mono text-sm tracking-[0.2em] uppercase font-bold">Documentation</span>
                    </div>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-1">
                    {sections.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;
                        
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors rounded-sm ${
                                    isActive
                                        ? 'bg-[#161719] text-[#3B82F6] border-l-2 border-[#3B82F6]'
                                        : 'text-[#A1A1AA] hover:text-[#ECEDEE] hover:bg-[#161719]'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {section.label}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default Docs;