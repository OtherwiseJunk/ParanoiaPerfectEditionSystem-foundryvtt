/**
 * Calculate the Number Of Dice (NODE) for a roll.
 * @param {number} statPlusSkill - Combined stat + skill value from the sheet
 * @param {number} equipmentModifier - Equipment level bonus
 * @param {number} initiativeModifier - Initiative penalty (subtracted)
 * @param {number} hurtLevel - Wound penalty (subtracted): 4 - health.value
 * @returns {number} Final NODE including the Computer Die (+1 or -1)
 */
export function calculateNODE(statPlusSkill, equipmentModifier, initiativeModifier, hurtLevel) {
  let NODE = statPlusSkill;

  NODE += equipmentModifier;
  NODE -= initiativeModifier;
  NODE -= hurtLevel;

  if (NODE < 0) {
    return NODE - 1; // "add" Computer Dice (negative direction)
  }
  return NODE + 1; // add Computer Dice
}

/**
 * Generate the Foundry roll formula string for a given NODE value.
 * @param {number} NODE - Number of dice (including computer die)
 * @returns {string} Roll formula string
 */
export function generateRollString(NODE) {
  if (NODE > 0) return `${Math.abs(NODE)}d6cs>=5`;

  let positiveNode = Math.abs(NODE);
  return `2 * (${positiveNode}d6cs>=5) - ${positiveNode}`;
}

/**
 * Determine whether the Computer Die attracted Friend Computer's attention.
 * @param {number} computerDiceResult - The result of the computer die (1-6)
 * @param {number} flagLevel - Current flag/wanted level (0-4)
 * @returns {boolean}
 */
export function computerDiceAttractsAttention(computerDiceResult, flagLevel) {
  return computerDiceResult >= 6 - flagLevel;
}
