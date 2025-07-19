import { TreasonCircleApp } from "./TreasonCircleApp.js";
import { SkillDraftController } from "./SkillDraftController.js";
import { getAllPlayerCharacters } from "../utils/foundryUtils.mjs";
import { healthLevelToDescription, flagLevelToDescription } from '../utils/paranoiaUtils.mjs';
import { SystemSettingsKeys } from "../settings/settings.mjs";

export class GMCommandCenter extends Application {
    constructor(options = {}) {
        super(options);
        /**
         * A bound reference to the _onActorUpdate method for correct hook removal.
         * @type {Function}
         * @private
         */
        this._boundOnActorUpdate = this._onActorUpdate.bind(this);
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "paranoia-gm-command-center",
            title: "GM Command Center",
            template: "systems/paranoia/templates/apps/gm-command-center.hbs",
            width: 1000,
            height: "auto",
            resizable: true,
            classes: ["paranoia-app", "gm-command-center"]
        });
    }

    /**
     * @override
     * We override render to check for GM permissions before proceeding.
     */
    render(force, options) {
        if (!game.user.isGM) {
            ui.notifications.error("Only Game Masters can use the GM Command Center.");
            return;
        }
        return super.render(force, options);
    }

    /** @override */
    async getData() {
        const context = super.getData();

        // Get the default values from the data model to check against.
        const defaultData = new CONFIG.Actor.dataModels.troubleshooter();
        const defaultSecrets = defaultData.secrets;

        /**
         * Checks if a given value is either falsy (null, undefined, empty string)
         * or if it matches its initial default value from the data model.
         * @param {string} value The current value of the field.
         * @param {string} initialValue The default value from the data model.
         * @returns {boolean} True if the value is empty or default, false otherwise.
         */
        const isInitialOrEmpty = (value, initialValue) => {
            return !value || value === initialValue;
        };

        context.playerActors = getAllPlayerCharacters().map(actor => {
            // Find the active, non-GM user who owns this character.
            const owner = game.users.find(u => u.character?.id === actor.id && u.active && !u.isGM);
            const healthValue = actor.system.health?.value ?? 0;
            const flagValue = actor.system.flag?.value ?? 0;
            const healthDescription = healthLevelToDescription(healthValue);
            const treasonDescription = flagLevelToDescription(flagValue);
            const moxie = actor.system.moxie;
            const xp = actor.system.xp ?? 0;
            const secrets = actor.system.secrets;
            const mbdIcon = this._calculateMbdIcon(actor.system.mbd);

            return {
                id: actor.id,
                name: actor.name,
                playerName: owner ? owner.name : "Unassigned",
                health: healthValue,
                healthDescription: healthDescription,
                treasonFlags: flagValue,
                treasonDescription: treasonDescription,
                moxie: moxie?.value ?? 0,
                moxieMax: game.settings.get(SystemSettingsKeys.SYSTEM, SystemSettingsKeys.MAXIMUM_MOXIE) ?? 8,
                xp,
                mbd: actor.system.mbd || "None",
                secretSociety: isInitialOrEmpty(secrets.secretSociety, defaultSecrets.secretSociety) ? "None" : secrets.secretSociety,
                mbdIcon,
                mutantPower: secrets.mutantPower || "",
                violenceButton: isInitialOrEmpty(actor.system.violenceButton, defaultData.violenceButton) ? "None" : actor.system.violenceButton,
                treasonButton: isInitialOrEmpty(actor.system.treasonButton, defaultData.treasonButton) ? "None" : actor.system.treasonButton,
            };
        });
        return context;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find('#open-skill-draft').click(() => new SkillDraftController().render(true));
        html.find('#open-treason-circle').click(() => new TreasonCircleApp().render(true));

        html.find('.character-name').click(this._onCharacterNameClick.bind(this));
        html.on('click', '.action-button', this._onActionButtonClick.bind(this));

        // Add hook to listen for actor updates to keep the data fresh
        Hooks.on('updateActor', this._boundOnActorUpdate);

        this._updateColumnWidths();
    }

    /**
     * Dynamically calculates and applies the optimal width for the character column.
     * This is done by setting a CSS custom property (--character-column-width) on the
     * application's root element, which is then used by the SCSS stylesheet.
     * @private
     */
    _updateColumnWidths() {
        if (!this.element || this.element.length === 0) return;

        const characterNameElements = this.element.find('.character-name');
        if (characterNameElements.length === 0) return;

        // Find the longest character name to use as a measuring stick.
        const longestName = Array.from(characterNameElements).reduce((long, el) => {
            const name = el.textContent.trim();
            return name.length > long.length ? name : long;
        }, "");

        if (!longestName) return;

        const sampleElement = characterNameElements[0];
        const computedStyle = window.getComputedStyle(sampleElement);

        const ruler = document.createElement("span");
        ruler.style.font = computedStyle.font;
        ruler.style.visibility = "hidden";
        ruler.style.position = "absolute";
        ruler.style.whiteSpace = "nowrap";
        ruler.innerHTML = longestName;
        document.body.appendChild(ruler);
        const textWidth = ruler.offsetWidth;
        document.body.removeChild(ruler);

        const characterColumnWidth = textWidth + 20; // Add 20px for padding

        // Set the calculated width as a CSS custom property on the application element.
        this.element.css('--character-column-width', `${characterColumnWidth}px`);
    }

    /**
     * Handle clicking on a character's name to open their sheet.
     * @param {Event} event The triggering click event.
     * @private
     */
    _onCharacterNameClick(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const actorId = element.closest('.player-character-entry').dataset.actorId;
        const actor = game.actors.get(actorId);
        if (actor) {
            actor.sheet.render(true);
        }
    }

    /**
     * Handle clicking on an action button for a character.
     * @param {Event} event The triggering click event.
     * @private
     */
    _onActionButtonClick(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const actorId = button.closest('.player-character-entry').dataset.actorId;
        const action = button.dataset.action;
        const actor = game.actors.get(actorId);

        if (!actor) {
            console.error(`Paranoia | Could not find actor with ID ${actorId}`);
            return;
        }

        switch (action) {
            case 'inflict-harm':
                this._onInflictHarm(actor);
                break;
            default:
                console.log(`Paranoia | Action '${action}' triggered for actor '${actorId}'.`);
                ui.notifications.info(`Triggered '${action}' for ${actor.name}.`);
                break;
        }
    }

    /**
     * Displays a dialog for the GM to inflict a specific level of harm on a character.
     * @param {Actor} actor The actor to harm.
     * @private
     */
    async _onInflictHarm(actor) {
        const harmLevels = {
            hurt: { label: "Hurt", hp: 3 },
            injured: { label: "Injured", hp: 2 },
            maimed: { label: "Maimed", hp: 1 }
        };

        const npcs = game.actors.filter(a => !a.hasPlayerOwner);

        const dialogContent = `
            <div class="paranoia-container">
                <div class="form-group">
                    <label>Select Harm Level for ${actor.name}:</label>
                    <select name="harm-level">
                        ${Object.entries(harmLevels).map(([key, { label }]) => `<option value="${key}">${label}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Source of Harm:</label>
                    <select name="harm-source">
                        <option value="computer" selected>Friend Computer</option>
                        ${npcs.map(npc => `<option value="${npc.id}">${npc.name}</option>`).join('')}
                        <option value="other">Other...</option>
                    </select>
                </div>
                <div class="form-group" id="harm-source-other-group" style="display: none;">
                    <label>Custom Source Name:</label>
                    <input type="text" name="harm-source-other" placeholder="e.g., A Vulture squadron"/>
                </div>
                <div class="form-group">
                    <label>Optional Message (describes the action):</label>
                    <textarea name="harm-message" rows="3" placeholder="e.g., The Troubleshooter slips on a banana peel."></textarea>
                </div>
            </div>
        `;

        const d = new Dialog({
            title: `Inflict Harm: ${actor.name}`,
            content: dialogContent,
            buttons: {
                ok: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Apply Harm",
                    callback: async (html) => {
                        const selectedLevelKey = html.find('[name="harm-level"]').val();
                        const currentHP = actor.system.health.value;
                        let targetHP = harmLevels[selectedLevelKey].hp;

                        // If the character is already at this level of harm, they get worse.
                        if (currentHP <= targetHP) {
                            targetHP = currentHP - 1;
                        }

                        // Ensure HP doesn't go below 0.
                        const newHP = Math.max(0, targetHP);

                        await actor.update({ 'system.health.value': newHP });

                        const newHealthDescription = healthLevelToDescription(newHP);
                        const wellnessMessage = `Citizen ${actor.name}'s wellness status has been adjusted. They are now ${newHealthDescription}. This is for their own good.`;
                        ui.notifications.info(`${actor.name} is now ${newHealthDescription}.`);

                        // Determine speaker
                        const harmSource = html.find('[name="harm-source"]').val();
                        const customSource = html.find('[name="harm-source-other"]').val();
                        let speaker;

                        if (harmSource === 'computer') {
                            speaker = ChatMessage.getSpeaker({ alias: "Friend Computer" });
                        } else if (harmSource === 'other') {
                            speaker = ChatMessage.getSpeaker({ alias: customSource || "An unknown entity" });
                        } else {
                            const sourceActor = game.actors.get(harmSource);
                            speaker = ChatMessage.getSpeaker({ actor: sourceActor });
                        }

                        // Construct final message
                        const optionalMessage = html.find('[name="harm-message"]').val();
                        let finalContent = wellnessMessage;
                        if (optionalMessage) {
                            finalContent = `**${optionalMessage}**<br><br>${wellnessMessage}`;
                        }

                        ChatMessage.create({
                            speaker: speaker,
                            content: finalContent
                        });
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel"
                }
            },
            default: "ok",
            render: (html) => {
                const sourceSelect = html.find('[name="harm-source"]');
                const otherGroup = html.find('#harm-source-other-group');
                sourceSelect.on('change', (event) => {
                    if (event.currentTarget.value === 'other') {
                        otherGroup.slideDown(200, () => d.setPosition({ height: "auto" }));
                    } else {
                        otherGroup.slideUp(200, () => d.setPosition({ height: "auto" }));
                    }
                });
            }
        }, {
            classes: ["dialog", "paranoia-app"]
        });
        d.render(true);
    }

    /**
     * Re-renders the command center if a displayed actor is updated.
     * @param {Actor} actor The actor that was updated.
     * @private
     */
    _onActorUpdate(actor) {
        if (!this.rendered) {
            return;
        }

        if (actor.hasPlayerOwner) {
            console.log(`Paranoia | GM Command Center detected update for actor ${actor.name}. Refreshing.`);
            this.render(false);
        }
    }

    /**
     * Determines the Font Awesome icon class for a given Mandatory Bonus Duty.
     * @param {string} mbd The raw MBD string from the actor.
     * @returns {string} The corresponding Font Awesome icon class.
     * @private
     */
    _calculateMbdIcon(mbd) {
        if (!mbd) return 'fas fa-question-circle';

        const sanitizedMBD = mbd.toLowerCase().replace(/\s/g, '');

        // Using a switch(true) pattern allows for flexible `includes` checks,
        // maintaining tolerance for user input while using a switch structure.
        switch (true) {
            case sanitizedMBD.includes('teamleader'):
                return 'fas fa-user-crown';
            case sanitizedMBD.includes('equipment'):
                return 'fas fa-wrench';
            case sanitizedMBD.includes('hygiene'):
                return 'fas fa-shower';
            case sanitizedMBD.includes('happiness'):
                return 'fas fa-smile';
            case sanitizedMBD.includes('loyalty'):
                return 'fas fa-balance-scale';
            case sanitizedMBD.includes('media'):
                return 'fas fa-video';
            default:
                return 'fas fa-question-circle';
        }
    }

    /** @override */
    async close(options) {
        // Remove the actor update hook to prevent memory leaks
        Hooks.off('updateActor', this._boundOnActorUpdate);

        return super.close(options);
    }
}