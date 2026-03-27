/**
 * Calculate available skills for the current pick in the skill draft.
 * Filters out skills already assigned to either the current or next player.
 * @param {string[]} allSkills - All draftable skill names
 * @param {Object<string, Object>} assignments - Current assignments by actor ID
 * @param {string} currentPlayerId - Actor ID of the current picker
 * @param {string} nextPlayerId - Actor ID of the next player
 * @returns {string[]} Available skill names
 */
export function calculateAvailableSkills(allSkills, assignments, currentPlayerId, nextPlayerId) {
  let available = [...allSkills];

  for (const actorId of [currentPlayerId, nextPlayerId]) {
    const actorAssignments = assignments[actorId] || {};
    available = available.filter((skill) => !actorAssignments.hasOwnProperty(skill));
  }

  return available;
}

/**
 * Determine which player index goes first in a round (for ≤5 players).
 * Cycles through players based on a starting index.
 * @param {number} draftStarterIndex - The initial randomly-chosen starter
 * @param {number} round - Current round (1-based)
 * @param {number} numParticipants - Total number of participants
 * @returns {number} Index of the first picker for this round
 */
export function determineFirstPickForSmallGroup(draftStarterIndex, round, numParticipants) {
  const roundOffset = round - 1;
  return (draftStarterIndex + roundOffset) % numParticipants;
}

/**
 * Determine the next player index in snake-draft order.
 * Odd rounds go one direction, even rounds go the other.
 * @param {number} currentIndex - Current player index
 * @param {number} round - Current round (1-based)
 * @param {number} numParticipants - Total number of participants
 * @returns {number} Index of the next player
 */
export function determineNextPlayer(currentIndex, round, numParticipants) {
  if (round % 2 === 0) {
    return (currentIndex + 1) % numParticipants;
  }
  return (currentIndex - 1 + numParticipants) % numParticipants;
}
