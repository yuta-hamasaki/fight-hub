// Stripe charge amounts use the smallest currency unit (JPY has no decimals).
const zeroDecimal = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);
export function currencyFactor(currency: string) {
  return zeroDecimal.has(currency.toUpperCase()) ? 1 : 100;
}
export function toMinor(amount: number, currency: string) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid amount");
  return Math.round(amount * currencyFactor(currency));
}
export function fromMinor(amount: number, currency: string) {
  return amount / currencyFactor(currency);
}
