import assert from "node:assert/strict";

import {
    address,
    appendTransactionMessageInstructions,
    assertIsTransactionWithBlockhashLifetime,
    createKeyPairSignerFromBytes,
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    createTransactionMessage,
    generateKeyPairSigner,
    getSignatureFromTransaction,
    sendAndConfirmTransactionFactory,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
} from "@solana/kit";
import { getCreateAccountInstruction } from "@solana-program/system";
import {
    findAssociatedTokenPda,
    getCreateAssociatedTokenInstructionAsync,
    getInitializeMintInstruction,
    getMintSize,
    getMintToInstruction,
    getTransferCheckedInstruction,
    TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
    createSignerFromKeypair,
    publicKey,
    signerIdentity,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
    createMetadataAccountV3,
    DataV2Args,
} from "@metaplex-foundation/mpl-token-metadata";

import wallet from "../../devnet-wallet.json";
import { explorerAddress, explorerTransaction } from "./utils";

const RPC_URL =
    process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const WS_URL =
    process.env.SOLANA_WS_URL ?? "wss://api.devnet.solana.com";

const TOKEN_NAME = "Onam Mahabali Homecoming";
const TOKEN_SYMBOL = "MAHABALI";
const TOKEN_DECIMALS = 6;
const BASE_UNITS_PER_TOKEN = 1_000_000n;
const TOKENS_TO_MINT = 1_000_000_000n;
const TOKENS_TO_TRANSFER = 1_000_000n;

const RECIPIENT = address(
    "3fwX7iKGuzJHgs6iufnLej1BS8T7M85JszbJk7c7sYgD",
);

const METADATA_URI =
    "https://raw.githubusercontent.com/bwaj95/spl-nft-q326/main/assets/mahabali-homecoming.json";

const rpc = createSolanaRpc(RPC_URL);
const rpcSubscriptions = createSolanaRpcSubscriptions(WS_URL);
const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc,
    rpcSubscriptions,
});


