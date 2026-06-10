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

    let rollString = this._generateRollString(NODE);
    let roll = await new Roll(rollString).evaluate();

    // Simplified the displayed formula
    if (NODE < 0) {
      roll._formula = `${Math.abs(NODE)}d6cs>=5`;
    }

    let attractedComputersAttention = this._computerDiceAttractsAttention(roll, flagLevel);

    await this._sendRollResults(roll, NODE, equipmentModifier, hurtLevel, initiativeModifier, flagLevel, attractedComputersAttention);

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

    let NODE = statNODE + skillNODE + equipmentModifier - initiativeModifier - hurtLevel;

    if (NODE < 0) {
      return NODE - 1; // "add" Computer Dice
    }
    return NODE + 1; // add Computer Dice
  }

  _generateRollString(NODE) {
    if (NODE > 0) return `${Math.abs(NODE)}d6cs>=5`;
    let positiveNode = Math.abs(NODE);
    return `2 * (${positiveNode}d6cs>=5) - ${positiveNode}`;
  }

  _computerDiceAttractsAttention(roll, flagLevel) {
    // The computer die is always the last die in the pool
    const allDice = roll.dice.flatMap(d => d.results);
    const computerDiceResult = allDice.at(-1).result;
    return computerDiceResult >= 6 - flagLevel;
  }

  async _sendRollResults(roll, NODE, equipmentModifier, hurtLevel, initiativeModifier, flagLevel, attractedComputersAttention) {
    let flavor = "";
    if (NODE === 1) {
      flavor += `${this.actor.name} puts their fate in Friend Computer's capable lack-of-hands.<br>`;
    }
    if (NODE < 0) {
      flavor += "Rolled with negative node. Non-Successes subtract from your success count! Good luck, citizen.<br>";
    }
    flavor += `Rolled with a level ${equipmentModifier} equipment.`;
    if (hurtLevel !== 0) {
      flavor += `<br>Rolled with ${hurtLevel} less NODE due to current wounds`;
    }
    if (initiativeModifier !== 0) {
      flavor += `<br>Rolled with ${initiativeModifier} less NODE to jump up ${initiativeModifier} places in the initiative!`;
    }

    await roll.toMessage({ flavor, speaker: ChatMessage.getSpeaker({ actor: this.actor }) });
    const allDice = roll.dice.flatMap(d => d.results);
    await this._sendComputerRollResults(attractedComputersAttention, allDice.at(-1).result, flagLevel);
  }

  async _sendComputerRollResults(attractedComputersAttention, computerDiceResult, flagLevel) {
    let flavor = `You manage to avoid Friend Computer's notice... this time.`;
    if (attractedComputersAttention) {
      flavor = `Friend Computer turns its eye on your troubleshooter... (Citizen is a ${this._flagLevelToDescription(flagLevel)} and rolled a ${computerDiceResult}).`;
    }

    let content = this._generateFriendComputerMessage(flavor, attractedComputersAttention);
    ChatMessage.create({
      speaker: { alias: "Friend Computer" },
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
      case 4: return "Wanted Enemy of The Computer and Alpha Complex";
      case 3: return "Citizen-Of-Interest";
      case 2: return "Restricted Citizen";
      case 1: return "Greylisted Citizen";
      case 0: return "Loyal Citizen of Alpha Complex";
    }
  }

  /** @override */
  async _updateObject(event, formData) {
    // No-op: form submission is handled by _onRoll
  }
}
