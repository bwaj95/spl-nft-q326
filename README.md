# 🌼 Onam Mahabali Homecoming — SPL Token

> **ഓണാശംസകൾ! Onashamsakal!** King Mahabali has arrived on Solana devnet. 👑

**MAHABALI** is a festive fungible SPL token created for Onam 2026 as part of the **Turbin3 Q3 Builders Cohort**. The project follows the complete token lifecycle: creating a Mint, attaching Metaplex metadata and original artwork, minting the supply, creating Associated Token Accounts, and transferring tokens to another wallet.

![Onam Mahabali Homecoming](assets/mahabali-homecoming.png)

## Devnet deployment

| Item | Value |
|---|---|
| Network | Solana Devnet |
| Token name | Onam Mahabali Homecoming |
| Symbol | `MAHABALI` |
| Mint | [`365yusi2RTm5JUDBfSUCYrmzsvR34vr5ohWiYbo542hf`](https://explorer.solana.com/address/365yusi2RTm5JUDBfSUCYrmzsvR34vr5ohWiYbo542hf?cluster=devnet) |
| Decimals | `6` |
| Minted supply | `1,000,000,000 MAHABALI` |
| Transferred amount | `1,000,000 MAHABALI` |
| Sender ATA | [`FTF4R92LRfWP5UqujmHiBQyKZ8p5MxEVmHi8eeM1BNND`](https://explorer.solana.com/address/FTF4R92LRfWP5UqujmHiBQyKZ8p5MxEVmHi8eeM1BNND?cluster=devnet) |
| Recipient wallet | [`3fwX7iKGuzJHgs6iufnLej1BS8T7M85JszbJk7c7sYgD`](https://explorer.solana.com/address/3fwX7iKGuzJHgs6iufnLej1BS8T7M85JszbJk7c7sYgD?cluster=devnet) |
| Recipient ATA | [`7WSsZ2fheyatfqvG44LNMJi2EvAVQAkSCz4Lqb4Q3m3b`](https://explorer.solana.com/address/7WSsZ2fheyatfqvG44LNMJi2EvAVQAkSCz4Lqb4Q3m3b?cluster=devnet) |

## Verified transactions

| Step | Transaction |
|---|---|
| 1. Create and initialize Mint | [`5mfY2zvC...xkayZ2CD`](https://explorer.solana.com/tx/5mfY2zvCZx3Lr1Gq8cWRLvwWWiK5GdAcQ4VcZFpqupT4Hd4QaHdzTsgPCduTiHF1agbfBUDn8PH8okSNxkayZ2CD?cluster=devnet) |
| 2. Create Metaplex metadata account | [`62RjAPeM...Ve3v2dv`](https://explorer.solana.com/tx/62RjAPeMSSacvu5F6cyq7nemNsVK6oRAGinD7TtufbfqiG38X4zLpQeaux2G5ZipiCQ7gjy1awDeQuPodVe3v2dv?cluster=devnet) |
| 3. Create sender ATA and mint supply | [`2JsoedSC...qKMBtX1`](https://explorer.solana.com/tx/2JsoedSCrubjMoS8PHwaiMv8Vy6b4A1cJZHk8USeRPAHcGH6bPf6y4Dbt9sY1ft6KJvBmyZxGha9wRhbVqKMBtX1?cluster=devnet) |
| 4. Create recipient ATA and transfer tokens | [`5SmEeAup...LeKPjWJi`](https://explorer.solana.com/tx/5SmEeAupwdDeKNfQgvEGaKmjaRwg6ArkLgKW6oCHtLg6nLZ4ZciWX4PELUYojb6YGHqDe68Eo9RsYvXQLeKPjWJi?cluster=devnet) |


# scripts-solana

Scripts for creating SPL tokens and NFTs on Solana devnet.

---

## Setup

### 1. Add your wallet

Place your devnet wallet keypair file at the project root:

```
root/
└── devnet-wallet.json   ← here
```

It should be a JSON array of numbers, e.g. `[174, 23, ...]`.

### 2. Install dependencies

```bash
npm install
```

```bash
npm install --save-dev @types/node ts-node typescript
```

### 3. Add your image

Place your image at the project root.

```
root/
└── image.jpeg   ← here
```

---

> Before running the scripts, go through these docs:
> - [Solana token docs](https://solana.com/docs/tokens) — mint accounts, token accounts, and ATAs
> - [Solana Kit](https://www.solanakit.com/) — the JS SDK used for building and sending transactions
> - [Metaplex Token Metadata](https://www.metaplex.com/docs/smart-contracts/token-metadata) — attaching metadata to SPL tokens
> - [Metaplex Core](https://www.metaplex.com/docs/smart-contracts/core) — the NFT standard used in the NFT scripts

## SPL Token

Uses **@solana/kit** and **@solana-program/token** for transactions, and **mpl-token-metadata** via UMI for on-chain metadata.

| Script | Command | What it does |
|---|---|---|
| `spl_init.ts` | `npm run spl:init` | Creates a new mint account |
| `spl_metadata.ts` | `npm run spl:metadata` | Attaches a name, symbol, and URI to the mint |
| `spl_mint.ts` | `npm run spl:mint` | Creates your associated token account and mints tokens into it |
| `spl_transfer.ts` | `npm run spl:transfer` | Sends tokens to another wallet i.e ata to ata |

Run them in order. Each script logs the addresses/signatures you'll need to paste into the next one.

---

## NFT

Uses **@solana/kit** and **mpl-core** via UMI. Images and metadata are stored on Irys (decentralized storage).

| Script | Command | What it does |
|---|---|---|
| `nft_image.ts` | `npm run nft:image` | Uploads your image to Irys, logs the image URI |
| `nft_metadata.ts` | `npm run nft:metadata` | Builds the metadata JSON and uploads it, logs the metadata URI |
| `nft_mint.ts` | `npm run nft:mint` | Mints the NFT on-chain using the metadata URI |

Run them in order. Paste the URI logged by each step into the next script before running it.
