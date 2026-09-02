import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import {
  fetchAsset,
  mplCore,
  update,
} from "@metaplex-foundation/mpl-core";

import wallet from "../../devnet-wallet.json";
import { explorerAddress, explorerTransaction } from "./utils";

const RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const STATE_PATH = "src/assignment/assignment_state.json";

const UPDATED_NAME = "Maveli's Golden Homecoming";
const UPDATED_DESCRIPTION =
  "King Mahabali completes his journey across Kerala's golden backwaters, bringing prosperity, equality, generosity, and renewal. The NFT's name and metadata were updated on Solana by its update authority.";

interface AssignmentState {
  assetAddress: string;
  owner: string;
  originalName: string;
  originalUri: string;
  imageUri: string;
  createSignature: string;
  updatedName?: string;
  updatedUri?: string;
  updateSignature?: string;
}


async function main(): Promise<void> {
  console.log("=======================================================");
  console.log("ASSIGNMENT 3 — UPDATE AN MPL CORE NFT");
  console.log("=======================================================");
  console.log("Network: Solana devnet");

  const state = JSON.parse(
    await readFile(STATE_PATH, "utf8"),
  ) as AssignmentState;

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

  const assetAddress = publicKey(state.assetAddress);

  // -------------------------------------------------------------------------
  // Step 1: Fetch the Asset and verify the update authority.
  // -------------------------------------------------------------------------
  console.log("\n[1/3] Fetching the current Core Asset...");

  const before = await fetchAsset(umi, assetAddress);

  assert.equal(before.publicKey, assetAddress);
  assert.equal(before.owner, state.owner);
  assert.equal(before.updateAuthority.type, "Address");

  if (before.updateAuthority.type === "Address") {
    assert.equal(
      before.updateAuthority.address,
      signer.publicKey,
      "Connected wallet is not the NFT's update authority",
    );
  }

  console.log("✅ Current Asset fetched");
  console.log(`Asset: ${before.publicKey}`);
  console.log(`Current name: ${before.name}`);
  console.log(`Current metadata URI: ${before.uri}`);
  console.log(`Owner: ${before.owner}`);
  console.log(`Verified update authority: ${signer.publicKey}`);

  // -------------------------------------------------------------------------
  // Step 2: Upload a new metadata JSON document.
  // -------------------------------------------------------------------------
  console.log("\n[2/3] Uploading revised metadata to Irys...");

  const updatedMetadata = {
    name: UPDATED_NAME,
    description: UPDATED_DESCRIPTION,
    image: state.imageUri,
    category: "image",
    attributes: [
      { trait_type: "Festival", value: "Onam 2026" },
      { trait_type: "Character", value: "King Mahabali" },
      { trait_type: "Setting", value: "Kerala Backwaters" },
      { trait_type: "Journey", value: "Homecoming Complete" },
      { trait_type: "Metadata Version", value: "2" },
    ],
  };

  const updatedMetadataUri = await umi.uploader.uploadJson(updatedMetadata);

  assert.ok(updatedMetadataUri, "Irys must return a new metadata URI");
  assert.notEqual(
    updatedMetadataUri,
    before.uri,
    "Updated metadata must use a new URI",
  );

  console.log("✅ Revised metadata uploaded");
  console.log(`Updated metadata URI: ${updatedMetadataUri}`);

  // -------------------------------------------------------------------------
  // Step 3: Update the on-chain name and URI, then verify the new state.
  // -------------------------------------------------------------------------
  console.log("\n[3/3] Updating the NFT as its update authority...");

  const updateResult = await update(umi, {
    asset: before,
    name: UPDATED_NAME,
    uri: updatedMetadataUri,
  }).sendAndConfirm(umi);

  const updateSignature = base58.deserialize(updateResult.signature)[0];

  console.log("✅ Core update transaction confirmed");
  console.log(`Transaction: ${updateSignature}`);
  console.log(explorerTransaction(updateSignature));

  console.log("\nVerifying the updated on-chain state...");

  let after = await fetchAsset(umi, assetAddress);

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    if (after.name === UPDATED_NAME && after.uri === updatedMetadataUri) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
    after = await fetchAsset(umi, assetAddress);
  }

  assert.equal(after.publicKey, before.publicKey);
  assert.equal(after.name, UPDATED_NAME);
  assert.equal(after.uri, updatedMetadataUri);
  assert.equal(after.owner, before.owner);
  assert.equal(after.updateAuthority.type, "Address");

  if (after.updateAuthority.type === "Address") {
    assert.equal(after.updateAuthority.address, signer.publicKey);
  }

  await writeFile(
    STATE_PATH,
    `${JSON.stringify(
      {
        ...state,
        updatedName: after.name,
        updatedUri: after.uri,
        updateSignature,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("✅ Updated name, URI, owner and authority verified");

  console.log("\n=======================================================");
  console.log("✅ ASSIGNMENT 3 COMPLETED SUCCESSFULLY");
  console.log("=======================================================");
  console.log(`Asset: ${after.publicKey}`);
  console.log(`Asset Explorer: ${explorerAddress(after.publicKey)}`);
  console.log(`Previous name: ${before.name}`);
  console.log(`Updated name: ${after.name}`);
  console.log(`Previous metadata URI: ${before.uri}`);
  console.log(`Updated metadata URI: ${after.uri}`);
  console.log(`Owner unchanged: ${after.owner}`);
  console.log(`Update authority: ${signer.publicKey}`);
  console.log(`Update NFT tx: ${updateSignature}`);
  console.log(`State updated at: ${STATE_PATH}`);
}

main().catch((error: unknown) => {
  console.error("\n❌ ASSIGNMENT 3 FAILED");
  console.error(error);
  process.exitCode = 1;
});
