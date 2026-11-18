export function weightedAverageCost(items: { quantity: number; unitCost: number }[]) {
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  if (quantity === 0) return 0;
  return Math.round(items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0) / quantity);
}

export function stockStatus(stock: number, minimum: number) {
  if (stock <= 0) return "Habis" as const;
  if (stock <= minimum) return "Menipis" as const;
  return "Aman" as const;
}

export function parseIndonesianNumber(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
