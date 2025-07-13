import { TreasonCircleApp } from "./TreasonCircleApp.js";
import { SkillDraftController } from "./SkillDraftController.js";
import { getAllPlayerCharacters } from "../utils/foundryUtils.mjs";
import { healthLevelToDescription, flagLevelToDescription } from '../utils/paranoiaUtils.mjs';
import { SystemSettingsKeys } from "../settings/settings.mjs";

export class GMCommandCenter extends Application {
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "paranoia-gm-command-center",
            title: "GM Command Center",
            template: "systems/paranoia/templates/apps/gm-command-center.hbs",
            width: 1000,
            height: "auto",
            resizable: true,
            classes: ["paranoia", "gm-command-center"]
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
            const secrets = actor.system.secrets;

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
                mutantPower: isInitialOrEmpty(secrets.mutantPower, defaultSecrets.mutantPower) ? "None" : secrets.mutantPower,
                secretSociety: isInitialOrEmpty(secrets.secretSociety, defaultSecrets.secretSociety) ? "None" : secrets.secretSociety,
                mandatoryBonusDuty: isInitialOrEmpty(actor.system.mbd, defaultData.mbd) ? "None" : actor.system.mbd,
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

        // Add listener for clicking on a character name
        html.find('.character-name').click(this._onCharacterNameClick.bind(this));

        this._updateColumnWidths();
    }

    /**
     * Dynamically calculates and applies the optimal width for the character column.
     * This makes the layout more efficient by not overallocating space.
     * @private
     */
    async _updateColumnWidths() {
        const context = await this.getData();
        const playerActors = context.playerActors;

        if (!playerActors || playerActors.length === 0) return;

        // Find the longest character name to use as a measuring stick.
        const longestName = playerActors.reduce((long, actor) => {
            return actor.name.length > long.length ? actor.name : long;
        }, "");

        if (!longestName) return;

        // Use a "ruler" to measure the text width in pixels.
        const ruler = document.createElement("span");
        // The font must match the element we are measuring.
        ruler.style.font = "12px 'Roboto', sans-serif";
        ruler.style.visibility = "hidden";
        ruler.style.position = "absolute";
        ruler.style.whiteSpace = "nowrap";
        // Add the icon to the measurement for accuracy.
        ruler.innerHTML = `<i class="fas fa-user"></i> ${longestName}`;
        document.body.appendChild(ruler);

        const textWidth = ruler.offsetWidth;
        document.body.removeChild(ruler);

        const characterColumnWidth = textWidth + 20; // Add 20px for padding

        // Inject a style tag to apply this dynamic width.
        const styleId = `gm-cc-style-${this.appId}`;
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        const cssRule = `
            .app[data-appid="${this.appId}"] .player-character-header,
            .app[data-appid="${this.appId}"] .player-character-entry {
                grid-template-columns: ${characterColumnWidth}px 80px 80px 2fr 1.5fr 1fr;
            }
        `;
        styleEl.innerHTML = cssRule;
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

    /** @override */
    async close(options) {
        const styleEl = document.getElementById(`gm-cc-style-${this.appId}`);
        if (styleEl) {
            styleEl.remove();
        }
        return super.close(options);
    }
}