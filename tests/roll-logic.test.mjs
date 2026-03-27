import { describe, it, expect } from "vitest";
import {
  calculateNODE,
  generateRollString,
  computerDiceAttractsAttention,
} from "../module/utils/roll-logic.mjs";

describe("calculateNODE", () => {
  it("adds computer die (+1) for positive NODE", () => {
    expect(calculateNODE(3, 1, 0, 0)).toBe(5);
  });

  it("adds computer die (-1) for negative NODE", () => {
    expect(calculateNODE(1, 0, 0, 3)).toBe(-3);
  });

  it("handles zero base NODE → goes positive (+1)", () => {
    expect(calculateNODE(0, 0, 0, 0)).toBe(1);
  });

  it("subtracts initiative modifier", () => {
    expect(calculateNODE(3, 0, 2, 0)).toBe(2);
  });

  it("subtracts hurt level", () => {
    expect(calculateNODE(3, 0, 0, 1)).toBe(3);
  });

  it("adds equipment modifier", () => {
    expect(calculateNODE(2, 3, 0, 0)).toBe(6);
  });

  it("handles the barely-negative case", () => {
    expect(calculateNODE(0, 0, 1, 0)).toBe(-2);
  });
});

describe("generateRollString", () => {
  it("generates standard roll for positive NODE", () => {
    expect(generateRollString(3)).toBe("3d6cs>=5");
  });

  it("generates negative NODE formula", () => {
    expect(generateRollString(-2)).toBe("2 * (2d6cs>=5) - 2");
  });

  it("generates single die for NODE=1", () => {
    expect(generateRollString(1)).toBe("1d6cs>=5");
  });

  it("handles large NODE values", () => {
    expect(generateRollString(10)).toBe("10d6cs>=5");
  });
});

describe("computerDiceAttractsAttention", () => {
  // Flag 0 (Loyal): only a 6 attracts attention
  it("flag 0: only 6 attracts attention", () => {
    expect(computerDiceAttractsAttention(6, 0)).toBe(true);
    expect(computerDiceAttractsAttention(5, 0)).toBe(false);
    expect(computerDiceAttractsAttention(1, 0)).toBe(false);
  });

  // Flag 1 (Greylisted): 5-6
  it("flag 1: 5 and 6 attract attention", () => {
    expect(computerDiceAttractsAttention(5, 1)).toBe(true);
    expect(computerDiceAttractsAttention(6, 1)).toBe(true);
    expect(computerDiceAttractsAttention(4, 1)).toBe(false);
  });

  // Flag 4 (Wanted): 2-6
  it("flag 4: 2-6 attract attention", () => {
    expect(computerDiceAttractsAttention(2, 4)).toBe(true);
    expect(computerDiceAttractsAttention(1, 4)).toBe(false);
  });

  // Flag 3 (Citizen of Interest): 3-6
  it("flag 3: 3-6 attract attention", () => {
    expect(computerDiceAttractsAttention(3, 3)).toBe(true);
    expect(computerDiceAttractsAttention(2, 3)).toBe(false);
  });
});
