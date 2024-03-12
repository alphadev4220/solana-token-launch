import { useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletDialogProvider } from "@solana/wallet-adapter-material-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { BitpieWalletAdapter } from "@solana/wallet-adapter-bitpie";
import { CloverWalletAdapter } from "@solana/wallet-adapter-clover";
import { Coin98WalletAdapter } from "@solana/wallet-adapter-coin98";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { CoinhubWalletAdapter } from "@solana/wallet-adapter-coinhub";
import { MathWalletAdapter } from "@solana/wallet-adapter-mathwallet";
import { SafePalWalletAdapter } from "@solana/wallet-adapter-safepal";
import { SolongWalletAdapter } from "@solana/wallet-adapter-solong";
import { TokenPocketWalletAdapter } from "@solana/wallet-adapter-tokenpocket";
import { TrustWalletAdapter } from "@solana/wallet-adapter-trust";
import { WalletConnectWalletAdapter } from "@solana/wallet-adapter-walletconnect";

function SolanaWalletProvider({ children }) {
    const endpoint = process.env.REACT_APP_DEVNET_MODE === "true" ? clusterApiUrl("devnet") : process.env.REACT_APP_RPC_URL;
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new TrustWalletAdapter(),
            new MathWalletAdapter({ endpoint }),
            new TokenPocketWalletAdapter(),
            new CoinbaseWalletAdapter({ endpoint }),
            new SolongWalletAdapter({ endpoint }),
            new Coin98WalletAdapter({ endpoint }),
            new SafePalWalletAdapter({ endpoint }),
            new BitpieWalletAdapter({ endpoint }),
            new CloverWalletAdapter(),
            new CoinhubWalletAdapter(),
            new WalletConnectWalletAdapter({
                network: WalletAdapterNetwork.Mainnet, // const only, cannot use condition to use dev/main, guess is relative to walletconnect connection init
                options: {
                    projectId: "Token-Launcher-Solana",
                    metadata: {
                        name: "Raydium",
                        description: "Raydium",
                        url: "https://raydium.io/",
                        icons: ["https://raydium.io/logo/logo-only-icon.svg"]
                    }
                }
            }),
        ],
        [endpoint]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletDialogProvider>
                    {children}
                </WalletDialogProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default SolanaWalletProvider;
