import React, { useState, useRef, useEffect } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import WalletConnect from './WalletConnect';
import NetworkSelector from './NetworkSelector';
import FaucetButton from './FaucetButton';

const Header = () => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearchQuery(urlSearch);
  }, [searchParams]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      setSearchParams({ ...Object.fromEntries(searchParams), search: query });
    } else {
      const params = new URLSearchParams(searchParams);
      params.delete('search');
      setSearchParams(params);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    setSearchParams(params);
  };

  return (
    <header className="bg-[#090A0B] border-b border-[#1C1D20] sticky top-0 z-40 w-full h-16">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Mobile Brand / Menu Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 text-[#A1A1AA] hover:text-[#ECEDEE] transition-colors"
          >
            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="ml-2 font-mono text-sm tracking-widest text-[#ECEDEE] uppercase font-bold">Privora</span>
        </div>

        {/* Minimal Topnav - Search */}
        <div className="hidden md:flex flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#71717A] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search definitions..."
              className="w-full pl-10 pr-10 py-1.5 bg-[#111214] border border-[#1C1D20] rounded-sm text-[#ECEDEE] placeholder-[#71717A] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] transition-all"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-[#71717A] hover:text-[#ECEDEE] transition-colors"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Right Actions */}
        <div className="hidden md:flex items-center gap-3">
           <NetworkSelector />
           <FaucetButton />
           <WalletConnect />
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <div className="md:hidden absolute top-16 left-0 right-0 border-b border-[#1C1D20] bg-[#111214] p-4 shadow-xl">
           <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#71717A] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search..."
                className="w-full pl-10 pr-10 py-2 bg-[#161719] border border-[#1C1D20] rounded-sm text-[#ECEDEE] font-mono text-sm"
              />
           </div>
           
           <div className="flex flex-col gap-3">
              <NetworkSelector />
              <FaucetButton />
              <div className="w-full">
                <WalletConnect />
              </div>
           </div>
        </div>
      )}
    </header>
  );
};

export default Header;


