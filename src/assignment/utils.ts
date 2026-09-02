export function explorerTransaction(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function explorerAddress(account: string): string {
  return `https://explorer.solana.com/address/${account}?cluster=devnet`;
}