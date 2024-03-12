import React, { useState, useEffect, useContext } from "react";
import { styled } from '@mui/material/styles';
import { Container, Box, TextField, Button, IconButton, TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
    SystemProgram,
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
    Metaplex,
    walletAdapterIdentity,
    irysStorage,
    toMetaplexFileFromBrowser,
} from "@metaplex-foundation/js";

import { AppContext } from "../../App";
import {
    createToken,
    disableMintAuthority,
    getTokenListByOwner,
    sendAndConfirmSignedTransactions,
} from "../../components/utils";

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

const getTipTransaction = async (connection, account, tip) => {

    const feeAddress = process.env.REACT_APP_TIP_ADDRESS;
    console.log(feeAddress);
    if (feeAddress) {
        const tipAccount = new PublicKey(feeAddress);
        const tx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: account,
                toPubkey: tipAccount,
                lamports: LAMPORTS_PER_SOL * tip,
            })
        );
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.feePayer = account;

        return tx;
    } else
        return null;

}

const CreateToken = (props) => {
    const { isValidAddress } = useContext(AppContext);
    const { showAlert, setLoadingView } = props;
    const { connection } = useConnection();
    const { publicKey, connected, signMessage, sendTransaction, signTransaction, signAllTransactions } = useWallet();

    const [metaplex, setMetaplex] = useState(null);
    const [tokenInfo, setTokenInfo] = useState({
        name: "",
        symbol: "",
        uri: "",
        decimals: "",
        totalSupply: "",
        mint: "",
    });
    const [revokeMint, setRevokeMint] = useState("");
    const [tokenList, setTokenList] = useState([]);

    useEffect(() => {
        if (connected) {
            console.log("Making metaplex...");
            const newMetaplex = Metaplex.make(connection)
                .use(irysStorage())
                .use(walletAdapterIdentity({
                    publicKey,
                    signMessage,
                    signTransaction,
                    signAllTransactions
                }));
            setMetaplex(newMetaplex);

            console.log("Getting token accounts...");
            getTokenListByOwner(connection, publicKey).then(response => {
                setTokenList(response);
                console.log("Success");
            });
        }
        else
            setTokenList([]);
    }, [connected, publicKey]);

    const copyToClipboard = (comment, text) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                if (comment === "address")
                    showAlert("success", "Address copied to clipboard");
            })
            .catch(err => {
                console.error('Error copying text: ', err);
            });
    };

    const handleUploadLogo = async (e) => {
        // setLoadingView(true);
        try {
            if (metaplex) {
                const { uri } = await metaplex.nfts().uploadMetadata({
                    name: tokenInfo.name,
                    symbol: tokenInfo.symbol,
                    description: "",
                    image: await toMetaplexFileFromBrowser(e.target.files[0]),
                    // animation_url: "",
                    // external_url: "",
                    // attributes: [{ trait_type: "", value: "" }],
                    // properties: {
                    //     creators: [
                    //         {
                    //             address: "",
                    //             share: 1
                    //         }
                    //     ],
                    //     files: [
                    //         {
                    //             type: "",
                    //             uri: "",
                    //         }
                    //     ]
                    // },
                    // collection: {
                    //     name: "",
                    //     family: "",
                    // }
                });
                console.log(uri);
                setTokenInfo({
                    ...tokenInfo,
                    uri: uri
                });
            }
            else
                console.log("Metaplex is not set");
        }
        catch (err) {
            console.log(err);
            showAlert("warning", "Failed to upload logo!");
        }
        // setLoadingView(false);
    }

    const handleCreateToken = async () => {
        if (!connected) {
            showAlert("warning", "Please connect wallet!");
            return;
        }

        if (tokenInfo.name === "") {
            showAlert("warning", "Please input token name!");
            return;
        }

        if (tokenInfo.symbol === "") {
            showAlert("warning", "Please input token symbol!");
            return;
        }

        if (Number(tokenInfo.decimals) <= 0) {
            showAlert("warning", "Please input valid decimals!");
            return;
        }

        const totalSupply = Number(tokenInfo.totalSupply.replaceAll(",", ""));
        if (totalSupply <= 0) {
            showAlert("warning", "Please input valid total supply!");
            return;
        }

        setLoadingView(true);
        try {
            const { mint, transaction } = await createToken(connection, publicKey, tokenInfo.name, tokenInfo.symbol, tokenInfo.uri, Number(tokenInfo.decimals), totalSupply);
            if (transaction) {
                const res = await sendTransaction(transaction, connection);
                if (!res) {
                    showAlert("warning", "Failed to create token!");
                    setLoadingView(false);
                    return;
                }
            }

            setTokenInfo({
                ...tokenInfo,
                mint: mint.toBase58(),
            });

            const newTokenList = await getTokenListByOwner(connection, publicKey);
            setTokenList(newTokenList);

            showAlert("success", "Succeed to create token!");
        }
        catch (err) {
            console.log(err);
            showAlert("warning", "Failed to create token!");
        }
        setLoadingView(false);
    };

    const handleRevokeMintAuthority = async () => {
        if (!connected) {
            showAlert("warning", "Please connect wallet!");
            return;
        }

        if (!isValidAddress(revokeMint)) {
            showAlert("warning", "Invalid mint address!");
            return;
        }

        setLoadingView(true);
        try {
            const transaction = await disableMintAuthority(connection, revokeMint, publicKey);
            const res = await sendTransaction(transaction, connection);
            if (res)
                showAlert("success", "Succeed to revoke mint authority!");
            else
                showAlert("warning", "Failed to revoke mint authority!");
        }
        catch (err) {
            console.log(err);
            showAlert("warning", "Failed to revoke mint authority!");
        }
        setLoadingView(false);
    };

    return (
        <>
            <Container maxWidth={false}>
                <Box sx={{ mt: 12, mb: 3, "h1": { mb: 0 } }}>
                    <Box>
                        <h1>Create Token</h1>
                        <hr />
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                            <Box sx={{ width: "60%" }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                                    <TextField variant="outlined"
                                        fullWidth
                                        label="Name"
                                        value={tokenInfo.name}
                                        onChange={(e) => setTokenInfo({ ...tokenInfo, name: e.target.value })} />
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                                    <TextField variant="outlined"
                                        fullWidth
                                        label="Symbol"
                                        value={tokenInfo.symbol}
                                        onChange={(e) => setTokenInfo({ ...tokenInfo, symbol: e.target.value })} />
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                                    <TextField variant="outlined"
                                        fullWidth
                                        label="Logo URI"
                                        value={tokenInfo.uri}
                                        onChange={(e) => setTokenInfo({ ...tokenInfo, uri: e.target.value })} />
                                    <Button variant="contained"
                                        component="label"
                                        color="secondary"
                                        sx={{ ml: 2, px: 3, whiteSpace: "nowrap" }}>
                                        Upload Logo
                                        <VisuallyHiddenInput type="file" accept="image/*" onChange={handleUploadLogo} />
                                    </Button>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                                    <TextField variant="outlined"
                                        fullWidth
                                        label="Decimals"
                                        value={tokenInfo.decimals}
                                        onChange={(e) => setTokenInfo({ ...tokenInfo, decimals: e.target.value })} />
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                                    <TextField variant="outlined"
                                        fullWidth
                                        label="Total Supply"
                                        value={tokenInfo.totalSupply}
                                        onChange={(e) => setTokenInfo({ ...tokenInfo, totalSupply: e.target.value })} />
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                                    <p>Note: This token launcher creates tokens WITHOUT freeze authority so there is no need to revoke it.</p>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
                                    <Button variant="contained"
                                        color="secondary"
                                        sx={{ padding: "10px 20px", fontSize: "24px" }}
                                        onClick={handleCreateToken}>
                                        Create Token
                                    </Button>
                                </Box>
                                {
                                    tokenInfo.mint !== "" &&
                                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                        <h2>Mint Address:&nbsp;&nbsp;&nbsp;&nbsp;{tokenInfo.mint.slice(0, 7) + "..." + tokenInfo.mint.slice(37)}</h2>
                                        <IconButton
                                            aria-label="copy"
                                            color="secondary"
                                            onClick={() => copyToClipboard("address", tokenInfo.mint)}
                                            sx={{ marginLeft: "5px", marginRight: "5px" }}>
                                            <ContentCopyOutlinedIcon />
                                        </IconButton>
                                    </Box>
                                }
                            </Box>
                        </Box>
                    </Box>
                    <Box>
                        <h1>Revoke Mint Authority</h1>
                        <hr />
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                            <Box sx={{ width: "60%" }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                                    <TextField variant="outlined"
                                        fullWidth
                                        label="Mint Address"
                                        value={revokeMint}
                                        onChange={(e) => setRevokeMint(e.target.value)} />
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
                                    <Button variant="contained"
                                        color="secondary"
                                        sx={{ padding: "10px 20px", fontSize: "24px" }}
                                        onClick={handleRevokeMintAuthority}>
                                        Revoke Mint Authority
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                    <Box>
                        <h1>Token Holdings</h1>
                        <hr />
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                            <TableContainer sx={{
                                width: "60%",
                                "th": {
                                    padding: "0px 5px",
                                    margin: "5px"
                                },
                                "td": {
                                    padding: "0px 5px",
                                    margin: "5px",
                                    border: "0"
                                },
                            }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell style={{ width: '80%' }}>
                                                <p style={{ marginLeft: "20px" }}>Mint</p>
                                            </TableCell>
                                            <TableCell style={{ width: '20%' }}>
                                                <p>Balance</p>
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {
                                            tokenList.map((item, index) => {
                                                return (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                                                <IconButton
                                                                    aria-label="copy"
                                                                    color="secondary"
                                                                    size="small"
                                                                    onClick={() => copyToClipboard("address", item.mint)}
                                                                    sx={{ marginLeft: "10px", marginRight: "5px" }}>
                                                                    <ContentCopyOutlinedIcon />
                                                                </IconButton>
                                                                <p>
                                                                    {
                                                                        item.name !== "" && item.symbol !== "" ?
                                                                            `${item.name} (${item.symbol})` :
                                                                            item.name !== "" ?
                                                                                item.name :
                                                                                item.mint
                                                                    }
                                                                </p>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <p>{item.balance}</p>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        }
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    </Box>
                </Box>
            </Container>
        </>
    );
}

export default CreateToken;