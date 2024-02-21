import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ParanoiaActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["paranoia", "sheet", "actor"],
      template: "systems/paranoia/templates/actor/actor-sheet.html",
      width: 900,
      height: 675,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    return `systems/paranoia/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    context.sheetSettings = {};
    context.sheetSettings.isLimited = (this.actor.permission == 1) ? true : false;
    context.sheetSettings.isObserver = (this.actor.permission == 2 || this.actor.compendium?.locked) ? true : false;

    context.healthFlags = {
      4: "Fine",
      3: "Hurt",
      2: "Injured",
      1: "Maimed",
      0: "Dead"
    }
    context.wantedFlags = {
      0: "Loyal",
      1: "Greylisted",
      2: "Restricted",
      3: "Citizen-Of-Interest",
      4: "Wanted"
    }

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
    for (let [k, v] of Object.entries(context.system.abilities)) {
      v.label = game.i18n.localize(CONFIG.PARANOIA.abilities[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: []
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.spells = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;
    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    //Paranoia-Specific Listeners
    html.find('.paranoia-rolling-atribute').change((event) => {
      let attributeElement = event.delegateTarget;
      this.checkAttributeValue(attributeElement);
    });
    html.find('.paranoia-health-indicator').change((event) => {
      const eventValue = parseInt(event.target.value);
      const actorHealth = this.actor.system.health;
      this.validateWellnessChange(eventValue, event.target, actorHealth);
    });
    html.find('.paranoia-flag-indicator').change((event) => {
      const eventValue = parseInt(event.target.value);
      const actorFlag = this.actor.system.flag;
      this.validateWellnessChange(eventValue, event.target, actorFlag);
    });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const triggeringElement = event.currentTarget;
    const rollData = this.actor.getRollData();


    switch (triggeringElement.id) {
      case 'paranoia-character-roller':
        let hurtLevel = (4 - this.actor.system.health.value);
        let NODE = parseInt(this.getStatisticsNODEFromSheet(triggeringElement, rollData));
        let equipmentModifier = parseInt(this.getEquipmentModifierFromSheet(triggeringElement));
        let initiativeModifier = parseInt(this.getInitiativeModifierFromSheet(triggeringElement));

        NODE += equipmentModifier;
        NODE -= initiativeModifier;
        NODE -= hurtLevel;

        if (NODE > 0) {
          this.rollNode(NODE, equipmentModifier, initiativeModifier, hurtLevel);
        }
        else if (NODE != 0) {
          this.rollNode(NODE, equipmentModifier, initiativeModifier, hurtLevel, true);
        }
        else {
          let flavor = `${this.actor.name} puts their fate in Friend Computer's capable lack-of-hands.<br>`
          flavor += `Rolling with a level ${equipmentModifier} equipment.`
          if (hurtLevel != 0) {
            flavor += `<br>Rolling with ${hurtLevel} less NODE due to current wounds`
          }
          if (initiativeModifier != 0) {
            flavor += `<br>Rolling with ${initiativeModifier} less NODE to jump up ${initiativeModifier} places in the initiaive!`
          }
          ChatMessage.create({
            flavor: flavor
          })
        }
        const flagLevel = this.actor.system.flag.value;
        this.rollComputerDice(flagLevel);
        break;
    }

  }

  rollNode(NODE, equipmentModifier, initiativeModifier, hurtLevel, negativeNODE = false) {
    let roll;
    roll = new Roll(`${NODE}d6`)
    let flavor = '';
    if (negativeNODE) {
      roll = new Roll(`${NODE * -1}d6`);
      flavor = 'Rolling with negative node. Good luck, citizen.<br>';
    }
    flavor += `Rolling with a level ${equipmentModifier} equipment.`
    if (hurtLevel != 0) {
      flavor += `<br>Rolling with ${hurtLevel} less NODE due to current wounds`
    }
    if (initiativeModifier != 0) {
      flavor += `<br>Rolling with ${initiativeModifier} less NODE to jump up ${initiativeModifier} places in the initiaive!`
    }
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavor,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  getStatisticsNODEFromSheet(htmlElement, rollData) {
    let stat = htmlElement.form[26].value.toLowerCase()
    let skill = htmlElement.form[27].value
    let statNODE = parseInt(rollData.abilities[stat].value);
    let skillNODE;

    Object.values(rollData.abilities).forEach(ability => {

      if (ability.hasOwnProperty('skills') && ability.skills.hasOwnProperty(skill)) {
        skillNODE = parseInt(ability.skills[skill].value);
      }
    });

    return statNODE + skillNODE;
  }

  getEquipmentModifierFromSheet(htmlElement) {
    return htmlElement.form[28].value;
  }

  getInitiativeModifierFromSheet(htmlElement) {
    return htmlElement.form[29].value;
  }

  checkAttributeValue(sender) {
    const min = -5
    const max = 5
    let value = parseInt(sender.value);
    console.log(`Detected value ${value}`);
    if (isNaN(value)) {
      console.log('detected NaN');
      sender.value = 0;
    }
    else if (value > max) {
      sender.value = max;
    } else if (value < min) {
      sender.value = min;
    }
  }

  async rollComputerDice(flagLevel) {
    let roll = await new Roll('1d6').roll();
    let flavor = 'You manage to avoid The Computer\'s notice. This time.';
    let content = "<img src=\"https://cacheblasters.nyc3.cdn.digitaloceanspaces.com/paranoiavtt/Computer_Eye.webp\"/>";
    if (roll._total >= (6 - flagLevel)) {
      flavor = `The Computer turns its eye on your troubleshooter... (Rolled a ${roll._total} as a ${this.flagLevelToDescription(flagLevel)}).`
      content = "<img src=\"https://cacheblasters.nyc3.cdn.digitaloceanspaces.com/paranoiavtt/Computer_Eye_Red.png\"/>";
    }
    roll.toMessage({
      speaker: { alias: 'The Computer' },
      flavor: flavor,
      rollMode: game.settings.get('core', 'rollMode'),
      content: content
    });
  }

  flagLevelToDescription(flagLevel) {
    switch (flagLevel) {
      case 4:
        return "Wanted Enemy of The Computer and Alpha Complex"
      case 3:
        return "Citizen-Of-Interest"
      case 2:
        return "Restricted Citizen"
      case 1:
        return "Greylisted Citizen"
      case 0:
        return "Loyal Citizen of Alpha Complex"
    }
  }

  validateWellnessChange(eventValue, eventTarget, actorValue) {
    if (isNaN(eventValue)) {
      eventTarget.value = actorValue.value;
    }
    if (eventValue > actorValue.max) {
      eventTarget.value = actorValue.max;
    }
    if (eventValue < actorValue.min) {
      eventTarget.value = actorValue.min;
    }
  }
}
