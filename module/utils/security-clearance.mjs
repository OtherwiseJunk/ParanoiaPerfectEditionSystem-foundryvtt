/**
 * Security clearance letter → numeric value mapping.
 */
export const SecurityClearance = Object.freeze({
  r: 1,
  o: 2,
  y: 3,
  g: 4,
  b: 5,
  i: 6,
  v: 7,
  u: 8,
});

/**
 * Hex color values for each security clearance level.
 */
export const SecurityClearanceColors = Object.freeze({
  Infrared: 0x000000,
  Red: 0xff0000,
  Orange: 0xff7700,
  Yellow: 0xffff00,
  Green: 0x00ff00,
  Blue: 0x0000ff,
  Indigo: 0x4b0082,
  Violet: 0x7f00ff,
  Ultraviolet: 0xffffff,
});

/**
 * Regex pattern for Paranoia character names: {Name}-{ClearanceLetter}-{Sector}{Clone}
 */
const CLEARANCE_NAME_PATTERN = /.*-[RrOoYyGgBbIiVvuU]-.*/;

/**
 * Extract the numeric security clearance from a character name.
 * @param {string} name - Full character name (e.g., "Wren-R-UST-1")
 * @returns {number} Numeric clearance value, or 0 for Infrared/unrecognized.
 */
export function extractSecurityClearance(name) {
  const nameParts = name.split("-");
  const securityCharacter = nameParts[1].toLowerCase();
  return SecurityClearance[securityCharacter];
}

/**
 * Determine the numeric security clearance from a character name,
 * returning 0 (Infrared) if the name doesn't match the expected pattern.
 * @param {string} name - Full character name
 * @returns {number} Numeric clearance value
 */
export function securityClearanceFromName(name) {
  if (CLEARANCE_NAME_PATTERN.test(name)) {
    return extractSecurityClearance(name);
  }
  return 0;
}

/**
 * Get the token ring color for a given security clearance level.
 * @param {number} securityClearance - Numeric clearance value
 * @returns {{ color: number, effects: number }} Token ring color and effects count.
 */
export function tokenRingDataForClearance(securityClearance) {
  let effects = 1;
  let color;

  switch (securityClearance) {
    case SecurityClearance.r:
      color = SecurityClearanceColors.Red;
      break;
    case SecurityClearance.o:
      color = SecurityClearanceColors.Orange;
      break;
    case SecurityClearance.y:
      color = SecurityClearanceColors.Yellow;
      break;
    case SecurityClearance.g:
      color = SecurityClearanceColors.Green;
      break;
    case SecurityClearance.b:
      color = SecurityClearanceColors.Blue;
      break;
    case SecurityClearance.i:
      color = SecurityClearanceColors.Indigo;
      break;
    case SecurityClearance.v:
      color = SecurityClearanceColors.Violet;
      break;
    case SecurityClearance.u:
      color = SecurityClearanceColors.Ultraviolet;
      effects = 2;
      break;
    default:
      color = SecurityClearanceColors.Infrared;
      break;
  }

  return { color, effects };
}
