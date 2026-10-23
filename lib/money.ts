export function formatPence(pence: number | null | undefined): string {
  const value = (pence ?? 0) / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function penceToPounds(pence: number): number {
  return pence / 100;
}
