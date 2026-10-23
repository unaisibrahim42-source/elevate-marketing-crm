export type PartnerShare = { partnerId: string; pct: number };
export type ProfitSplit = { partnerId: string; pct: number; amountPence: number };

/** Splits a distributable amount across partners by percentage, in integer pence. */
export function calculateProfitSplits(distributableAmountPence: number, shares: PartnerShare[]): ProfitSplit[] {
  return shares.map((s) => ({
    partnerId: s.partnerId,
    pct: s.pct,
    amountPence: Math.round((distributableAmountPence * s.pct) / 100),
  }));
}
