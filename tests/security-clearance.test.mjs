import { describe, it, expect } from "vitest";
import {
  SecurityClearance,
  SecurityClearanceColors,
  extractSecurityClearance,
  securityClearanceFromName,
  tokenRingDataForClearance,
} from "../module/utils/security-clearance.mjs";

describe("extractSecurityClearance", () => {
  [
    ["A-R-X-1", 1],
    ["A-O-X-1", 2],
    ["A-Y-X-1", 3],
    ["A-G-X-1", 4],
    ["A-B-X-1", 5],
    ["A-I-X-1", 6],
    ["A-V-X-1", 7],
    ["A-U-X-1", 8],
    ["A-r-X-1", 1],
    ["A-o-X-1", 2],
    ["A-y-X-1", 3],
    ["A-g-X-1", 4],
    ["A-b-X-1", 5],
    ["A-i-X-1", 6],
    ["A-v-X-1", 7],
    ["A-u-X-1", 8],
  ].forEach(([name, expected]) => {
    it(`extracts ${name} clearance level correctly`, () => {
      expect(extractSecurityClearance(name)).toBe(expected);
    });
  });
});

describe("securityClearanceFromName", () => {
  it("returns clearance for a valid Paranoia name", () => {
    expect(securityClearanceFromName("Junk-R-DEV")).toBe(1);
  });

  it("returns 0 (Infrared) for a name without clearance pattern", () => {
    expect(securityClearanceFromName("Just A Name")).toBe(0);
  });

  it("returns 0 for an empty string", () => {
    expect(securityClearanceFromName("")).toBe(0);
  });

  it("handles names with extra hyphens in the sector", () => {
    expect(securityClearanceFromName("Name-B-SECTOR-2")).toBe(SecurityClearance.b);
  });
});

describe("tokenRingDataForClearance", () => {
  [
    [0, SecurityClearanceColors.Infrared, 1],
    [1, SecurityClearanceColors.Red, 1],
    [2, SecurityClearanceColors.Orange, 1],
    [3, SecurityClearanceColors.Yellow, 1],
    [4, SecurityClearanceColors.Green, 1],
    [5, SecurityClearanceColors.Blue, 1],
    [6, SecurityClearanceColors.Indigo, 1],
    [7, SecurityClearanceColors.Violet, 1],
    [8, SecurityClearanceColors.Ultraviolet, 2],
  ].forEach(([clearance, expectedColor, expectedEffects]) => {
    it(`returns correct color and effects for clearance ${clearance}`, () => {
      const result = tokenRingDataForClearance(clearance);
      expect(result.color).toBe(expectedColor);
      expect(result.effects).toBe(expectedEffects);
    });
  });

  it("maps all clearance levels to distinct colors", () => {
    const colors = new Set();
    for (let i = 0; i <= 8; i++) {
      colors.add(tokenRingDataForClearance(i).color);
    }
    expect(colors.size).toBe(9);
  });
});
