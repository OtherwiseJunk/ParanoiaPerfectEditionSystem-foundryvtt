/**
 * Pure validation/clamping logic — no Foundry VTT dependency.
 */

/**
 * Clamp a wellness value (health, flag, moxie) within its min/max bounds.
 * @param {number} newValue - The proposed new value
 * @param {{ min: number, max: number, value: number }} bounds - The actor's current bounds
 * @returns {number} The clamped value, or the current value if newValue is NaN.
 */
export function clampWellnessValue(newValue, bounds) {
  if (isNaN(newValue)) return bounds.value;
  if (newValue > bounds.max) return bounds.max;
  if (newValue < bounds.min) return bounds.min;
  return newValue;
}

/**
 * Clamp a rolling attribute value within [-5, 5].
 * @param {number} value
 * @returns {number}
 */
export function clampAttributeValue(value) {
  const min = -5;
  const max = 5;
  if (isNaN(value)) return 0;
  if (value > max) return max;
  if (value < min) return min;
  return value;
}
