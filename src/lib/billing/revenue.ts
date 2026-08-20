import { calculatePlatformFeeAmount } from "@/lib/billing/fees";

export type RevenueTransaction = {
  id: string;
  kind: "session" | "subscription";
  label: string;
  occurredAt: Date;
  gross: number;
  currency: string;
};

export type RevenueSummary = {
  gross: number;
  fees: number;
  net: number;
  transactionCount: number;
};

export function summarizeRevenue(transactions: RevenueTransaction[]): RevenueSummary {
  return transactions.reduce<RevenueSummary>((summary, transaction) => {
    const grossMinor = Math.round(transaction.gross * 100);
    const fee = calculatePlatformFeeAmount(grossMinor) / 100;
    return {
      gross: summary.gross + transaction.gross,
      fees: summary.fees + fee,
      net: summary.net + transaction.gross - fee,
      transactionCount: summary.transactionCount + 1,
    };
  }, { gross: 0, fees: 0, net: 0, transactionCount: 0 });
}
