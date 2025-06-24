/**
 * A GM-only application for managing the collaborative skill draft for character creation.
 * @extends {FormApplication}
 */
export class SkillDraftController extends FormApplication {
    constructor(options = {}) {
        super(options);

        /**
         * The central state for the entire draft process.
         * This is the single source of truth, managed by the GM's client.
         * @type {object}
         */
        this.state = {
            participants: [], // Array of actor IDs
            round: 0, // 0: +1/-1, 1: +2/-2, etc.
            turnIndex: 0,
            starterIndex: 0,
            assignments: {}, // { actorId: { skill: value } }
            availableSkills: [],
            status: "pending" // pending, active, complete
        };

        // Register a socket listener to handle actions from players
        game.socket.on("system.paranoia", this._onSocketMessage.bind(this));
    }

    static get acketName() {
        return "system.paranoia";
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "paranoia-skill-draft-controller",
            title: "Skill Draft Controller",
            template: "systems/paranoia/templates/apps/skill-draft-controller.hbs",
            width: 400,
            height: "auto",
            classes: ["paranoia"]
        });
    }

    /** @override */
    async getData() {
        const playerActors = game.actors.filter(a => a.hasPlayerOwner);
        return {
            playerActors,
            state: this.state
        };
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find('.start-draft').click(this._onStartDraft.bind(this));
        html.find('.finalize-draft').click(this._onFinalize.bind(this));
    }

    /**
     * Gathers selected players and kicks off the draft.
     * @private
     */
    async _onStartDraft(event) {
        event.preventDefault();

        const form = this.element.find('form')[0];
        const selectedActors = Array.from(form.elements.participants.options)
            .filter(option => option.selected)
            .map(option => option.value);

        if (selectedActors.length < 2) {
            return ui.notifications.warn("Please select at least two players to begin the draft.");
        }

        this.state.participants = selectedActors;
        this.state.status = "active";
        this.state.round = 1; // Start with the +1/-1 round

        // Initialize assignments object
        for (const actorId of this.state.participants) {
            this.state.assignments[actorId] = { "guns": 2 }; // Pre-assign Guns +2
        }

        // TODO: Populate this.state.availableSkills with all skills except Guns

        this._startNextTurn();
    }

    /**
     * Starts the next turn by notifying all players of the new state.
     * @private
     */
    _startNextTurn() {
        // TODO: Add logic to advance rounds (+2/-2, etc.) when a round is complete.

        const payload = {
            event: "update_state",
            state: this.state
        };
        game.socket.emit("system.paranoia", payload);
        this.render(true); // Re-render the GM view
    }

    /**
     * Handles incoming socket messages from players.
     * @param {object} payload - The data from the socket.
     * @private
     */
    _onSocketMessage(payload) {
        if (payload.event !== "skill_selected" || !game.user.isGM) return;

        const { actorId, skill } = payload.data;
        const pickerActor = game.actors.get(actorId);

        // 1. Verify it was the correct player's turn
        const currentTurnActorId = this.state.participants[this.state.turnIndex];
        if (actorId !== currentTurnActorId) {
            return console.warn(`Paranoia | Received skill selection from wrong player. Expected ${currentTurnActorId}, got ${actorId}.`);
        }

        // 2. Assign the +N skill to the picker
        const skillValue = this.state.round;
        this.state.assignments[actorId][skill] = skillValue;

        // 3. Assign the -N skill to the next player
        const nextPlayerIndex = (this.state.turnIndex + 1) % this.state.participants.length;
        const nextPlayerActorId = this.state.participants[nextPlayerIndex];
        this.state.assignments[nextPlayerActorId][skill] = -skillValue;

        // 4. Remove the skill from the available list for this round
        // TODO: Add logic to track which skills have been used in the current round

        ui.notifications.info(`${pickerActor.name} chose ${skill}. The next player receives ${skill} at ${-skillValue}.`);

        // 5. Advance the turn to the next player who needs to pick
        this.state.turnIndex = (nextPlayerIndex + 1) % this.state.participants.length;

        // 6. Start the next turn
        this._startNextTurn();
    }

    /**
     * Applies all the drafted skills to the actual actor sheets.
     * @private
     */
    async _onFinalize(event) {
        event.preventDefault();
        ui.notifications.info("Applying skill changes to all participants...");

        for (const actorId of this.state.participants) {
            const actor = game.actors.get(actorId);
            const updates = {};

            // TODO: You will need to map your final `this.state.assignments[actorId]`
            // object to the actor's data model. This is an example.
            // For example: `updates["system.skills.athletics.value"] = 2;`

            // TODO: Calculate and set the four Stats based on the final skill values.

            await actor.update(updates);
        }

        this.state.status = "complete";
        this.render(true);

        // Close all player windows
        game.socket.emit("system.paranoia", { event: "close_windows" });
    }

    /** @override */
    close(options) {
        game.socket.off("system.paranoia", this._onSocketMessage);
        return super.close(options);
    }
}