import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";

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
      width: 700,
      height: 685,
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

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
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
    console.log(rollData);
    console.log(event);


    switch(triggeringElement.id){
      case 'paranoia-character-roller':
        let NODE = parseInt(this.getStatisticsNODEFromSheet(triggeringElement, rollData));
        let equipmentModifier = parseInt(this.getEquipmentModifierFromSheet(triggeringElement));
        let initiativeModifier = parseInt(this.getInitiativeModifierFromSheet(triggeringElement));

        NODE += equipmentModifier;
        NODE -= initiativeModifier;

        if(NODE > 0){
          this.rollNode(NODE, equipmentModifier, initiativeModifier);
        }
        else if(NODE != 0){
          this.rollNode(NODE, equipmentModifier, initiativeModifier, true);
        }
        else{
          let flavor = `${this.actor.name} puts their fate in Friend Computer's capable lack-of-hands.<br>`
          flavor += `Rolling with a level ${equipmentModifier} equipment.`
          if(initiativeModifier != 0){
            flavor += `<br>Rolling with ${initiativeModifier} less NODE to jump up ${initiativeModifier} places in the initiaive!`
          }
          ChatMessage.create({
            flavor: flavor
          })
        }
        this.rollComputerDice();
        break;
    }

  }

  rollNode(NODE, equipmentModifier, initiativeModifier, negativeNODE=false){
    let roll;
    roll = new Roll(`${NODE}d6`)
    let flavor = '';
    if(negativeNODE){
      roll = new Roll(`${NODE * -1}d6`);
      flavor = 'Rolling with negative node. Good luck, citizen.<br>';
    }
    flavor += `Rolling with a level ${equipmentModifier} equipment.`
    if(initiativeModifier != 0){
      flavor += `<br>Rolling with ${initiativeModifier} less NODE to jump up ${initiativeModifier} places in the initiaive!`
    }
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavor,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  getStatisticsNODEFromSheet(htmlElement, rollData){
    let stat = htmlElement.form[26].value.toLowerCase()
    let skill = htmlElement.form[27].value
    let statNODE = parseInt(rollData.abilities[stat].value);
    let skillNODE;

    Object.values(rollData.abilities).forEach(ability => {

      if(ability.hasOwnProperty('skills') && ability.skills.hasOwnProperty(skill)){
        skillNODE = parseInt(ability.skills[skill].value);
      }
    });

    return statNODE + skillNODE;
  }

  getEquipmentModifierFromSheet(htmlElement){
    return htmlElement.form[28].value;
  }

  getInitiativeModifierFromSheet(htmlElement){
    return htmlElement.form[29].value;
  }

  async rollComputerDice(){
    let roll = await new Roll('1d6').roll();
    let flavor = 'You manage to avoid The Computer\'s notice. This time.';

    if(roll._total == 6){
      flavor = 'The Computer turns its eye on your troubleshooter...'
    }
    roll.toMessage({
      speaker: {alias: 'The Computer'},
      flavor: flavor,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

}
