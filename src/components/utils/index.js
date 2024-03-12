import { BN } from "bn.js";
import {
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";
import {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    AuthorityType,
    getMint,
    getMinimumBalanceForRentExemptMint,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    createSetAuthorityInstruction,
} from "@solana/spl-token";
import {
    LOOKUP_TABLE_CACHE,
    DEVNET_PROGRAM_ID,
    MAINNET_PROGRAM_ID,
    SPL_ACCOUNT_LAYOUT,
} from "@raydium-io/raydium-sdk";
import {
    PROGRAM_ID,
    Metadata,
    createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

const PROGRAMIDS = (process.env.REACT_APP_DEVNET_MODE === "true") ? DEVNET_PROGRAM_ID : MAINNET_PROGRAM_ID;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

export async function getWalletTokenAccount(connection, wallet) {
    const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
        programId: TOKEN_PROGRAM_ID,
    });
    return walletTokenAccount.value.map((item) => ({
        pubkey: item.pubkey,
        programId: item.account.owner,
        accountInfo: SPL_ACCOUNT_LAYOUT.decode(item.account.data),
    }));
}

export async function getTokenListByOwner(connection, wallet) {
    const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
        programId: TOKEN_PROGRAM_ID,
    });
    const tokenList = await Promise.all(walletTokenAccount.value.map(async (item) => {
        const accountInfo = SPL_ACCOUNT_LAYOUT.decode(item.account.data);
        const mintInfo = await getMint(connection, accountInfo.mint);
        const [metadataPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata"),
                PROGRAM_ID.toBuffer(),
                accountInfo.mint.toBuffer()
            ],
            PROGRAM_ID
        );

        let tokenName;
        let tokenSymbol;
        try {
            const metadata = await Metadata.fromAccountAddress(connection, metadataPDA);
            tokenName = metadata.data.name;
            tokenSymbol = metadata.data.symbol;
        }
        catch (err) {
            // console.log(err);
            tokenName = "";
            tokenSymbol = "";
        }

        return {
            name: tokenName,
            symbol: tokenSymbol,
            mint: accountInfo.mint.toBase58(),
            balance: accountInfo.amount.div(new BN(Math.pow(10, mintInfo.decimals))).toString()
        };
    }));
    return tokenList;
}

export async function createToken(connection, owner, name, symbol, uri, decimals, totalSupply) {
    // console.log("Creating token transaction...", name, symbol, decimals, totalSupply);
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const mintKeypair = Keypair.generate();
    const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, owner);

    const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer()
        ],
        PROGRAM_ID
    );
    // console.log("Metadata PDA:", metadataPDA.toBase58());

    const tokenMetadata = {
        name: name,
        symbol: symbol,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    };

    const tipAccount = new PublicKey(process.env.REACT_APP_TIP_ADDRESS);
    const instructions = [
        SystemProgram.transfer({
            fromPubkey: owner,
            toPubkey: tipAccount,
            lamports: LAMPORTS_PER_SOL * 0.001,
        }),
        SystemProgram.createAccount({
            fromPubkey: owner,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: lamports,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
            mintKeypair.publicKey,
            decimals,
            owner,
            null,
            TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
            owner,
            tokenATA,
            owner,
            mintKeypair.publicKey,
        ),
        createMintToInstruction(
            mintKeypair.publicKey,
            tokenATA,
            owner,
            totalSupply * Math.pow(10, decimals),
        ),
        createCreateMetadataAccountV3Instruction(
            {
                metadata: metadataPDA,
                mint: mintKeypair.publicKey,
                mintAuthority: owner,
                payer: owner,
                updateAuthority: owner,
            },
            {
                createMetadataAccountArgsV3: {
                    data: tokenMetadata,
                    isMutable: false,
                    collectionDetails: null,
                },
            }
        )
    ];
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const message = new TransactionMessage({
        payerKey: owner,
        recentBlockhash,
        instructions,
    });
    const addLookupTableInfo = (process.env.REACT_APP_DEVNET_MODE === "true") ? undefined : LOOKUP_TABLE_CACHE;
    const transaction = new VersionedTransaction(message.compileToV0Message(Object.values({ ...(addLookupTableInfo ?? {}) })));
    transaction.sign([mintKeypair]);

    return { mint: mintKeypair.publicKey, transaction: transaction };
}

export async function disableMintAuthority(connection, mintAddress, owner) {
    const mint = new PublicKey(mintAddress);
    const transaction = new Transaction().add(
        createSetAuthorityInstruction(
            mint,
            owner,
            AuthorityType.MintTokens,
            null,
        )
    );
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = owner;

    return transaction;
}

export async function sendAndConfirmSignedTransactions(connection, transactions) {

    let retries = 50;
    let passed = {};

    const rawTransactions = transactions.map(transaction => {
        return transaction.serialize();
    });

    while (retries > 0) {
        try {
            let pendings = {};
            for (let i = 0; i < rawTransactions.length; i++) {
                if (!passed[i]) {
                    pendings[i] = connection.sendRawTransaction(rawTransactions[i], {
                        skipPreflight: true,
                        maxRetries: 1,
                    });
                }
            }

            let signatures = {};
            for (let i = 0; i < rawTransactions.length; i++) {
                if (!passed[i])
                    signatures[i] = await pendings[i];
            }

            const sentTime = Date.now();
            while (Date.now() - sentTime <= 1000) {
                for (let i = 0; i < rawTransactions.length; i++) {
                    if (!passed[i]) {
                        const ret = await connection.getParsedTransaction(signatures[i], {
                            commitment: "finalized",
                            maxSupportedTransactionVersion: 0,
                        });
                        if (ret) {
                            // console.log("Slot:", ret.slot);
                            // if (ret.transaction) {
                            //     console.log("Signatures:", ret.transaction.signatures);
                            //     console.log("Message:", ret.transaction.message);
                            // }
                            passed[i] = true;
                        }
                    }
                }

                let done = true;
                for (let i = 0; i < rawTransactions.length; i++) {
                    if (!passed[i]) {
                        done = false;
                        break;
                    }
                }

                if (done)
                    return true;

                await sleep(500);
            }
        }
        catch (err) {
            console.log(err);
        }
        retries--;
    }

    return false;
}

