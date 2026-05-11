// This file provides the Wagmi config for the application
// Note: WalletConnect now uses custom useWallet hook instead of AppKit
import { WagmiAdapter } from '@reown/appkit-wagmi'
import { mainnet, sepolia } from 'viem/chains'

// Get projectId from https://cloud.walletconnect.com
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '9a8bfc9f7b72c96c338b8b287cdc75a9'

// Create wagmiConfig
const chains = [mainnet, sepolia]
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: chains,
})

export const config = wagmiAdapter.wagmiConfig

// Simple provider wrapper (kept for compatibility)
export function CustomAppKitProvider({ children }) {
  return children
}

export default config;