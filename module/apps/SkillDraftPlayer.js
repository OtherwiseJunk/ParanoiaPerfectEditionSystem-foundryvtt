/**
 * A player-facing application for participating in the skill draft.
 * @extends {Application}
 */
export class SkillDraftPlayer extends Application {
    constructor(initialState, options = {}) {
        super(options);
        this.state = initialState;
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "paranoia-skill-draft-player",
            title: "Skill Draft",
            template: "systems/paranoia/templates/apps/skill-draft-player.hbs",
            width: 400,
            height: "auto",
            classes: ["paranoia"]
        });
    }

    /**
     * Updates the application's state and re-renders.
     * @param {object} newState The new state from the GM.
     */
    updateState(newState) {
        this.state = newState;

        this.render(true);
    }

    /** @override */
    getData() {
        const myActorId = game.user.character?.id;
        const isMyTurn = this.state.participants[this.state.turnIndex] === myActorId;
        const playerNamesByActorId = new Map();
        this.state.participants.forEach(actorId => {
            const actor = game.actors.get(actorId);
            if (actor) {
                playerNamesByActorId.set(actorId, actor.name);
            }
        });
        const currentPlayerName = playerNamesByActorId.get(this.state.participants[this.state.currentPlayerIndex]) || "Unknown Player";

        return {
            state: this.state,
            isMyTurn,
            myActorId,
            playerNamesByActorId,
            currentPlayerName,
            availableSkills: this.state.availableSkills || []
        };
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find('.skill-button').click(this._onSkillSelect.bind(this));
    }

    /**
     * Handles a player clicking on a skill to select it.
     * @param {Event} event The triggering click event.
     * @private
     */
    _onSkillSelect(event) {
        event.preventDefault();
        const skill = event.currentTarget.dataset.skill;
        const myActorId = game.user.character?.id;

        if (!myActorId) {
            return ui.notifications.error("You do not have a character assigned.");
        }

        const payload = {
            event: "skill_selected",
            data: {
                actorId: myActorId,
                skill: skill
            }
        };

        // Send the choice to the GM
        game.socket.emit("system.paranoia", payload);

        // Disable the UI to prevent double-submission
        this.element.find('.skill-button').prop('disabled', true);
        ui.notifications.info(`You selected ${skill}. Waiting for the GM to process...`);
    }
}

