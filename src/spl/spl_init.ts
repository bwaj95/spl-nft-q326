import {
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  assertIsTransactionMessageWithBlockhashLifetime,
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
import {
  getInitializeMintInstruction,
  getMintSize,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { getCreateAccountInstruction } from "@solana-program/system";

//import your wallet
import wallet from "../../devnet-wallet.json";

const rpc = createSolanaRpc("https://api.devnet.solana.com");

const rpcSubscriptions = createSolanaRpcSubscriptions(
  "wss://api.devnet.solana.com",
);

(async () => {
  try {
    const signer = await createKeyPairSignerFromBytes(new Uint8Array(wallet));

    const mint = await generateKeyPairSigner();

    const space = BigInt(getMintSize()); // 82 bytes

    //get the minimum balance for rent exemption
    const rent = await rpc.getMinimumBalanceForRentExemption(space).send();

    // create empty account and assign ownership to token program
    const createMintAccountIx = getCreateAccountInstruction({
      payer: signer,
      newAccount: mint,
      lamports: rent,
      space,
      programAddress: TOKEN_PROGRAM_ADDRESS
    });


    const initializeMintIx = getInitializeMintInstruction({
      mint: mint.address,
      decimals: 6,
      mintAuthority: signer.address,
      freezeAuthority: signer.address,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const msg = createTransactionMessage({ version: 0 });

    const msgWithPayer = setTransactionMessageFeePayerSigner(signer, msg);

    const msgWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      msgWithPayer);

    const txMessage = appendTransactionMessageInstructions(
      [createMintAccountIx, initializeMintIx],
      msgWithLifetime,
    );

    assertIsTransactionMessageWithBlockhashLifetime(txMessage);

    const signedTx =
      await signTransactionMessageWithSigners(txMessage);

    assertIsTransactionWithBlockhashLifetime(signedTx);

    const signature = getSignatureFromTransaction(signedTx);

    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });

    await sendAndConfirm(signedTx, {
      commitment: "confirmed",
    });

    console.log(`Mint address: ${mint.address}`);
    console.log(`Transaction signature: ${signature}`);
    console.log(
      `Explorer: https://explorer.solana.com/address/${mint.address}?cluster=devnet`,
    );
  } catch (error) {
    console.log(error);
  }
})();
