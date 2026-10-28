import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { SEPOLIA_RPC_URL } from './contract';

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC_URL)
  }
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
