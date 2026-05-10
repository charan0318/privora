import React from 'react';
import { NavLink } from 'react-router-dom';
import { Hexagon, LayoutDashboard, Wallet, ShieldAlert, BarChart3, BookOpen } from 'lucide-react';

const Sidebar = () => {
    return (
        <aside className="w-64 h-screen bg-[#111214] border-r border-[#1C1D20] flex flex-col hidden md:flex sticky top-0 left-0">
            {/* Brand Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-[#1C1D20]">
                <div className="flex items-center gap-3 text-white">
                    <Hexagon className="w-6 h-6 text-[#3B82F6]" />
                    <span className="font-mono text-sm tracking-[0.2em] uppercase font-bold">Privora</span>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 py-6 px-4 space-y-2">
                <p className="px-2 text-xs font-mono text-[#71717A] uppercase tracking-wider mb-4">Infrastructure</p>
                
                <NavLink 
                    to="/"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-sm transition-colors ${isActive ? 'bg-[#161719] text-[#3B82F6] border-l-2 border-[#3B82F6]' : 'text-[#A1A1AA] hover:text-[#ECEDEE] hover:bg-[#161719]'}`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Markets
                </NavLink>

                <NavLink 
                    to="/dashboard"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-sm transition-colors ${isActive ? 'bg-[#161719] text-[#3B82F6] border-l-2 border-[#3B82F6]' : 'text-[#A1A1AA] hover:text-[#ECEDEE] hover:bg-[#161719]'}`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                </NavLink>

                <NavLink 
                    to="/wallet"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-sm transition-colors ${isActive ? 'bg-[#161719] text-[#3B82F6] border-l-2 border-[#3B82F6]' : 'text-[#A1A1AA] hover:text-[#ECEDEE] hover:bg-[#161719]'}`}
                >
                    <Wallet className="w-4 h-4" />
                    Wallet
                </NavLink>
                
                <NavLink 
                    to="/admin"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-sm transition-colors ${isActive ? 'bg-[#161719] text-[#3B82F6] border-l-2 border-[#3B82F6]' : 'text-[#A1A1AA] hover:text-[#ECEDEE] hover:bg-[#161719]'}`}
                >
                    <ShieldAlert className="w-4 h-4" />
                    System Admin
                </NavLink>

                <NavLink 
                    to="/docs"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-sm transition-colors ${isActive ? 'bg-[#161719] text-[#3B82F6] border-l-2 border-[#3B82F6]' : 'text-[#A1A1AA] hover:text-[#ECEDEE] hover:bg-[#161719]'}`}
                >
                    <BookOpen className="w-4 h-4" />
                    Documentation
                </NavLink>
            </nav>

            {/* Status Footer */}
            <div className="p-4 border-t border-[#1C1D20]">
                <div className="flex items-center gap-2 text-xs font-mono text-[#A1A1AA]">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                    FHEVM Encrypted
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;


