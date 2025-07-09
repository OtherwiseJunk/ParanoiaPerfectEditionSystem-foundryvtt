import { getMergeObjectFunction } from "../utils/compatibility.mjs";
import { socketEventChannel } from "../paranoia.mjs";
import { SkillDraftEvent } from "./SkillDraftController.js";

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
        const mergeObject = getMergeObjectFunction();
        return mergeObject(super.defaultOptions, {
            id: "paranoia-skill-draft-player",
            title: "Skill Draft",
            template: "systems/paranoia/templates/apps/skill-draft-player.hbs",
            width: 720,
            height: "auto",
            resizable: true,
            classes: ["paranoia"]
        });
    }

    /** @override */
    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons.unshift({
            label: "Refresh",
            class: "refresh-draft",
            icon: "fas fa-sync",
            onclick: ev => this._onRefresh(ev)
        });
        return buttons;
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
        const isMyTurn = this.state.participants[this.state.currentPlayerIndex] === myActorId;

        return {
            state: this.state,
            isMyTurn,
        };
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find('.skill-button').click(this._onSkillSelect.bind(this));
    }

    /**
     * Handles the click on the refresh button in the header.
     * Emits a socket event to the GM to request the latest state.
     * @param {Event} event The triggering click event.
     * @private
     */
    _onRefresh(event) {
        event.preventDefault();
        ui.notifications.info("Requesting latest draft state from GM...");
        const payload = {
            event: SkillDraftEvent.REQUEST_STATE,
            clientId: game.user.id
        };
        // Send the request to the GM
        game.socket.emit(socketEventChannel, payload);
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
            event: SkillDraftEvent.SELECT_SKILL,
            data: {
                actorId: myActorId,
                skill: skill
            }
        };

        // Send the choice to the GM
        game.socket.emit(socketEventChannel, payload);

        // Disable the UI to prevent double-submission
        this.element.find('.skill-button').prop('disabled', true);
        ui.notifications.info(`You selected ${skill}. Waiting for the GM to process...`);
    }
}
