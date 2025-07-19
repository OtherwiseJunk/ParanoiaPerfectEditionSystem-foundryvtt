import { socketEventChannel } from "../paranoia.mjs";
import { getMergeObjectFunction } from "../utils/compatibility.mjs";
export const SkillDraftEvent = {
    START_DRAFT: 'draftStarted',
    UPDATE_DRAFT_STATE: 'draftStateUpdated',
    SELECT_SKILL: `playerSkillSelected`,
    CLOSE_DRAFT: `draftClosed`,
    REQUEST_STATE: 'playerRequestState'
}
import { getAllPlayerCharacters } from "../utils/foundryUtils.mjs";

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
            participants: [],
            round: 0,
            currentPlayerIndex: 0,
            nextPlayerIndex: 0,
            starterIndex: 0,
            assignments: {},
            availableSkills: [],
            allDraftableSkills: [],
            status: "pending",
            playersWhoHaveGoneFirst: [],
            draftStarterIndex: -1,
            currentPlayerName: "",
            nextPlayerName: "",
            playerNamesByActorId: {},
        };

        /**
         * A map to store which stat each skill belongs to.
         * Populated from the data model in _onStartDraft.
         * @type {Object<string, string>} e.g., { athletics: "violence", science: "brains" }
         */
        this.skillToStatMap = {};

        this.socketHandler = this._onSocketEvent.bind(this);
        game.socket.on(socketEventChannel, this.socketHandler);
    }

    /** @override */
    static get defaultOptions() {
        const mergeObject = getMergeObjectFunction();
        return mergeObject(super.defaultOptions, {
            id: "paranoia-skill-draft-controller",
            title: "Skill Draft Controller",
            template: "systems/paranoia/templates/apps/skill-draft-controller.hbs",
            width: 640,
            height: "auto",
            resizable: true,
            classes: ["paranoia-app", "skill-draft-controller"]
        });
    }

    /** @override */
    async getData() {
        const playerActors = getAllPlayerCharacters();
        return {
            playerActors,
            state: this.state,
            actors: game.actors
        };
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find('.start-draft').click(this._onStartDraft.bind(this));
    }

    /**
     * Calculates the available skills for the current pick.
     * This method updates the `availableSkills` property in the state.
     * It filters out skills that have already been assigned to the current or next player in turn order.
     * @private
     */
    _calculateAvailableSkills() {
        let availableSkills = [...this.state.allDraftableSkills];
        let currentPlayerId = this.state.participants[this.state.currentPlayerIndex];
        let nextPlayerId = this.state.participants[this.state.nextPlayerIndex];
        let assignments = this.state.assignments;

        // Filter out skills that have been assigned to current or next player
        for (const actorId of [currentPlayerId, nextPlayerId]) {
            const actorAssignments = assignments[actorId] || {};
            availableSkills = availableSkills.filter(skill => !actorAssignments.hasOwnProperty(skill));
        }
        this.state.availableSkills = availableSkills;
    }

    /**
     * Randomly determines which player will go first in the current round.
     * Ensures that no player has gone first more than once in the current draft.
     * Updates the currentPlayerIndex and nextPlayerIndex accordingly.
     * @private
     */
    _determineFirstPickForRound() {
        const numParticipants = this.state.participants.length;

        if (numParticipants <= 5) {
            // For 5 or fewer players, cycle through who goes first based on the initial starter.
            // The round is 1-based, so we subtract 1 for a zero-based offset.
            const roundOffset = this.state.round - 1;
            this.state.currentPlayerIndex = (this.state.draftStarterIndex + roundOffset) % numParticipants;
        } else {
            // For more than 5 players, randomly pick a player who hasn't gone first yet.
            let index = Math.floor(Math.random() * numParticipants);
            while (this.state.playersWhoHaveGoneFirst.includes(index)) {
                index = Math.floor(Math.random() * numParticipants);
            }
            this.state.playersWhoHaveGoneFirst.push(index);
            this.state.currentPlayerIndex = index;
        }
    }

    _determineNextPlayer() {
        if (this.state.round % 2 === 0) {
            this.state.nextPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.participants.length;
        }
        else {
            this.state.nextPlayerIndex = (this.state.currentPlayerIndex - 1 + this.state.participants.length) % this.state.participants.length;
        }
    }

    /**
     * Retrieves all draftable skills from the Actor data model.
     * Populates the `allDraftableSkills` and `skillToStatMap` properties
     * @private
     */
    _retrieveAllDraftableSkills() {
        const allDraftableSkills = [];
        try {
            const schema = CONFIG.Actor.dataModels.troubleshooter.defineSchema();
            const stats = ['brains', 'chutzpah', 'mechanics', 'violence'];

            for (const statName of stats) {
                const skillFields = schema.abilities.fields[statName].fields.skills.fields;
                for (const skillName in skillFields) {
                    allDraftableSkills.push(skillName);
                    this.skillToStatMap[skillName] = statName;
                }
            }
        } catch (e) {
            console.error("Paranoia | Could not dynamically load skills from data model. Falling back to defaults.", e);
            ui.notifications.error("Could not read skills from the Actor data model. Check console (F12) for details.");
        }

        this.state.allDraftableSkills = allDraftableSkills.filter(s => s.toLowerCase() !== 'guns');;
    }

    /**
     * Sends a chat message as the Skill Draft app.
     * @param {string} message
     */

    _sendChatMessage(message) {
        ChatMessage.create({
            content: message,
            speaker: { alias: "Skill Draft" },
        });
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
        selectedActors.forEach(actorId => {
            const actor = game.actors.get(actorId);
            if (actor) {
                this.state.playerNamesByActorId[actorId] = actor.name;
            }
        });
        if (this.state.participants.length <= 5) {
            this.state.draftStarterIndex = Math.floor(Math.random() * this.state.participants.length);
        }

        this.state.status = "active";

        for (const actorId of this.state.participants) {
            this.state.assignments[actorId] = { "guns": 2 };
        }

        this._retrieveAllDraftableSkills();
        game.socket.emit(socketEventChannel, { "event": SkillDraftEvent.START_DRAFT, "state": {} });

        this._startNextTurn();
    }

    /**
     * Handles incoming socket messages from players.
     * @param {object} data - The data from the socket.
     * @private
     */
    _onSocketEvent(eventData) {
        if (!game.user.isGM) return;
        const { event } = eventData;

        switch (event) {
            case SkillDraftEvent.SELECT_SKILL:
                this._handleSkillSelection(eventData);
                break;
            case SkillDraftEvent.REQUEST_STATE:
                this._handleStateRequest(eventData);
                break;
        }
    }

    /**
     * Handles a skill selection event from a player.
     * @param {object} eventData The full event data from the socket.
     * @private
     */
    _handleSkillSelection(eventData) {
        const { data } = eventData;
        const { actorId, skill } = data;

        const currentTurnActorId = this.state.participants[this.state.currentPlayerIndex];
        const nextPlayerActorId = this.state.participants[this.state.nextPlayerIndex];


        if (actorId !== currentTurnActorId) {
            return console.warn(`Paranoia | Received skill selection from wrong player. Expected ${currentTurnActorId}, got ${actorId}.`);
        }

        const skillValue = this.state.round;
        this.state.assignments[actorId][skill] = skillValue;
        this.state.assignments[nextPlayerActorId][skill] = -1 * skillValue;

        const pickerName = this.state.playerNamesByActorId[actorId] || "Unknown Player";
        const nextPlayerName = this.state.playerNamesByActorId[nextPlayerActorId] || "Unknown Player";
        const formattedSkillName = Handlebars.helpers.formatSkillName(skill);
        let messageContent = `<strong>${pickerName}</strong> has selected the skill <strong>${formattedSkillName}</strong> with a value of ${skillValue}. <strong>${nextPlayerName}</strong> has been assigned a value of ${-skillValue} for this skill.`;
        this._sendChatMessage(messageContent);

        this.state.currentPlayerIndex = this.state.nextPlayerIndex;
        this._determineNextPlayer();
        this._startNextTurn();
    }

    /**
     * Handles a state request event from a player.
     * @param {object} eventData The full event data from the socket.
     * @private
     */
    _handleStateRequest(eventData) {
        const { clientId } = eventData;
        console.log(`Paranoia | Received state refresh request from user ${clientId}. Resending state.`);
        game.socket.emit(socketEventChannel, { "event": SkillDraftEvent.UPDATE_DRAFT_STATE, "state": this.state, "clientId": clientId });
    }

    /**
     * Applies all the drafted skills to the actual actor sheets.
     * @private
     */
    async finalizeDraft() {
        ui.notifications.info("Applying skill changes to all participants...");

        const updates = [];
        for (const actorId of this.state.participants) {
            const actorUpdates = { _id: actorId };
            const assignments = this.state.assignments[actorId];
            const statTotals = { brains: 0, chutzpah: 0, mechanics: 0, violence: 0 };

            for (const [skillName, modifier] of Object.entries(assignments)) {
                const statName = this.skillToStatMap[skillName];
                if (statName) {
                    actorUpdates[`system.abilities.${statName}.skills.${skillName}.value`] = modifier;
                    if (modifier > 0) statTotals[statName]++;
                }
            }

            for (const [statName, value] of Object.entries(statTotals)) {
                actorUpdates[`system.abilities.${statName}.value`] = value;
            }
            updates.push(actorUpdates);
        }

        await Actor.updateDocuments(updates);

        this.state.status = "complete";
        this.render(true);

        game.socket.emit(socketEventChannel, { "event": SkillDraftEvent.CLOSE_DRAFT });
        const message = "Skill draft complete and all changes have been applied!"
        this._sendChatMessage(message);
    };
    /**
     * Starts the next turn by notifying all players of the new state.
     * @private
     */
    _startNextTurn() {
        if (this.state.currentPlayerIndex == this.state.starterIndex) {
            this.state.round++;
            this._determineFirstPickForRound();
            this._determineNextPlayer();
            this.state.starterIndex = this.state.currentPlayerIndex;
        }
        if (this.state.round > 5) {
            ui.notifications.info("Skill draft is complete! All skill levels have been drafted.");
            this.finalizeDraft();
            return;
        }

        this.state.currentPlayerName = this.state.playerNamesByActorId[this.state.participants[this.state.currentPlayerIndex]] || "Unknown Player";
        this.state.nextPlayerName = this.state.playerNamesByActorId[this.state.participants[this.state.nextPlayerIndex]] || "Unknown Player";
        this._calculateAvailableSkills();
        game.socket.emit(socketEventChannel, { "event": SkillDraftEvent.UPDATE_DRAFT_STATE, "state": this.state });
        this.render(true);
    }

    /** @override */
    close(options) {
        game.socket.emit(socketEventChannel, { "event": SkillDraftEvent.CLOSE_DRAFT });
        game.socket.off(socketEventChannel, this.socketHandler);
        return super.close(options);
    }
}
