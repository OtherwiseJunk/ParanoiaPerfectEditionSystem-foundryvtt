import { socketEventChannel } from "../paranoia.mjs";
export const SkillDraftEvent = {
    START_DRAFT: 'draftStarted',
    UPDATE_DRAFT_STATE: 'draftStateUpdated',
    SELECT_SKILL: `playerSkillSelected`,
    CLOSE_DRAFT: `draftClosed`
}

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
            playersWhoHaveGoneFirst: []
        };

        /**
         * A map to store which stat each skill belongs to.
         * Populated from the data model in _onStartDraft.
         * @type {Object<string, string>} e.g., { athletics: "violence", science: "brains" }
         */
        this.skillToStatMap = {};

        this.socketEventRoot = socketEventChannel;
    }

    /** @override */
    _activateCoreListeners(html) {
        super._activateCoreListeners(html);
        game.socket.on(socketEventChannel, this._onSkillSelected.bind(this));
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
    _calculateAvailableSkills(){
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
    _determineFirstPickForRound(){
        let index = Math.floor(Math.random() * this.state.participants.length)
        while (this.state.playersWhoHaveGoneFirst.includes(index)) {
            index = Math.floor(Math.random() * this.state.participants.length)
        }
        this.state.playersWhoHaveGoneFirst.push(index);
        this.state.currentPlayerIndex = index;
        this.state.nextPlayerIndex = (index + 1) % this.state.participants.length;
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
        this.state.status = "active";

        for (const actorId of this.state.participants) {
            this.state.assignments[actorId] = { "guns": 2 };
        }

        this._retrieveAllDraftableSkills();
        game.socket.emit(socketEventChannel, {"event": SkillDraftEvent.START_DRAFT, "state":this.state});

        this._startNextTurn();
    }

    /**
     * Handles incoming socket messages from players.
     * @param {object} data - The data from the socket.
     * @private
     */
    _onSkillSelected(data) {
        if (!game.user.isGM) return;

        const { actorId, skill, event } = data;
        if(event !== SkillDraftEvent.SELECT_SKILL) return;

        const pickerActor = game.actors.get(actorId);
        const nextActor = game.actors.get(this.state.participants[this.state.nextPlayerIndex]);

        const currentTurnActorId = this.state.participants[this.state.currentPlayerId];
        if (actorId !== currentTurnActorId) {
            return console.warn(`Paranoia | Received skill selection from wrong player. Expected ${currentTurnActorId}, got ${actorId}.`);
        }

        const skillValue = this.state.round;
        this.state.assignments[actorId][skill] = skillValue;

        const nextPlayerActorId = this.state.participants[this.state.nextPlayerIndex];
        this.state.assignments[nextPlayerActorId][skill] = -1 * skillValue;

        messageContent = `<strong>${pickerActor.name}</strong> has selected the skill <strong>${skill}</strong> with a value of ${skillValue}. <strong>${nextActor.name}</strong> has been assigned a value of ${-skillValue} for this skill.`;
        this._sendChatMessage(messageContent);

        this.state.currentPlayerIndex= nextPlayerIndex;
        this.state.nextPlayerIndex = (this.state.nextPlayerIndex + 1) % this.state.participants.length;

        this._startNextTurn();
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
                    actorUpdates[`system.abilities.${statName}.skills.${skillName}.modifier`] = modifier;
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

        game.socket.emit(socketEventChannel, {"event": SkillDraftEvent.CLOSE_DRAFT });
        const message = "Skill draft complete and all changes have been applied!"
        this._sendChatMessage(message);
    };
    /**
     * Starts the next turn by notifying all players of the new state.
     * @private
     */
    _startNextTurn() {
        if (this.state.currentPlayerIndex == this.state.starterIndex){
            this.state.round++;
            this._determineFirstPickForRound();
            this.state.starterIndex = this.state.currentPlayerIndex;            
        }
        if (this.state.round > 5){
            ui.notifications.info("Skill draft is complete! All skill levels have been drafted.");
            this.finalizeDraft();
            return;
        }

        this._calculateAvailableSkills();
        game.socket.emit(socketEventChannel, { "event": SkillDraftEvent.UPDATE_DRAFT_STATE, "state": this.state});
        this.render(true);
    }

    /** @override */
    close(options) {
        game.socket.emit(socketEventChannel, {"event": SkillDraftEvent.CLOSE_DRAFT });
        game.socket.off(socketEventChannel);
        return super.close(options);
    }
}