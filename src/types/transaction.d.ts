export interface TransactionResult {
  success: boolean;
  txHash?: string;
  token: string;
  amount: string;
  timestamp?: number;
}
