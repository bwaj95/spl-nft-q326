    import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createGenericFile,
  createSignerFromKeypair,
  generateSigner,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import {
  create,
  fetchAsset,
  mplCore,
} from "@metaplex-foundation/mpl-core";

import wallet from "../../devnet-wallet.json";
import { explorerAddress, explorerTransaction } from "./utils";

const RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

const NFT_NAME = "Maveli Across the Golden Backwaters";
const NFT_DESCRIPTION =
  "King Mahabali returns across Kerala's golden backwaters, carrying a luminous seed of prosperity, generosity, and renewal. Created as a joyful one-of-one Onam 2026 collectible on Solana.";
const IMAGE_PATH = "assets/maveli-golden-backwaters.png";
const STATE_PATH = "src/assignment/assignment_state.json";

async function fetchAssetWithRetry(
  umi: ReturnType<typeof createUmi>,
  assetAddress: ReturnType<typeof publicKey>,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      return await fetchAsset(umi, assetAddress);
    } catch (error) {
      lastError = error;
      if (attempt < 6) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
  }

  throw lastError;
}

async function main(): Promise<void> {
  console.log("=======================================================");
  console.log("ASSIGNMENT 2 — CREATE AN NFT USING MPL CORE");
  console.log("=======================================================");
  console.log("Network: Solana devnet");
  console.log(`NFT: ${NFT_NAME}`);

  const umi = createUmi(RPC_URL)
    .use(mplCore())
    .use(
      irysUploader({
        address: "https://devnet.irys.xyz/",
      }),
    );

  const keypair = umi.eddsa.createKeypairFromSecretKey(
    new Uint8Array(wallet),
  );
  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(signer));

  console.log(`Owner and update authority: ${signer.publicKey}`);

  // -------------------------------------------------------------------------
  // Step 1: Upload the artwork.
  // -------------------------------------------------------------------------
  console.log("\n[1/3] Uploading the NFT artwork to Irys...");

  const imageBytes = await readFile(IMAGE_PATH);
  const imageFile = createGenericFile(
    imageBytes,
    "maveli-golden-backwaters.png",
    {
      contentType: "image/png",
      displayName: NFT_NAME,
    },
  );

  const [imageUri] = await umi.uploader.upload([imageFile]);

  assert.ok(imageUri, "Irys must return an image URI");
  console.log("✅ Artwork uploaded");
  console.log(`Image URI: ${imageUri}`);

  // -------------------------------------------------------------------------
  // Step 2: Upload the off-chain JSON metadata.
  // -------------------------------------------------------------------------
  console.log("\n[2/3] Uploading the NFT metadata to Irys...");

  const metadata = {
    name: NFT_NAME,
    description: NFT_DESCRIPTION,
    image: imageUri,
    category: "image",
    attributes: [
      { trait_type: "Festival", value: "Onam 2026" },
      { trait_type: "Character", value: "King Mahabali" },
      { trait_type: "Setting", value: "Kerala Backwaters" },
    ],
  };

  const metadataUri = await umi.uploader.uploadJson(metadata);

  assert.ok(metadataUri, "Irys must return a metadata URI");
  console.log("✅ Metadata uploaded");
  console.log(`Metadata URI: ${metadataUri}`);

  // -------------------------------------------------------------------------
  // Step 3: Create a fresh MPL Core Asset and verify it.
  // -------------------------------------------------------------------------
  console.log("\n[3/3] Creating a fresh MPL Core Asset...");

  const assetSigner = generateSigner(umi);
  const createResult = await create(umi, {
    asset: assetSigner,
    name: NFT_NAME,
    uri: metadataUri,
    payer: signer,
    owner: signer.publicKey,
  }).sendAndConfirm(umi);

  const createSignature = base58.deserialize(createResult.signature)[0];

  console.log("✅ MPL Core Asset created");
  console.log(`Asset address: ${assetSigner.publicKey}`);
  console.log(`Transaction: ${createSignature}`);
  console.log(explorerTransaction(createSignature));

  console.log("\nVerifying the newly created Core Asset...");

  const asset = await fetchAssetWithRetry(
    umi,
    publicKey(assetSigner.publicKey),
  );

  assert.equal(asset.publicKey, assetSigner.publicKey);
  assert.equal(asset.name, NFT_NAME);
  assert.equal(asset.uri, metadataUri);
  assert.equal(asset.owner, signer.publicKey);
  assert.equal(asset.updateAuthority.type, "Address");

  if (asset.updateAuthority.type === "Address") {
    assert.equal(asset.updateAuthority.address, signer.publicKey);
  }

  await writeFile(
    STATE_PATH,
    `${JSON.stringify(
      {
        assetAddress: asset.publicKey,
        owner: asset.owner,
        originalName: asset.name,
        originalUri: asset.uri,
        imageUri,
        createSignature,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("\n✅ Newly created Asset state verified");

  console.log("\n=======================================================");
  console.log("✅ ASSIGNMENT 2 COMPLETED SUCCESSFULLY");
  console.log("=======================================================");
  console.log(`Asset: ${asset.publicKey}`);
  console.log(`Asset Explorer: ${explorerAddress(asset.publicKey)}`);
  console.log(`Owner: ${asset.owner}`);
  console.log(`Update authority: ${signer.publicKey}`);
  console.log(`Name: ${asset.name}`);
  console.log(`Image URI: ${imageUri}`);
  console.log(`Metadata URI: ${asset.uri}`);
  console.log(`Create NFT tx: ${createSignature}`);
  console.log(`State saved to: ${STATE_PATH}`);
}

main().catch((error: unknown) => {
  console.error("\n❌ ASSIGNMENT 2 FAILED");
  console.error(error);
  process.exitCode = 1;
});
