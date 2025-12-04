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
            title: game.i18n.localize("PARANOIA.GM.CommandCenter.Title"),
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
            ui.notifications.error(game.i18n.localize("PARANOIA.GM.CommandCenter.GMOnlyError"));
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
                playerName: owner ? owner.name : game.i18n.localize("PARANOIA.GM.CommandCenter.Unassigned"),
                health: healthValue,
                healthDescription: healthDescription,
                treasonFlags: flagValue,
                treasonDescription: treasonDescription,
                moxie: moxie?.value ?? 0,
                moxieMax: game.settings.get(SystemSettingsKeys.SYSTEM, SystemSettingsKeys.MAXIMUM_MOXIE) ?? 8,
                xp,
                mbd: actor.system.mbd || "None",
                secretSociety: isInitialOrEmpty(secrets.secretSociety, defaultSecrets.secretSociety) ? game.i18n.localize("PARANOIA.None") : secrets.secretSociety,
                mbdIcon,
                mutantPower: isInitialOrEmpty(secrets.mutantPower, defaultData.secrets.mutantPower) ? "" : secrets.mutantPower,
                violenceButton: isInitialOrEmpty(actor.system.violenceButton, defaultData.violenceButton) ? game.i18n.localize("PARANOIA.None") : actor.system.violenceButton,
                treasonButton: isInitialOrEmpty(actor.system.treasonButton, defaultData.treasonButton) ? game.i18n.localize("PARANOIA.None") : actor.system.treasonButton,
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
            case 'give-treason-star':
                this._onGiveTreasonStar(actor);
                break;
            case 'kill-player':
                this._onKillPlayer(actor);
                break;
            case 'give-xp':
                this._onModifyXP(actor, 1);
                break;
            case 'deduct-xp':
                this._onModifyXP(actor, -1);
                break;
            case 'give-moxie':
                this._onModifyMoxie(actor, 1);
                break;
            case 'deduct-moxie':
                this._onModifyMoxie(actor, -1);
                break;
            default:
                console.log(`Paranoia | Action '${action}' triggered for actor '${actorId}'.`);
                ui.notifications.info(game.i18n.format("PARANOIA.GM.CommandCenter.ActionTriggered", { action: action, name: actor.name }));
                break;
        }
    }

    /**
     * Generates the HTML for a source selector dropdown, including an "Other..." option.
     * @param {string} prefix - The prefix for name attributes (e.g., 'harm', 'treason').
     * @param {string} label - The label for the dropdown (e.g., 'Source of Harm').
     * @param {string} placeholder - The placeholder text for the custom source input.
     * @param {Array<Actor>} npcs - A list of NPC actors to populate the dropdown.
     * @returns {string} The generated HTML string.
     * @private
     */
    _createSourceSelectorHtml(prefix, label, placeholder, npcs) {
        return `
            <div class="form-group">
                <label>${label}:</label>
                <select name="${prefix}-source">
                    <option value="computer" selected>${game.i18n.localize("PARANOIA.FriendComputer")}</option>
                    ${npcs.map(npc => `<option value="${npc.id}">${npc.name}</option>`).join('')}
                    <option value="other">${game.i18n.localize("PARANOIA.Other")}</option>
                </select>
            </div>
            <div class="form-group" id="${prefix}-source-other-group" style="display: none;">
                <label>${game.i18n.localize("PARANOIA.GM.CommandCenter.CustomSourceName")}</label>
                <input type="text" name="${prefix}-source-other" placeholder="${placeholder}"/>
            </div>
        `;
    }

    /**
     * Activates the listener for a source selector dropdown to show/hide the custom input.
     * @param {jQuery} html - The jQuery-wrapped HTML of the dialog.
     * @param {Dialog} dialog - The Dialog instance.
     * @param {string} prefix - The prefix used for the element names and IDs.
     * @private
     */
    _activateSourceSelectorListener(html, dialog, prefix) {
        const sourceSelect = html.find(`[name="${prefix}-source"]`);
        const otherGroup = html.find(`#${prefix}-source-other-group`);
        sourceSelect.on('change', (event) => {
            if (event.currentTarget.value === 'other') {
                otherGroup.slideDown(200, () => dialog.setPosition({ height: "auto" }));
            } else {
                otherGroup.slideUp(200, () => dialog.setPosition({ height: "auto" }));
            }
        });
    }

    /**
     * Determines the speaker for a chat message based on form data from a source selector.
     * @param {jQuery} html - The jQuery-wrapped HTML of the dialog.
     * @param {string} prefix - The prefix used for the element names.
     * @returns {object} The speaker data object for a ChatMessage.
     * @private
     */
    _getSpeakerFromForm(html, prefix) {
        const source = html.find(`[name="${prefix}-source"]`).val();
        const customSource = html.find(`[name="${prefix}-source-other"]`).val();

        if (source === 'computer') {
            return ChatMessage.getSpeaker({ alias: game.i18n.localize("PARANOIA.FriendComputer") });
        } else if (source === 'other') {
            return ChatMessage.getSpeaker({ alias: customSource || game.i18n.localize("PARANOIA.GM.CommandCenter.UnknownEntity") });
        } else {
            const sourceActor = game.actors.get(source);
            return ChatMessage.getSpeaker({ actor: sourceActor });
        }
    }

    /**
     * Generates the HTML for an optional message textarea.
     * @param {string} prefix - The prefix for the name attribute (e.g., 'harm', 'kill').
     * @param {string} label - The label for the textarea.
     * @param {string} placeholder - The placeholder text for the textarea.
     * @returns {string} The generated HTML string.
     * @private
     */
    _createOptionalMessageHtml(prefix, label, placeholder) {
        return `
            <div class="form-group">
                <label>${label}</label>
                <textarea name="${prefix}-message" rows="3" placeholder="${placeholder}"></textarea>
            </div>
        `;
    }

    /**
     * Generates the HTML for a private message checkbox.
     * @param {string} prefix - The prefix for the name attribute (e.g., 'harm', 'kill').
     * @param {string} label - The label for the checkbox.
     * @returns {string} The generated HTML string.
     * @private
     */
    _createPrivateCheckboxHtml(prefix, label) {
        return `
            <div class="form-group">
                <label>${label}</label>
                <input type="checkbox" name="${prefix}-private" />
                <span class="hint">${game.i18n.localize("PARANOIA.GM.CommandCenter.PrivateHint")}</span>
            </div>
        `;
    }

    /**
     * Generates the HTML for a numeric amount input.
     * @param {string} prefix - The prefix for the name attribute (e.g., 'xp', 'moxie').
     * @param {string} label - The label for the input.
     * @returns {string} The generated HTML string.
     * @private
     */
    _createAmountInputHtml(prefix, label) {
        return `
            <div class="form-group">
                <label>${label}</label>
                <input type="number" name="${prefix}-amount" value="1" min="1" style="max-width: 100px; text-align: center;" />
            </div>
        `;
    }

    /**
     * Generates the HTML for a level selection dropdown.
     * @param {string} prefix - The prefix for the name attribute (e.g., 'harm', 'treason').
     * @param {string} label - The label for the dropdown.
     * @param {object} levels - An object where keys are values and values have a `label` property.
     * @returns {string} The generated HTML string.
     * @private
     */
    _createLevelSelectorHtml(prefix, label, levels) {
        return `
            <div class="form-group">
                <label>${label}</label>
                <select name="${prefix}-level">
                    ${Object.entries(levels).map(([key, { label }]) => `<option value="${key}">${label}</option>`).join('')}
                </select>
            </div>
        `;
    }

    /**
     * Creates and sends a chat message, handling whisper logic if required.
     * @param {Actor} actor The target actor, used to find the recipient for whispers.
     * @param {object} chatData The base data for the ChatMessage.
     * @param {boolean} isPrivate If true, the message will be whispered to the GM and the actor's owner.
     * @private
     */
    async _createChatMessage(actor, chatData, isPrivate) {
        if (isPrivate) {
            const playerUser = game.users.find(u => u.character?.id === actor.id);
            const recipients = [game.user.id]; // Always include the GM
            if (playerUser) {
                recipients.push(playerUser.id);
            }
            chatData.whisper = recipients;
        }
        return ChatMessage.create(chatData);
    }

    /**
     * Displays a dialog for the GM to give a treason star to a character.
     * @param {Actor} actor The actor to give a treason star to.
     * @private
     */
    async _onGiveTreasonStar(actor) {
        const treasonLevels = {
            greylisted: { label: game.i18n.localize("PARANOIA.TreasonLevel.Greylisted"), value: 1 },
            restricted: { label: game.i18n.localize("PARANOIA.TreasonLevel.Restricted"), value: 2 },
            citizenOfInterest: { label: game.i18n.localize("PARANOIA.TreasonLevel.CitizenOfInterest"), value: 3 },
            wanted: { label: game.i18n.localize("PARANOIA.TreasonLevel.Wanted"), value: 4 }
        };

        const npcs = game.actors.filter(a => !a.hasPlayerOwner);
        const sourceSelectorHtml = this._createSourceSelectorHtml('treason', game.i18n.localize("PARANOIA.GM.CommandCenter.SourceOfTreasonStar"), game.i18n.localize("PARANOIA.GM.CommandCenter.SourceOfTreasonStarPlaceholder"), npcs);
        const levelSelectorHtml = this._createLevelSelectorHtml('treason', game.i18n.format("PARANOIA.GM.CommandCenter.SelectTreasonLevelFor", { name: actor.name }), treasonLevels);

        const dialogContent = `
            <div class="paranoia-container">
                ${levelSelectorHtml}
                ${sourceSelectorHtml}
            </div>
        `;

        const d = new Dialog({
            title: game.i18n.format("PARANOIA.GM.CommandCenter.GiveTreasonStarTitle", { name: actor.name }),
            content: dialogContent,
            buttons: {
                ok: {
                    icon: '<i class="fas fa-star"></i>',
                    label: game.i18n.localize("PARANOIA.GM.CommandCenter.GiveStarButton"),
                    callback: async (html) => {
                        const selectedLevelKey = html.find('[name="treason-level"]').val();
                        const selectedFlagValue = treasonLevels[selectedLevelKey].value;
                        const currentFlagValue = actor.system.flag.value;

                        const newFlagValue = Math.min(4, (currentFlagValue >= selectedFlagValue) ? currentFlagValue + 1 : selectedFlagValue);

                        await actor.update({ 'system.flag.value': newFlagValue });

                        const newTreasonDescription = flagLevelToDescription(newFlagValue);
                        const treasonMessage = game.i18n.format("PARANOIA.GM.CommandCenter.TreasonStarGranted", { name: actor.name, description: newTreasonDescription });
                        ui.notifications.info(game.i18n.format("PARANOIA.GM.CommandCenter.TreasonStarGrantedNotification", { name: actor.name, description: newTreasonDescription }));

                        const speaker = this._getSpeakerFromForm(html, 'treason');
                        this._createChatMessage(actor, { speaker, content: treasonMessage }, false);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("PARANOIA.GM.CommandCenter.CancelButton")
                }
            },
            default: "ok",
            render: (html) => {
                this._activateSourceSelectorListener(html, d, 'treason');
            }
        }, {
            classes: ["dialog", "paranoia-app"]
        });
        d.render(true);
    }

    /**
     * Displays a dialog for the GM to inflict a specific level of harm on a character.
     * @param {Actor} actor The actor to harm.
     * @private
     */
    async _onInflictHarm(actor) {
        const harmLevels = {
            hurt: { label: game.i18n.localize("PARANOIA.HarmLevel.Hurt"), hp: 3 },
            injured: { label: game.i18n.localize("PARANOIA.HarmLevel.Injured"), hp: 2 },
            maimed: { label: game.i18n.localize("PARANOIA.HarmLevel.Maimed"), hp: 1 }
        };

        const npcs = game.actors.filter(a => !a.hasPlayerOwner);
        const sourceSelectorHtml = this._createSourceSelectorHtml('harm', game.i18n.localize("PARANOIA.GM.CommandCenter.SourceOfHarm"), game.i18n.localize("PARANOIA.GM.CommandCenter.SourceOfHarmPlaceholder"), npcs);
        const optionalMessageHtml = this._createOptionalMessageHtml('harm', game.i18n.localize("PARANOIA.GM.CommandCenter.OptionalMessage"), game.i18n.localize("PARANOIA.GM.CommandCenter.OptionalMessagePlaceholder"));
        const privateCheckboxHtml = this._createPrivateCheckboxHtml('harm', game.i18n.localize("PARANOIA.GM.CommandCenter.PrivateMessage"));
        const levelSelectorHtml = this._createLevelSelectorHtml('harm', game.i18n.format("PARANOIA.GM.CommandCenter.SelectHarmLevelFor", { name: actor.name }), harmLevels);

        const dialogContent = `
            <div class="paranoia-container">
                ${levelSelectorHtml}
                ${sourceSelectorHtml}
                ${optionalMessageHtml}
                ${privateCheckboxHtml}
            </div>
        `;

        const d = new Dialog({
            title: game.i18n.format("PARANOIA.GM.CommandCenter.InflictHarmTitle", { name: actor.name }),
            content: dialogContent,
            buttons: {
                ok: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("PARANOIA.GM.CommandCenter.ApplyHarmButton"),
                    callback: async (html) => {
                        const selectedLevelKey = html.find('[name="harm-level"]').val();
                        const currentHP = actor.system.health.value;
                        let targetHP = harmLevels[selectedLevelKey].hp;

                        if (currentHP <= targetHP) {
                            targetHP = currentHP - 1;
                        }

                        const newHP = Math.max(0, targetHP);

                        await actor.update({ 'system.health.value': newHP });

                        const newHealthDescription = healthLevelToDescription(newHP);
                        const wellnessMessage = game.i18n.format("PARANOIA.GM.CommandCenter.InjurySuffered", { name: actor.name, description: newHealthDescription });
                        ui.notifications.info(game.i18n.format("PARANOIA.GM.CommandCenter.InjurySufferedNotification", { name: actor.name, description: newHealthDescription }));

                        const speaker = this._getSpeakerFromForm(html, 'harm');

                        const optionalMessage = html.find('[name="harm-message"]').val();
                        let flavor = optionalMessage;

                        const chatData = {
                            speaker: speaker,
                            content: wellnessMessage,
                            flavor: flavor
                        };

                        const isPrivate = html.find('[name="harm-private"]').is(':checked');
                        this._createChatMessage(actor, chatData, isPrivate);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("PARANOIA.GM.CommandCenter.CancelButton")
                }
            },
            default: "ok",
            render: (html) => {
                this._activateSourceSelectorListener(html, d, 'harm');
            }
        }, {
            classes: ["dialog", "paranoia-app"]
        });
        d.render(true);
    }

    /**
     * Displays a dialog for the GM to kill a character and process their next clone.
     * @param {Actor} actor The actor to kill.
     * @private
     */
    async _onKillPlayer(actor) {
        const npcs = game.actors.filter(a => !a.hasPlayerOwner);
        const sourceSelectorHtml = this._createSourceSelectorHtml('kill', game.i18n.localize("PARANOIA.GM.CommandCenter.SourceOfTermination"), game.i18n.localize("PARANOIA.GM.CommandCenter.SourceOfTerminationPlaceholder"), npcs);
        const optionalMessageHtml = this._createOptionalMessageHtml('kill', game.i18n.localize("PARANOIA.GM.CommandCenter.OptionalTerminationReport"), game.i18n.localize("PARANOIA.GM.CommandCenter.OptionalTerminationReportPlaceholder"));
        const privateCheckboxHtml = this._createPrivateCheckboxHtml('kill', game.i18n.localize("PARANOIA.GM.CommandCenter.PrivateReport"));

        const dialogContent = `
            <div class="paranoia-container">
                <p>${game.i18n.format("PARANOIA.GM.CommandCenter.TerminationConfirmation", { name: actor.name, xp: game.i18n.localize("PARANOIA.XP"), moxie: game.i18n.localize("PARANOIA.Moxie") })}</p>
                <hr>
                ${sourceSelectorHtml}
                ${optionalMessageHtml}
                ${privateCheckboxHtml}
            </div>
        `;

        const d = new Dialog({
            title: game.i18n.format("PARANOIA.GM.CommandCenter.TerminateTroubleshooterTitle", { name: actor.name }),
            content: dialogContent,
            buttons: {
                terminate: {
                    icon: '<i class="fas fa-skull-crossbones"></i>',
                    label: game.i18n.localize("PARANOIA.GM.CommandCenter.TerminateButton"),
                    callback: async (html) => {
                        const currentName = actor.name;
                        const cloneRegex = /^(.*)-(\d+)$/;
                        const match = currentName.match(cloneRegex);

                        let newName;
                        if (match) {
                            const baseName = match[1];
                            const currentCloneNumber = parseInt(match[2], 10);
                            newName = `${baseName}-${currentCloneNumber + 1}`;
                        } else {
                            newName = `${currentName}-2`;
                        }

                        const updates = {
                            'name': newName,
                            'system.health.value': 4,
                            'system.moxie.value': 4,
                            'system.flag.value': 0
                        };
                        await actor.update(updates);

                        const speaker = this._getSpeakerFromForm(html, 'kill');
                        const optionalMessage = html.find('[name="kill-message"]').val();
                        const terminationMessage = game.i18n.format("PARANOIA.GM.CommandCenter.TerminationMessage", { currentName, newName });

                        ui.notifications.info(terminationMessage);

                        const chatData = {
                            speaker: speaker,
                            content: terminationMessage,
                            flavor: optionalMessage
                        };

                        const isPrivate = html.find('[name="kill-private"]').is(':checked');
                        this._createChatMessage(actor, chatData, isPrivate);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("PARANOIA.GM.CommandCenter.GrantReprieveButton")
                }
            },
            default: "terminate",
            render: (html) => {
                this._activateSourceSelectorListener(html, d, 'kill');
            }
        }, {
            classes: ["dialog", "paranoia-app"]
        });
        d.render(true);
    }

    /**
     * Displays a dialog for the GM to give or deduct XP from a character.
     * @param {Actor} actor The actor to modify.
     * @param {number} multiplier 1 to give XP, -1 to deduct XP.
     * @private
     */
    async _onModifyXP(actor, multiplier) {
        const isGiving = multiplier > 0;
        const title = isGiving ? game.i18n.format("PARANOIA.GM.CommandCenter.GiveXPTitle", { name: actor.name }) : game.i18n.format("PARANOIA.GM.CommandCenter.DeductXPTitle", { name: actor.name });
        const buttonLabel = isGiving ? game.i18n.localize("PARANOIA.GM.CommandCenter.GrantXPButton") : game.i18n.localize("PARANOIA.GM.CommandCenter.DeductXPButton");
        const verb = isGiving ? "gets" : "loses";
        const prefix = 'xp';

        const npcs = game.actors.filter(a => !a.hasPlayerOwner);
        const sourceSelectorHtml = this._createSourceSelectorHtml(prefix, game.i18n.localize("PARANOIA.GM.CommandCenter.Source"), game.i18n.localize("PARANOIA.GM.CommandCenter.SourcePlaceholder"), npcs);
        const optionalMessageHtml = this._createOptionalMessageHtml(prefix, game.i18n.localize("PARANOIA.GM.CommandCenter.OptionalMessageLabel"), game.i18n.localize("PARANOIA.GM.CommandCenter.OptionalMessageXPPlaceholder"));
        const privateCheckboxHtml = this._createPrivateCheckboxHtml(prefix, game.i18n.localize("PARANOIA.GM.CommandCenter.PrivateMessage"));
        const amountInputHtml = this._createAmountInputHtml(prefix, game.i18n.localize("PARANOIA.GM.CommandCenter.Amount"));

        const dialogContent = `
            <div class="paranoia-container">
                ${amountInputHtml}
                ${sourceSelectorHtml}
                ${optionalMessageHtml}
                ${privateCheckboxHtml}
            </div>
        `;

        const d = new Dialog({
            title: title,
            content: dialogContent,
            buttons: {
                ok: {
                    icon: isGiving ? '<i class="fas fa-plus-circle"></i>' : '<i class="fas fa-minus-circle"></i>',
                    label: buttonLabel,
                    callback: async (html) => {
                        const amount = parseInt(html.find('[name="xp-amount"]').val(), 10) || 0;
                        if (amount <= 0) return;

                        const currentXP = actor.system.xp ?? 0;
                        const changeAmount = amount * multiplier;
                        let targetXP = currentXP + changeAmount;

                        const allowNegativeXP = game.settings.get(SystemSettingsKeys.SYSTEM, SystemSettingsKeys.ALLOW_NEGATIVE_XP);
                        if (!allowNegativeXP) {
                            targetXP = Math.max(0, targetXP);
                        }

                        const actualChange = targetXP - currentXP;

                        if (actualChange === 0 && amount > 0) {
                            ui.notifications.warn(game.i18n.format("PARANOIA.GM.CommandCenter.XPCannotBeReduced", { name: actor.name }));
                            return;
                        }

                        await actor.update({ 'system.xp': targetXP });

                        const speaker = this._getSpeakerFromForm(html, prefix);
                        const optionalMessage = html.find(`[name="${prefix}-message"]`).val();

                        const changeAmountForMessage = Math.abs(actualChange);
                        const localVerb = actualChange >= 0 ? "gets" : "loses";
                        let content = game.i18n.format("PARANOIA.GM.CommandCenter.XPChangeMessage", { name: actor.name, verb: localVerb, amount: changeAmountForMessage });
                        if (optionalMessage) {
                            content = game.i18n.format("PARANOIA.GM.CommandCenter.XPChangeMessageWithNote", { name: actor.name, verb: localVerb, amount: changeAmountForMessage, message: optionalMessage });
                        }

                        ui.notifications.info(content);

                        const isPrivate = html.find(`[name="${prefix}-private"]`).is(':checked');
                        this._createChatMessage(actor, { speaker, content }, isPrivate);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("PARANOIA.GM.CommandCenter.CancelButton")
                }
            },
            default: "ok",
            render: (html) => {
                this._activateSourceSelectorListener(html, d, prefix);
            }
        }, {
            classes: ["dialog", "paranoia-app"]
        });
        d.render(true);
    }

    /**
     * Displays a dialog for the GM to give or deduct Moxie from a character.
     * @param {Actor} actor The actor to modify.
     * @param {number} multiplier 1 to give Moxie, -1 to deduct Moxie.
     * @private
     */
    async _onModifyMoxie(actor, multiplier) {
        const isGiving = multiplier > 0;
        const title = isGiving ? game.i18n.format("PARANOIA.GM.CommandCenter.GiveMoxieTitle", { name: actor.name }) : game.i18n.format("PARANOIA.GM.CommandCenter.DeductMoxieTitle", { name: actor.name });
        const buttonLabel = isGiving ? game.i18n.localize("PARANOIA.GM.CommandCenter.GrantMoxieButton") : game.i18n.localize("PARANOIA.GM.CommandCenter.DeductMoxieButton");
        const prefix = 'moxie';

        const optionalMessageHtml = this._createOptionalMessageHtml(prefix, game.i18n.localize("PARANOIA.GM.CommandCenter.OptionalMessageLabel"), game.i18n.localize("PARANOIA.GM.CommandCenter.OptionalMoxieMessagePlaceholder"));
        const privateCheckboxHtml = this._createPrivateCheckboxHtml(prefix, game.i18n.localize("PARANOIA.GM.CommandCenter.PrivateMessage"));
        const amountInputHtml = this._createAmountInputHtml(prefix, game.i18n.localize("PARANOIA.GM.CommandCenter.Amount"));

        const dialogContent = `
            <div class="paranoia-container">
                ${amountInputHtml}
                ${optionalMessageHtml}
                ${privateCheckboxHtml}
            </div>
        `;

        new Dialog({
            title: title,
            content: dialogContent,
            buttons: {
                ok: {
                    icon: isGiving ? '<i class="fas fa-plus-circle"></i>' : '<i class="fas fa-minus-circle"></i>',
                    label: buttonLabel,
                    callback: async (html) => {
                        const amount = parseInt(html.find('[name="moxie-amount"]').val(), 10) || 0;
                        if (amount <= 0) return;

                        const currentMoxie = actor.system.moxie.value ?? 0;
                        const maxMoxie = game.settings.get(SystemSettingsKeys.SYSTEM, SystemSettingsKeys.MAXIMUM_MOXIE) ?? 8;

                        const targetMoxie = currentMoxie + (amount * multiplier);
                        const newMoxie = Math.max(0, Math.min(targetMoxie, maxMoxie));
                        const actualChange = newMoxie - currentMoxie;

                        if (actualChange === 0) {
                            ui.notifications.warn(game.i18n.format("PARANOIA.GM.CommandCenter.MoxieAtMinMax", { name: actor.name, limit: (isGiving ? 'maximum' : 'minimum') }));
                            return;
                        }

                        await actor.update({ 'system.moxie.value': newMoxie });

                        const verb = actualChange > 0 ? "gets" : "loses";
                        const changeAmountForMessage = Math.abs(actualChange);
                        const content = game.i18n.format("PARANOIA.GM.CommandCenter.MoxieChangeMessage", { name: actor.name, verb, amount: changeAmountForMessage });
                        const flavor = html.find(`[name="${prefix}-message"]`).val();

                        ui.notifications.info(content);

                        const speaker = ChatMessage.getSpeaker({ alias: game.i18n.localize("PARANOIA.Gamemaster") });
                        const isPrivate = html.find(`[name="${prefix}-private"]`).is(':checked');
                        this._createChatMessage(actor, { speaker, content, flavor }, isPrivate);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("PARANOIA.GM.CommandCenter.CancelButton")
                }
            },
            default: "ok"
        }, { classes: ["dialog", "paranoia-app"] }).render(true);
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
     *
     * Note: This is super fragile and basically only works if the user:
     * 1) spells an mbd incorrectly
     * 2) uses non-english terms.
     * TODO: Make it not that?
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
        Hooks.off('updateActor', this._boundOnActorUpdate);

        return super.close(options);
    }
}
