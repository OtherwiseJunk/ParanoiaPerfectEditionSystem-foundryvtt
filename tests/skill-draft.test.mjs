import { describe, it, expect } from "vitest";
import {
  calculateAvailableSkills,
  determineFirstPickForSmallGroup,
  determineNextPlayer,
} from "../module/utils/skill-draft.mjs";

describe("calculateAvailableSkills", () => {
  const allSkills = ["athletics", "science", "bluff", "charm", "demolitions", "operate"];

  it("returns all skills when no assignments exist", () => {
    const result = calculateAvailableSkills(allSkills, {}, "p1", "p2");
    expect(result).toEqual(allSkills);
  });

  it("filters out skills assigned to current player", () => {
    const assignments = { p1: { athletics: 1 }, p2: {} };
    const result = calculateAvailableSkills(allSkills, assignments, "p1", "p2");
    expect(result).not.toContain("athletics");
    expect(result).toContain("science");
  });

  it("filters out skills assigned to next player", () => {
    const assignments = { p1: {}, p2: { science: -1 } };
    const result = calculateAvailableSkills(allSkills, assignments, "p1", "p2");
    expect(result).not.toContain("science");
  });

  it("filters out skills assigned to both players", () => {
    const assignments = { p1: { athletics: 1 }, p2: { science: -1, bluff: 2 } };
    const result = calculateAvailableSkills(allSkills, assignments, "p1", "p2");
    expect(result).not.toContain("athletics");
    expect(result).not.toContain("science");
    expect(result).not.toContain("bluff");
    expect(result).toContain("charm");
  });

  it("does not mutate the input array", () => {
    const original = [...allSkills];
    calculateAvailableSkills(allSkills, { p1: { athletics: 1 } }, "p1", "p2");
    expect(allSkills).toEqual(original);
  });
});

describe("determineFirstPickForSmallGroup", () => {
  it("returns the starter index for round 1", () => {
    expect(determineFirstPickForSmallGroup(2, 1, 4)).toBe(2);
  });

  it("advances by one each round", () => {
    expect(determineFirstPickForSmallGroup(2, 2, 4)).toBe(3);
    expect(determineFirstPickForSmallGroup(2, 3, 4)).toBe(0); // wraps
  });

  it("wraps around correctly", () => {
    expect(determineFirstPickForSmallGroup(3, 3, 4)).toBe(1); // (3+2)%4=1
  });
});

describe("determineNextPlayer", () => {
  it("goes backward (decreasing index) on odd rounds", () => {
    // round 1, current=2, 4 players → (2-1+4)%4 = 1
    expect(determineNextPlayer(2, 1, 4)).toBe(1);
  });

  it("goes forward (increasing index) on even rounds", () => {
    // round 2, current=2, 4 players → (2+1)%4 = 3
    expect(determineNextPlayer(2, 2, 4)).toBe(3);
  });

  it("wraps backward past 0", () => {
    // round 1, current=0, 4 players → (0-1+4)%4 = 3
    expect(determineNextPlayer(0, 1, 4)).toBe(3);
  });

  it("wraps forward past end", () => {
    // round 2, current=3, 4 players → (3+1)%4 = 0
    expect(determineNextPlayer(3, 2, 4)).toBe(0);
  });
});
