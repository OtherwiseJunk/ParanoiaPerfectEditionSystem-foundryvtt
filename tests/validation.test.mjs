import { describe, it, expect } from 'vitest';
import { clampWellnessValue, clampAttributeValue } from '../module/utils/validation.mjs';

describe('clampWellnessValue', () => {
  const bounds = { min: 0, max: 4, value: 2 };

  it('returns the value when within bounds', () => {
    expect(clampWellnessValue(3, bounds)).toBe(3);
  });

  it('clamps to max', () => {
    expect(clampWellnessValue(10, bounds)).toBe(4);
  });

  it('clamps to min', () => {
    expect(clampWellnessValue(-1, bounds)).toBe(0);
  });

  it('returns current value for NaN', () => {
    expect(clampWellnessValue(NaN, bounds)).toBe(2);
  });

  it('accepts boundary values exactly', () => {
    expect(clampWellnessValue(0, bounds)).toBe(0);
    expect(clampWellnessValue(4, bounds)).toBe(4);
  });
});

describe('clampAttributeValue', () => {
  it('returns value within [-5, 5]', () => {
    expect(clampAttributeValue(3)).toBe(3);
    expect(clampAttributeValue(-3)).toBe(-3);
  });

  it('clamps to 5', () => {
    expect(clampAttributeValue(10)).toBe(5);
  });

  it('clamps to -5', () => {
    expect(clampAttributeValue(-10)).toBe(-5);
  });

  it('returns 0 for NaN', () => {
    expect(clampAttributeValue(NaN)).toBe(0);
  });
});
