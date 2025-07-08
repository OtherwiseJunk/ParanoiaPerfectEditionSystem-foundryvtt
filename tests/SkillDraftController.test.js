import { describe, it, expect, beforeEach } from 'vitest';
import { SkillDraftController } from '../module/apps/SkillDraftController.js';

describe('SkillDraftController', () => {
    let controller;

    beforeEach(() => {
        controller = new SkillDraftController();
        controller.state.participants = ['p1', 'p2', 'p3'];
        controller.state.round = 1;
        controller.state.direction = 1; // Clockwise
        controller.state.picksThisRound = 0;
    });

    it('should reverse draft direction at the end of a round', () => {
        // Initial state
        expect(controller.state.direction).toBe(1);

        // Simulate a full round of picks
        for (let i = 0; i < controller.state.participants.length; i++) {
            controller._startNextTurn();
        }

        // Check that the round has advanced and direction has flipped
        expect(controller.state.round).toBe(2);
        expect(controller.state.direction).toBe(-1); // Counter-clockwise

        // Simulate another full round
        for (let i = 0; i < controller.state.participants.length; i++) {
            controller._startNextTurn();
        }
        expect(controller.state.round).toBe(3);
        expect(controller.state.direction).toBe(1); // Clockwise again
    });
});
