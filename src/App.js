import React, { createContext, useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import MuiAlert from "@mui/material/Alert";
import { Backdrop, Snackbar, CircularProgress } from "@mui/material";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getMint, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import * as bs58 from "bs58";
import BigNumber from "bignumber.js";
import Header from "./components/Header";
import CreateToken from "./pages/CreateToken";

export const AppContext = createContext(null);

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function App() {
    const navigate = useNavigate();
    const { connection } = useConnection();

    const [balanceData, setBalanceData] = useState(null);

    const [loadingView, setLoadingView] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertSeverity, setAlertSeverity] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");

    const handleAlertClose = (event, reason) => {
        if (reason === "clickaway")
            return;
        setAlertOpen(false);
    };
    const showAlert = (severity, message) => {
        setAlertSeverity(severity);
        setAlertMessage(message);
        setAlertOpen(true);
    };

    const isValidAddress = (addr) => {
        try {
            const decodedAddr = bs58.decode(addr);
            if (decodedAddr.length !== 32)
                return false;
            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    };


    const updateAllBalances = async (tokenAddress, wallets) => {
        try {
            console.log("Updating all balances...", tokenAddress);
            const mint = new PublicKey(tokenAddress);
            const mintInfo = await getMint(connection, mint);
            let newWallets = [...wallets];
            const balances = await Promise.all(wallets.map(async (item) => {
                if (isValidAddress(item.address)) {
                    try {
                        const owner = new PublicKey(item.address);
                        const tokenATA = await getAssociatedTokenAddress(mint, owner);
                        const tokenAccountInfo = await getAccount(connection, tokenATA);
                        return Number(new BigNumber(tokenAccountInfo.amount.toString() + "e-" + mintInfo.decimals.toString()).toString()).toFixed(4);
                    }
                    catch (err) {
                        console.log(err);
                    }
                }
                return 0;
            }));

            for (let i = 0; i < newWallets.length; i++)
                newWallets[i].remainTokens = balances[i];

            console.log(newWallets);

            return newWallets;
        }
        catch (err) {
            console.log(err);
            return wallets;
        }
    };

    useEffect(() => {
        navigate("/token");
    }, []);


    useEffect(() => {
        if (balanceData) {
            console.log("Applying balance data...");
            const newWallets = profile.wallets.map(item => {
                const balanceItem = balanceData.find(x => x.address.toUpperCase() === item.address.toUpperCase());
                return {
                    ...item,
                    remainTokens: balanceItem ? balanceItem.remainTokens : 0,
                };
            });

            setProfile({
                ...profile,
                wallets: newWallets,
            });

            updateWalletStats(newWallets);
        }
    }, [balanceData]);


    return (
        <AppContext.Provider
            value={{
                isValidAddress,
                updateAllBalances,
            }}>
            <Header />
            <>
                <Snackbar open={alertOpen} anchorOrigin={{ vertical: "top", horizontal: "center" }} autoHideDuration={6000} onClose={handleAlertClose}>
                    <Alert onClose={handleAlertClose} severity={alertSeverity} sx={{ width: "100%" }}>
                        {alertMessage}
                    </Alert>
                </Snackbar>
                <Routes>
                    <Route path="/token" element={<CreateToken showAlert={showAlert} setLoadingView={setLoadingView} />} />
                </Routes>
                <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loadingView}>
                    <CircularProgress color="inherit" />
                </Backdrop>
            </>
        </AppContext.Provider>
    );
}