async function main(): Promise<void> {
    console.log("=======================================================");
    console.log("ASSIGNMENT 1 — CREATE, MINT AND TRANSFER AN SPL TOKEN");
    console.log("=======================================================");
    console.log(`Network: Solana devnet`);
    console.log(`Token: ${TOKEN_NAME} (${TOKEN_SYMBOL})`);

    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
    const mint = await generateKeyPairSigner();

    console.log(`Authority: ${signer.address}`);
    console.log(`Recipient: ${RECIPIENT}`);

    // -------------------------------------------------------------------------
    // Step 1: Create and initialize a fresh Mint account.
    // -------------------------------------------------------------------------
    console.log("\n[1/4] Creating and initializing a fresh Mint...");

    const mintSpace = BigInt(getMintSize());
    const mintRent = await rpc
        .getMinimumBalanceForRentExemption(mintSpace)
        .send();

    const createMintAccountInstruction = getCreateAccountInstruction({
        payer: signer,
        newAccount: mint,
        lamports: mintRent,
        space: mintSpace,
        programAddress: TOKEN_PROGRAM_ADDRESS,
    });

    const initializeMintInstruction = getInitializeMintInstruction({
        mint: mint.address,
        decimals: TOKEN_DECIMALS,
        mintAuthority: signer.address,
        freezeAuthority: signer.address,
    });

    const { value: createMintBlockhash } = await rpc
        .getLatestBlockhash()
        .send();

    const createMintMessage = appendTransactionMessageInstructions(
        [createMintAccountInstruction, initializeMintInstruction],
        setTransactionMessageLifetimeUsingBlockhash(
            createMintBlockhash,
            setTransactionMessageFeePayerSigner(
                signer,
                createTransactionMessage({ version: 0 }),
            ),
        ),
    );

    const createMintTransaction =
        await signTransactionMessageWithSigners(createMintMessage);
    assertIsTransactionWithBlockhashLifetime(createMintTransaction);

    const createMintSignature = getSignatureFromTransaction(
        createMintTransaction,
    );

    await sendAndConfirm(createMintTransaction, { commitment: "finalized" });

    // Wait for the finalized Mint to become visible to Metaplex's RPC request.
    await new Promise((resolve) => setTimeout(resolve, 3_000));

    console.log("✅ Fresh Mint created");
    console.log(`Mint address: ${mint.address}`);
    console.log(`Transaction: ${createMintSignature}`);
    console.log(explorerTransaction(createMintSignature));

    // -------------------------------------------------------------------------
    // Step 2: Attach Metaplex metadata to the new Mint.
    // -------------------------------------------------------------------------
    console.log("\n[2/4] Creating Metaplex metadata...");

    const umi = createUmi(RPC_URL);
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
        new Uint8Array(wallet),
    );
    const umiSigner = createSignerFromKeypair(umi, umiKeypair);
    umi.use(signerIdentity(umiSigner));

    const metadata: DataV2Args = {
        name: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        uri: METADATA_URI,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    };

    const metadataResult = await createMetadataAccountV3(umi, {
        mint: publicKey(mint.address),
        mintAuthority: umiSigner,
        data: metadata,
        isMutable: true,
        collectionDetails: null,
    }).sendAndConfirm(umi);

    const metadataSignature = base58.deserialize(metadataResult.signature)[0];

    console.log("✅ Metaplex metadata created");
    console.log(`Name: ${TOKEN_NAME}`);
    console.log(`Symbol: ${TOKEN_SYMBOL}`);
    console.log(`Metadata URI: ${METADATA_URI}`);
    console.log(`Transaction: ${metadataSignature}`);
    console.log(explorerTransaction(metadataSignature));

    // -------------------------------------------------------------------------
    // Step 3: Create the authority's ATA and mint tokens into it.
    // -------------------------------------------------------------------------
    console.log("\n[3/4] Creating owner ATA and minting tokens...");

    const [senderAta] = await findAssociatedTokenPda({
        mint: mint.address,
        owner: signer.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    const createSenderAtaInstruction =
        await getCreateAssociatedTokenInstructionAsync({
            payer: signer,
            mint: mint.address,
            owner: signer.address,
            ata: senderAta,
        });

    const mintedBaseUnits = TOKENS_TO_MINT * BASE_UNITS_PER_TOKEN;
    const mintToInstruction = getMintToInstruction({
        mint: mint.address,
        token: senderAta,
        mintAuthority: signer.address,
        amount: mintedBaseUnits,
    });

    const { value: mintTokensBlockhash } = await rpc
        .getLatestBlockhash()
        .send();

    const mintTokensMessage = appendTransactionMessageInstructions(
        [createSenderAtaInstruction, mintToInstruction],
        setTransactionMessageLifetimeUsingBlockhash(
            mintTokensBlockhash,
            setTransactionMessageFeePayerSigner(
                signer,
                createTransactionMessage({ version: 0 }),
            ),
        ),
    );

    const mintTokensTransaction =
        await signTransactionMessageWithSigners(mintTokensMessage);
    assertIsTransactionWithBlockhashLifetime(mintTokensTransaction);

    const mintTokensSignature = getSignatureFromTransaction(
        mintTokensTransaction,
    );

    await sendAndConfirm(mintTokensTransaction, { commitment: "confirmed" });

    console.log("✅ Tokens minted to the authority's ATA");
    console.log(`Owner ATA: ${senderAta}`);
    console.log(`Minted: ${TOKENS_TO_MINT.toLocaleString()} ${TOKEN_SYMBOL}`);
    console.log(`Transaction: ${mintTokensSignature}`);
    console.log(explorerTransaction(mintTokensSignature));

    // -------------------------------------------------------------------------
    // Step 4: Create the recipient's ATA and transfer tokens into it.
    // -------------------------------------------------------------------------
    console.log("\n[4/4] Creating recipient ATA and transferring tokens...");

    const [recipientAta] = await findAssociatedTokenPda({
        mint: mint.address,
        owner: RECIPIENT,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    const createRecipientAtaInstruction =
        await getCreateAssociatedTokenInstructionAsync({
            payer: signer,
            mint: mint.address,
            owner: RECIPIENT,
            ata: recipientAta,
        });

    const transferredBaseUnits =
        TOKENS_TO_TRANSFER * BASE_UNITS_PER_TOKEN;
    const transferInstruction = getTransferCheckedInstruction({
        source: senderAta,
        mint: mint.address,
        destination: recipientAta,
        authority: signer,
        amount: transferredBaseUnits,
        decimals: TOKEN_DECIMALS,
    });

    const { value: transferBlockhash } = await rpc
        .getLatestBlockhash()
        .send();

    const transferMessage = appendTransactionMessageInstructions(
        [createRecipientAtaInstruction, transferInstruction],
        setTransactionMessageLifetimeUsingBlockhash(
            transferBlockhash,
            setTransactionMessageFeePayerSigner(
                signer,
                createTransactionMessage({ version: 0 }),
            ),
        ),
    );

    const transferTransaction =
        await signTransactionMessageWithSigners(transferMessage);
    assertIsTransactionWithBlockhashLifetime(transferTransaction);

    const transferSignature = getSignatureFromTransaction(transferTransaction);

    await sendAndConfirm(transferTransaction, { commitment: "confirmed" });

    console.log("✅ Tokens transferred to the recipient");
    console.log(`Recipient ATA: ${recipientAta}`);
    console.log(
        `Transferred: ${TOKENS_TO_TRANSFER.toLocaleString()} ${TOKEN_SYMBOL}`,
    );
    console.log(`Transaction: ${transferSignature}`);
    console.log(explorerTransaction(transferSignature));

    // -------------------------------------------------------------------------
    // Verify the accounts created and modified during this run.
    // -------------------------------------------------------------------------
    console.log("\nVerifying the newly created on-chain state...");

    const supplyResult = await rpc.getTokenSupply(mint.address, { commitment: "confirmed" }).send();
    const senderBalanceResult = await rpc
        .getTokenAccountBalance(senderAta, { commitment: "confirmed" })
        .send();
    const recipientBalanceResult = await rpc
        .getTokenAccountBalance(recipientAta, { commitment: "confirmed" })
        .send();

    const expectedSenderBalance = mintedBaseUnits - transferredBaseUnits;

    assert.equal(supplyResult.value.amount, mintedBaseUnits.toString());
    assert.equal(supplyResult.value.decimals, TOKEN_DECIMALS);
    assert.equal(
        senderBalanceResult.value.amount,
        expectedSenderBalance.toString(),
    );
    assert.equal(
        recipientBalanceResult.value.amount,
        transferredBaseUnits.toString(),
    );

    console.log("✅ Mint supply and both ATA balances verified");

    console.log("\n=======================================================");
    console.log("✅ ASSIGNMENT 1 COMPLETED SUCCESSFULLY");
    console.log("=======================================================");
    console.log(`Mint: ${mint.address}`);
    console.log(`Mint Explorer: ${explorerAddress(mint.address)}`);
    console.log(
        `Total supply: ${supplyResult.value.uiAmountString} ${TOKEN_SYMBOL}`,
    );
    console.log(
        `Sender balance: ${senderBalanceResult.value.uiAmountString} ${TOKEN_SYMBOL}`,
    );
    console.log(
        `Recipient balance: ${recipientBalanceResult.value.uiAmountString} ${TOKEN_SYMBOL}`,
    );
    console.log(`Create Mint tx: ${createMintSignature}`);
    console.log(`Create Metadata tx: ${metadataSignature}`);
    console.log(`Mint Tokens tx: ${mintTokensSignature}`);
    console.log(`Transfer Tokens tx: ${transferSignature}`);
}

main().catch((error: unknown) => {
    console.error("\n❌ ASSIGNMENT 1 FAILED");
    console.error(error);
    process.exitCode = 1;
});
