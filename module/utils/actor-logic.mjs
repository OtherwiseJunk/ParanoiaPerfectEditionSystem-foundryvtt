const ABILITY_SHORTHANDS = Object.freeze({
  brains: 'brn',
  chutzpah: 'chtz',
  mechanics: 'mec',
  violence: 'vio',
});

/**
 * @param {string} abilityName
 * @returns {string} Shorthand abbreviation, or '' if unrecognized.
 */
export function getAbilityShorthand(abilityName) {
  return ABILITY_SHORTHANDS[abilityName] ?? '';
}

/**
 * A four-peak sine easing function used for the "Losing It" token ring flash.
 * @param {number} t - Progress value (0 to 1)
 * @returns {number}
 */
export function easeFourPeaks(t) {
  return Math.sin(t * Math.PI * 3);
}
