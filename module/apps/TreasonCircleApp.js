/**
 * A GM-only application for creating and distributing a Paranoia Treason Circle.
 * @extends {FormApplication}
 */
export class TreasonCircleApp extends FormApplication {

    constructor(options = {}) {
        super(options);
        this._firstRender = true;
        this.allPlayerCharacters = [];
        this.circleEntries = [];
    }

    /**
    * Internal counter for unique row IDs.
    * @private
    */
    _nextRowId = 0;

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "paranoia-treason-circle-architect",
            title: "Treason Circle Architect",
            template: "systems/paranoia/templates/apps/treason-circle-sheet.hbs",
            width: 720,
            height: 720,
            resizable: true,
            submitOnChange: false,
            submitOnClose: false,
            classes: ["paranoia", "treason-circle"]
        });
    }

    /**
     * @override
     * We override render to check for GM permissions before proceeding.
     * This prevents the application from being rendered for non-GM users.
     */
    render(force, options) {
        if (!game.user.isGM) {
            ui.notifications.error("Only Game Masters can use the Treason Circle Architect.");
            return;
        }
        return super.render(force, options);
    }

    /**
 * @override
 * We override _render to force a reposition on the first draw.
 * This solves a Foundry VTT quirk where windows with dynamic content
 * can sometimes render in the top-left corner initially before snapping
 * to the center on a resize.
 */
    async _render(force, options) {
        await super._render(force, options);

        if (this._firstRender) {
            this.setPosition();
            this._firstRender = false;
        }
    }

    /**
     * Prepare the data for the template.
     * It fetches all non-GM users who have an assigned character.
     * @override
     */
    async getData() {
        this.allPlayerCharacters = game.actors.filter(a => a.hasPlayerOwner);
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.add-row-button').click(this._onAddRow.bind(this));

        html.on('click', '.remove-row-button', this._onRemoveRow.bind(this));

        if (this.element.find('.treason-entry').length === 0) {
            this._onAddRow();
        }
    }

    /**
     * Handles adding a new treason circle entry row.
     * @private
     */
    _onAddRow() {
        const rowContainer = this.element.find('.treason-entries-container');
        const newRowId = this._nextRowId++;

        const newRowHtml = `
      <div class="treason-entry" data-row-id="${newRowId}">
          <div class="form-group"><label>Character</label><select name="character-${newRowId}">${this.allPlayerCharacters.map(char => `<option value="${char.id}">${char.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>Culpable Act</label><textarea name="culpable-act-${newRowId}" rows="2" placeholder="e.g., Screwed up the navigation data..."></textarea></div>
          <div class="form-group"><label>Suspects</label><select name="suspect-${newRowId}">${this.allPlayerCharacters.map(char => `<option value="${char.id}">${char.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>How They Know</label><textarea name="how-they-know-${newRowId}" rows="2" placeholder="e.g., 'You think they saw you do it', or 'They saw the device was working before you had it'. "></textarea></div>
          <button type="button" class="remove-row-button"><i class="fas fa-trash"></i> Remove</button>
      </div>
    `;
        rowContainer.append(newRowHtml);
    }

    async _updateObject(event, formData) {
        const { big_treason } = formData;

        if (!big_treason) {
            return ui.notifications.error("The 'Primary Treasonous Act' cannot be empty.");
        }

        const treasonCircleData = {};
        for (const key in formData) {
            if (key.startsWith('character-')) {
                const id = key.split('-')[1];
                treasonCircleData[id] = treasonCircleData[id] || {};
                treasonCircleData[id].characterId = formData[key];
            } else if (key.startsWith('culpable-act-')) {
                const id = key.split('-')[2];
                treasonCircleData[id] = treasonCircleData[id] || {};
                treasonCircleData[id].culpableAct = formData[key];
            } else if (key.startsWith('suspect-')) {
                const id = key.split('-')[1];
                treasonCircleData[id] = treasonCircleData[id] || {};
                treasonCircleData[id].suspectId = formData[key];
            } else if (key.startsWith('how-they-know-')) {
                const id = key.split('-')[3];
                treasonCircleData[id] = treasonCircleData[id] || {};
                treasonCircleData[id].howTheyKnow = formData[key];
            }
        }

        const entries = Object.values(treasonCircleData);

        if (entries.length === 0) {
            return ui.notifications.warn("No treason circle entries defined. Please add at least one.");
        }

        let whispersSent = 0;

        for (const entry of entries) {
            const character = game.actors.get(entry.characterId);
            const suspect = game.actors.get(entry.suspectId);
            const howTheyKnow = entry.howTheyKnow || "";

            if (!character || !suspect || !entry.culpableAct) {
                console.warn(`Paranoia | Skipping whisper for incomplete entry:`, entry);
                continue;
            }

            const playerUser = game.users.find(u => u.character?.id === character.id);
            if (!playerUser) {
                ui.notifications.warn(`No player found for character ${character.name}. Skipping whisper.`);
                continue;
            }

            const whisperContent = `
        <div class="paranoia-whisper">
          <h2><i class="fas fa-user-secret"></i> TREASON ALERT</h2>
          <p><strong>You were a party to Treason!</strong></p>
          <hr>
          <h3>Primary Treasonous Act</h3>
          <p><em>${big_treason}</em></p>
          <h3>Your Culpable Action (Level: TREASON)</h3>
          <p>${entry.culpableAct}</p>
          <h3>Who you suspect is aware: </h3>
          <p>
            You have reason to believe <strong>${suspect.name}</strong> knows about your involvement.
            ${howTheyKnow}
          </p>
          <hr>
          <p><em>Stay alert. Trust no one. Keep your laser handy.</em></p>
        </div>
      `;

            ChatMessage.create({
                user: game.user.id,
                content: whisperContent,
                whisper: [playerUser.id]
            });

            whispersSent++;
        }

        if (whispersSent > 0) {
            ui.notifications.info(`${whispersSent} Treason Circle whispers have been sent.`);
        } else {
            ui.notifications.error("No whispers were sent. Please ensure all fields are filled out correctly and characters have assigned players.");
        }
    }

    /**
    * Handles removing a treason circle entry row.
    * @param {Event} event - The click event.
    * @private
    */
    _onRemoveRow(event) {
        const row = $(event.currentTarget).closest('.treason-entry');
        row.remove();
    }
}
