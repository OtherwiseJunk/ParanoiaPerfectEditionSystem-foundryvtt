/**
 * Playwright selectors for the Paranoia FoundryVTT system.
 *
 * The system uses legacy Application/ActorSheet/FormApplication throughout.
 * That API renders the same DOM structure across all supported Foundry versions
 * (V12, V13, V14), so no per-version branching is needed here. If the system
 * ever migrates to ActorSheetV2/ApplicationV2, update this single file.
 */

export const selectors = {
  // The "sheet" and "actor" classes from defaultOptions.classes land on the
  // window container, not the <form>. The form is rendered with
  // `{{cssClass}} {{actor.type}} flexcol paranoia`, so it carries `paranoia`
  // plus the actor type. Item sheets additionally carry `paranoia-item`.
  actorSheet: {
    root: "form.paranoia:not(.paranoia-item)",
    troubleshooter: "form.paranoia.troubleshooter",
    nobody: "form.paranoia.nobody",
    somebody: "form.paranoia.somebody",
    accomplice: "form.paranoia.accomplice",
    nameInput: "input.paranoia-actor-name",
    header: ".window-header",
    content: ".window-content",
  },

  tabs: {
    productivityProfile: '.sheet-tabs a[data-tab="productivityProfile"]',
    wellness: '.sheet-tabs a[data-tab="wellness"]',
    role: '.sheet-tabs a[data-tab="role"]',
    foundry: '.sheet-tabs a[data-tab="foundry"]',
    naughty: '.sheet-tabs a[data-tab="naughty"]',
  },

  wellness: {
    healthInput: "textarea.paranoia-health-indicator",
    flagInput: "textarea.paranoia-flag-indicator",
    moxieInput: "textarea.paranoia-moxie",
  },

  gear: {
    publicDropZone: '.gear-list-container[data-drop-type="publicGear"]',
    treasonousDropZone: '.gear-list-container[data-drop-type="treasonousGear"]',
    createPublicBtn: '.gear-create[data-type="publicGear"]',
    createTreasonousBtn: '.gear-create[data-type="treasonousGear"]',
    item: ".item[data-item-id]",
    editBtn: ".gear-edit",
    deleteBtn: ".gear-delete",
  },

  equipmentSheet: "form.paranoia.paranoia-item",

  diceRoller: {
    root: "#paranoia-dice-roller",
    content: "#paranoia-dice-roller .window-content",
    rollBtn: "#paranoia-roller-roll-btn",
    statSelect: "#paranoia-roller-stat",
    skillSelect: "#paranoia-roller-skill",
    equipmentInput: "#paranoia-roller-equipment",
    initiativeInput: "#paranoia-roller-initiative",
  },

  treasonCircle: {
    root: "#paranoia-treason-circle-architect",
    primaryTreasonInput: "textarea[name='big_treason']",
    addRowBtn: ".add-row-button",
    entriesContainer: ".treason-entries-container",
    entryRow: ".treason-entry",
    submitBtn: 'button[type="submit"]',
  },

  chat: {
    log: "#chat-log",
    message: ".chat-message",
    friendComputerContainer: ".paranoia-friend-computer-container",
  },

  selectableAttribute: ".paranoia-selectable-attribute",
  selectableSkill: ".paranoia-selectable-skill",
  selectedClass: "paranoia-selected",
};
