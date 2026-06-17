import { prepareActiveEffectCategories } from "../../helpers/effects.mjs";
import { getCompatibleTextEditor } from "../../utils/compatibility.mjs";
import { ParanoiaActor } from "./actor-sheet.mjs";
import { DiceRollerApp } from "../../apps/DiceRollerApp.js";
import { clampWellnessValue, clampAttributeValue } from "../../utils/validation.mjs";

/**
 * Extends our base ParanoiaActor class to create a sheet for Troubleshooters.
 * @extends {ParanoiaActor}
 */
export class ParanoiaTroubleshooterSheet extends ParanoiaActor {
  _selectedAttribute = null;
  _selectedSkill = null;

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["paranoia", "sheet", "actor"],
      template: "systems/paranoia/templates/actor/troubleshooter-sheet.html",
      width: 900,
      height: 675,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }],
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    context.sheetSettings = {};
    context.sheetSettings.isLimited =
      this.actor.permission == CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
    context.sheetSettings.isObserver =
      this.actor.permission === CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER ||
      this.actor.compendium?.locked;

    context.healthFlags = {
      4: "Fine",
      3: "Hurt",
      2: "Injured",
      1: "Maimed",
      0: "Dead",
    };
    context.wantedFlags = {
      0: "Loyal",
      1: "Greylisted",
      2: "Restricted",
      3: "Citizen-Of-Interest",
      4: "Wanted",
    };

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    const textEditor = getCompatibleTextEditor();

    context.enrichedAliases = await textEditor.enrichHTML(context.system.secrets.aliases);
    context.enrichedSecretSocieties = await textEditor.enrichHTML(
      context.system.secrets.secretSociety,
    );
    context.enrichedSecretObjective = await textEditor.enrichHTML(
      context.system.secrets.secretObjective,
    );
    context.enrichedMutantPowers = await textEditor.enrichHTML(context.system.secrets.mutantPower);
    context.enrichedServiceGroupFavors = await textEditor.enrichHTML(
      context.system.secrets.serviceGroupFavors,
    );
    context.enrichedSecretSocietyFavors = await textEditor.enrichHTML(
      context.system.secrets.secretSocietyFavors,
    );
    context.enrichedTreasonousGear = await textEditor.enrichHTML(
      context.system.secrets.treasonousGear,
    );
    context.enrichedEvidence = await textEditor.enrichHTML(context.system.secrets.evidence);
    context.enrichedSecretNotes = await textEditor.enrichHTML(context.system.secrets.notes);
    context.enrichedGear = await textEditor.enrichHTML(context.system.assignedGear);
    context.enrichedMissionObjectives = await textEditor.enrichHTML(
      context.system.missionObjectives,
    );

    // Prepare character data and items.
    if (actorData.type == "troubleshooter") {
      await this._prepareItems(context);
      // this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == "npc") {
      await this._prepareItems(context);
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
  async _prepareItems(context) {
    // Initialize containers.
    const publicGear = [];
    const treasonousGear = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      if (i.type !== "equipment") continue;
      if (i.system.type == undefined) continue;
      i.img = i.img || DEFAULT_TOKEN;
      const textEditor = getCompatibleTextEditor();
      i.enrichedDescription = await textEditor.enrichHTML(i.system.description);
      // Append to gear.
      if (i.system.type === "publicGear") {
        publicGear.push(i);
      }
      // Append to features.
      else if (i.system.type === "treasonousGear") {
        treasonousGear.push(i);
      }
    }

    // Assign and return
    context.publicGear = publicGear;
    context.treasonousGear = treasonousGear;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check
    html.find(".gear-edit").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    const tabs = html.find(".sheet-tabs .item");
    tabs.on("click", (event) => {
      this._setSheetHeight($(event.currentTarget).data("tab"));
    });
    // Set initial height based on the active tab.
    this._setSheetHeight(tabs.filter(".active").data("tab"));

    // Click-to-select attributes and skills for dice rolling
    html.find(".paranoia-selectable-attribute").click(this._onSelectAttribute.bind(this));
    html.find(".paranoia-selectable-skill").click(this._onSelectSkill.bind(this));

    //Paranoia-Specific Listeners
    html.find(".paranoia-rolling-atribute").change((event) => {
      let attributeElement = event.delegateTarget;
      this.checkAttributeValue(attributeElement);
    });
    html.find(".paranoia-health-indicator").change((event) => {
      const eventValue = parseInt(event.target.value);
      const actorHealth = this.actor.system.health;
      this.validateWellnessChange(eventValue, event.target, actorHealth);
    });
    html.find(".paranoia-flag-indicator").change((event) => {
      const eventValue = parseInt(event.target.value);
      const actorFlag = this.actor.system.flag;
      this.validateWellnessChange(eventValue, event.target, actorFlag);
    });
    html.find(".paranoia-moxie").change((event) => {
      const eventValue = parseInt(event.target.value);
      const actorMoxie = this.actor.system.moxie;
      this.validateWellnessChange(eventValue, event.target, actorMoxie);
    });
    html.on("click", ".gear-create", this._onCreateGear.bind(this));
    html.on("click", ".gear-edit", this._onItemEdit.bind(this));
    html.on("click", ".gear-delete", this._onItemDelete.bind(this));

    // --- Drag-and-Drop Hover Feedback ---
    const dropZones = html.find(".gear-list-container[data-drop-type]");

    dropZones.on("dragenter", (event) => {
      // Prevent the event from bubbling up and causing other handlers to fire.
      event.stopPropagation();
      $(event.currentTarget).addClass("paranoia-drop-hover");
    });

    dropZones.on("dragleave", (event) => {
      // This check prevents the style from flickering when moving over child elements.
      if (!event.currentTarget.contains(event.relatedTarget)) {
        $(event.currentTarget).removeClass("paranoia-drop-hover");
      }
    });

    // Also remove the class when an item is dropped, as dragleave doesn't always fire.
    dropZones.on("drop", (event) => {
      $(event.currentTarget).removeClass("paranoia-drop-hover");
    });
  }

  async _onCreateGear(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Prepare the data for the new item using the modern data model.
    const itemData = {
      name: "New Gear",
      type: "equipment",
      system: {
        type: header.dataset.type, // This will be 'publicGear' or 'treasonousGear'
      },
    };

    // Create the item directly on the actor.
    return Item.create(itemData, { parent: this.actor });
  }

  /**
   * Adjusts the sheet height based on the selected tab.
   * @param {string} tabName The 'data-tab' attribute of the selected tab.
   * @private
   */
  _setSheetHeight(tabName) {
    const defaultHeight = this.constructor.defaultOptions.height;
    const naughtyHeight = 900;
    const currentHeight = this.position.height;

    if (tabName === "naughty") {
      // If the sheet isn't already the naughty height, resize it.
      if (currentHeight !== naughtyHeight) {
        this.setPosition({ height: naughtyHeight });
      }
    } else {
      // If the sheet isn't already the default height, resize it.
      if (currentHeight !== defaultHeight) {
        this.setPosition({ height: defaultHeight });
      }
    }
  }

  /**
   * Handle dropping an Item data object onto the Actor Sheet.
   * @param {DragEvent} event   The concluding DragEvent which contains drop data
   * @param {object} data       The data object extracted from the event
   * @returns {Promise<Item[]|boolean>}
   * @override
   */
  async _onDropItem(event, data) {
    if (!this.isEditable) return false;

    // Find the drop container to determine what kind of gear is being added.
    const dropContainer = event.target.closest("[data-drop-type]");
    if (!dropContainer) return false;

    const dropType = dropContainer.dataset.dropType;

    // Validate that the drop type is one we handle.
    if (!["publicGear", "treasonousGear"].includes(dropType)) return false;

    const item = await Item.fromDropData(data);
    if (!item) return false;

    // Validate that the dropped document is an 'equipment' item.
    if (item.type !== "equipment") {
      ui.notifications.warn("Only Equipment items can be added to this sheet.");
      return false;
    }

    // Prepare the item data, setting the subtype based on the drop location.
    const itemData = item.toObject();
    itemData.system.type = dropType;

    // Create the new item on the actor.
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    item.sheet.render(true);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Display a confirmation dialog for better UX.
    const confirmed = await Dialog.confirm({
      title: game.i18n.format("PARANOIA.DeleteConfirmTitle", { name: item.name }),
      content: `<p>${game.i18n.format("PARANOIA.DeleteConfirmContent", { name: item.name })}</p>`,
      options: { classes: ["paranoia", "dialog", "paranoia-red-theme"] },
    });

    if (confirmed) {
      return item.delete();
    }
  }

  /** @inheritDoc */
  async activateEditor(name, options = {}, initialContent = "") {
    options.engine = "prosemirror";
    options.relativeLinks = true;
    options.plugins = {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        compact: true,
        destroyOnSave: false,
        onSave: () => this.saveEditor(name, { remove: false }),
      }),
    };
    return super.activateEditor(name, options, initialContent);
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onSelectAttribute(event) {
    event.preventDefault();
    const label = event.currentTarget;
    const key = label.dataset.attributeKey;

    // Toggle selection
    if (this._selectedAttribute === key) {
      this._selectedAttribute = null;
      label.classList.remove("paranoia-selected");
    } else {
      // Remove highlight from previously selected attribute
      this.element
        .find(".paranoia-selectable-attribute.paranoia-selected")
        .removeClass("paranoia-selected");
      this._selectedAttribute = key;
      label.classList.add("paranoia-selected");
    }

    this._tryOpenDiceRoller();
  }

  _onSelectSkill(event) {
    event.preventDefault();
    const label = event.currentTarget;
    const key = label.dataset.skillKey;

    // Toggle selection
    if (this._selectedSkill === key) {
      this._selectedSkill = null;
      label.classList.remove("paranoia-selected");
    } else {
      // Remove highlight from previously selected skill
      this.element
        .find(".paranoia-selectable-skill.paranoia-selected")
        .removeClass("paranoia-selected");
      this._selectedSkill = key;
      label.classList.add("paranoia-selected");
    }

    this._tryOpenDiceRoller();
  }

  _tryOpenDiceRoller() {
    if (this._selectedAttribute && this._selectedSkill) {
      const existing = Object.values(ui.windows).find((w) => w.id === "paranoia-dice-roller");
      if (existing) {
        existing.selectedStat = this._selectedAttribute;
        existing.selectedSkill = this._selectedSkill;
        existing.render(true);
      } else {
        new DiceRollerApp(this.actor, {
          selectedStat: this._selectedAttribute,
          selectedSkill: this._selectedSkill,
        }).render(true);
      }

      // Reset selections and highlights
      this._selectedAttribute = null;
      this._selectedSkill = null;
      this.element
        .find(".paranoia-selectable-attribute.paranoia-selected")
        .removeClass("paranoia-selected");
      this.element
        .find(".paranoia-selectable-skill.paranoia-selected")
        .removeClass("paranoia-selected");
    }
  }

  checkAttributeValue(sender) {
    sender.value = clampAttributeValue(parseInt(sender.value));
  }

  validateWellnessChange(eventValue, eventTarget, actorValue) {
    eventTarget.value = clampWellnessValue(eventValue, actorValue);
  }
}
