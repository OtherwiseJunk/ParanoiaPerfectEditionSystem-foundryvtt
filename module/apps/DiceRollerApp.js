import { calculateNODE, generateRollString, computerDiceAttractsAttention } from "../utils/roll-logic.mjs";

/**
 * A standalone dice roller modal for Paranoia troubleshooters.
 * Extracted from the character sheet into its own FormApplication.
 * @extends {FormApplication}
 */
export class DiceRollerApp extends FormApplication {
  constructor(actor, {selectedStat = null, selectedSkill = null, ...options} = {}) {
    super(options);
    this.actor = actor;
    this.selectedStat = selectedStat;
    this.selectedSkill = selectedSkill;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "paranoia-dice-roller",
      title: "Infrared Clearance Dice Roller",
      template: "systems/paranoia/templates/apps/dice-roller.hbs",
      width: 420,
      height: "auto",
      resizable: false,
      classes: ["paranoia", "dice-roller-app"],
      closeOnSubmit: false,
    });
  }

  /** @override */
  async getData() {
    const rollData = this.actor.getRollData();
    const abilities = this.actor.system.abilities;

    return {
      actor: this.actor,
      abilities,
      rollData,
      selectedStat: this.selectedStat,
      selectedSkill: this.selectedSkill,
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find("#paranoia-roller-roll-btn").click(this._onRoll.bind(this));
  }

  async _onRoll(event) {
    event.preventDefault();
    const form = this.element.find("form")[0];

    const statKey = form.querySelector("#paranoia-roller-stat").value;
    const skillKey = form.querySelector("#paranoia-roller-skill").value;
    const equipmentModifier = parseInt(form.querySelector("#paranoia-roller-equipment").value);
    const initiativeModifier = parseInt(form.querySelector("#paranoia-roller-initiative").value);

    const flagLevel = this.actor.system.flag.value;
    const hurtLevel = 4 - this.actor.system.health.value;

    let NODE = this._calculateNODE(statKey, skillKey, equipmentModifier, initiativeModifier, hurtLevel);

    let roll = await new Roll(generateRollString(NODE)).evaluate();

    // Simplified the displayed formula
    if (NODE < 0) {
      roll._formula = `${Math.abs(NODE)}d6cs>=5`;
    }

    const allDice = roll.dice.flatMap(d => d.results);
    const computerDiceResult = allDice.at(-1).result;
    let attractedComputersAttention = computerDiceAttractsAttention(computerDiceResult, flagLevel);

    await this._sendRollResults(roll, NODE, equipmentModifier, hurtLevel, initiativeModifier, flagLevel, attractedComputersAttention, computerDiceResult);

    this.close();
  }

  _calculateNODE(statKey, skillKey, equipmentModifier, initiativeModifier, hurtLevel) {
    const rollData = this.actor.getRollData();
    const statNODE = parseInt(rollData.abilities[statKey].value);

    let skillNODE = 0;
    Object.values(rollData.abilities).forEach((ability) => {
      if (ability.hasOwnProperty("skills") && ability.skills.hasOwnProperty(skillKey)) {
        skillNODE = parseInt(ability.skills[skillKey].value);
      }
    });

    return calculateNODE(statNODE + skillNODE, equipmentModifier, initiativeModifier, hurtLevel);
  }

  async _sendRollResults(roll, NODE, equipmentModifier, hurtLevel, initiativeModifier, flagLevel, attractedComputersAttention, computerDiceResult) {
    let flavor = "";
    if (NODE === 1) {
      flavor += game.i18n.format("PARANOIA.ChatRollFateInComputer", { name: this.actor.name }) + "<br>";
    }
    if (NODE < 0) {
      flavor += game.i18n.localize("PARANOIA.ChatRollNegativeNode") + "<br>";
    }
    flavor += game.i18n.format("PARANOIA.ChatRollEquipment", { level: equipmentModifier });
    if (hurtLevel !== 0) {
      flavor += "<br>" + game.i18n.format("PARANOIA.ChatRollWounds", { hurt: hurtLevel });
    }
    if (initiativeModifier !== 0) {
      flavor += "<br>" + game.i18n.format("PARANOIA.ChatRollInitiative", { modifier: initiativeModifier });
    }

    await roll.toMessage({ flavor, speaker: ChatMessage.getSpeaker({ actor: this.actor }) });
    await this._sendComputerRollResults(attractedComputersAttention, computerDiceResult, flagLevel);
  }

  async _sendComputerRollResults(attractedComputersAttention, computerDiceResult, flagLevel) {
    let flavor = game.i18n.localize("PARANOIA.ChatRollNoNotice");
    if (attractedComputersAttention) {
      flavor = game.i18n.localize("PARANOIA.ChatRollAttention") + " " +
        game.i18n.format("PARANOIA.ChatRollCitizenIs", {
          description: this._flagLevelToDescription(flagLevel),
          result: computerDiceResult,
        });
    }

    let content = this._generateFriendComputerMessage(flavor, attractedComputersAttention);
    ChatMessage.create({
      speaker: { alias: game.i18n.localize("PARANOIA.ChatComputerName") },
      content: content,
      flavor: flavor,
    });
  }

  _generateFriendComputerMessage(message, isAngry) {
    let theme = isAngry ? "paranoia-red-theme" : "paranoia-blue-theme";
    return `<div class="paranoia-friend-computer-container ${theme}">
    <div class="paranoia-screen">
      <div class="paranoia-eye">
        <div class="paranoia-pupil"></div>
      </div>
    </div>
  </div>`;
  }

  _flagLevelToDescription(flagLevel) {
    switch (flagLevel) {
      case 4: return game.i18n.localize("PARANOIA.StatusWanted");
      case 3: return game.i18n.localize("PARANOIA.StatusCOI");
      case 2: return game.i18n.localize("PARANOIA.StatusRestricted");
      case 1: return game.i18n.localize("PARANOIA.StatusGreylisted");
      case 0: return game.i18n.localize("PARANOIA.StatusLoyal");
      default: return "";
    }
  }

}
