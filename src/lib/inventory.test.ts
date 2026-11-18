import { describe, expect, it } from "vitest";
import { parseIndonesianNumber, stockStatus, weightedAverageCost } from "@/lib/inventory";

describe("inventory business rules", () => {
  it("calculates weighted average cost", () => {
    expect(weightedAverageCost([{ quantity: 2, unitCost: 10000 }, { quantity: 3, unitCost: 15000 }])).toBe(13000);
  });

  it("classifies stock levels", () => {
    expect(stockStatus(0, 5)).toBe("Habis");
    expect(stockStatus(5, 5)).toBe("Menipis");
    expect(stockStatus(6, 5)).toBe("Aman");
  });

  it("accepts Indonesian number formatting", () => {
    expect(parseIndonesianNumber("1.500.000")).toBe(1500000);
    expect(parseIndonesianNumber("1500000")).toBe(1500000);
  });
});
