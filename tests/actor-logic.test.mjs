import { describe, it, expect } from 'vitest';
import { getAbilityShorthand, easeFourPeaks } from '../module/utils/actor-logic.mjs';

describe('getAbilityShorthand', () => {
  it('returns correct shorthands', () => {
    expect(getAbilityShorthand('brains')).toBe('brn');
    expect(getAbilityShorthand('chutzpah')).toBe('chtz');
    expect(getAbilityShorthand('mechanics')).toBe('mec');
    expect(getAbilityShorthand('violence')).toBe('vio');
  });

  it('returns empty string for unknown abilities', () => {
    expect(getAbilityShorthand('charisma')).toBe('');
    expect(getAbilityShorthand('')).toBe('');
  });
});

describe('easeFourPeaks', () => {
  it('returns 0 at t=0', () => {
    expect(easeFourPeaks(0)).toBeCloseTo(0);
  });

  it('returns 0 at t=1', () => {
    expect(easeFourPeaks(1)).toBeCloseTo(0);
  });

  it('returns non-zero at midpoints', () => {
    expect(Math.abs(easeFourPeaks(0.25))).toBeGreaterThan(0);
  });
});
