// Import document classes.
import { ParanoiaActor } from "./documents/actor.mjs";
import { ParanoiaEquipment } from "./documents/equipment.mjs";
// Import sheet classes.
import { ParanoiaTroubleshooterSheet } from "./sheets/actor/troubleshooter-sheet.mjs";
import { ParanoiaNobodySheet } from "./sheets/actor/nobody-sheet.mjs";
import { ParanoiaSomebodySheet } from "./sheets/actor/somebody-sheet.mjs";
import { ParanoiaAccompliceSheet } from "./sheets/actor/accomplice-sheet.mjs";
import { ParanoiaEquipmentSheet } from "./sheets/equipment/equipment-sheet.mjs";
// Import application classes.
import { TreasonCircleApp } from "./apps/TreasonCircleApp.js";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { PARANOIA } from "./helpers/config.mjs";
import {
  ParanoiaTroubleshooterData,
  ParanoiaNobodyData,
  ParanoiaSomebodyData,
  ParanoiaAccompliceData,
  ParanoiaEquipmentData
} from "./data/index.mjs";
import { registerGameSettings } from "./settings/settings.mjs";
import { getCompatibleActorsObject, getCompatibleItemsObject, getCompatibleActorSheet, getCompatibleItemSheet } from "./utils/compatibility.mjs";
import { SkillDraftController, SkillDraftEvent } from "./apps/SkillDraftController.js";
import { SkillDraftPlayer } from "./apps/SkillDraftPlayer.js";
import { GMCommandCenter } from "./apps/GMCommandCenter.js";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
let skillDraftApp = null;
export const socketEventChannel = "system.paranoia";

Hooks.once('init', async function () {

  game.socket.on(socketEventChannel, async (data) => {
    const myActorId = game.user.character?.id;
    if (game.user.isGM) return;
    const event = data.event;
    const state = data.state;

    switch (event) {
      case SkillDraftEvent.START_DRAFT:
        if (!state.participants.includes(myActorId)) return;

        skillDraftApp = new SkillDraftPlayer(state);
        skillDraftApp.render(true);
        break;
      case SkillDraftEvent.UPDATE_DRAFT_STATE:
        if (data.clientId != undefined && data.clientId != game.user.id) return;

        if (skillDraftApp) {
          skillDraftApp.updateState(state);
        } else if (state.participants.includes(myActorId)) {
          skillDraftApp = new SkillDraftPlayer(state);
          skillDraftApp.render(true);
        }
        break;
      case SkillDraftEvent.CLOSE_DRAFT:
        if (!skillDraftApp) return;
        skillDraftApp.close();
        const myActor = game.actors.get(myActorId);
        if (myActor) {
          myActor.sheet.render(true);
        }
        skillDraftApp = null;
        break;
    }
  });

  globalThis.TreasonCircleApp = TreasonCircleApp;
  globalThis.SkillDraftController = SkillDraftController;

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.paranoia = {
    ParanoiaActor,
    ParanoiaEquipment
  };
  const items = getCompatibleItemsObject();
  const actors = getCompatibleActorsObject();

  registerGameSettings()

  // Add custom constants for configuration.
  CONFIG.PARANOIA = PARANOIA;

  // Define custom Document classes
  CONFIG.Actor.documentClass = ParanoiaActor;
  CONFIG.Item.documentClass = ParanoiaEquipment;

  CONFIG.Combat.initiative = {
    formula: "@sec"
  }

  Object.assign(CONFIG.Actor.dataModels, {
    troubleshooter: ParanoiaTroubleshooterData,
    nobody: ParanoiaNobodyData,
    somebody: ParanoiaSomebodyData,
    acomplice: ParanoiaAccompliceData,
  });

  Object.assign(CONFIG.Item.dataModels, {
    equipment: ParanoiaEquipmentData
  })

  // Register sheet application classes
  actors.unregisterSheet("core", getCompatibleActorSheet());
  items.unregisterSheet("core", getCompatibleItemSheet());
  actors.registerSheet("paranoia", ParanoiaTroubleshooterSheet, { types: ["troubleshooter"], makeDefault: true });
  actors.registerSheet("paranoia", ParanoiaNobodySheet, { types: ["nobody"], makeDefault: false });
  actors.registerSheet("paranoia", ParanoiaSomebodySheet, { types: ["somebody"], makeDefault: false });
  actors.registerSheet("paranoia", ParanoiaAccompliceSheet, { types: ["accomplice"], makeDefault: false });
  items.registerSheet("paranoia", ParanoiaEquipmentSheet, { types: ["equipment"], makeDefault: true });

  // Preload Handlebars templates.
  console.log("Paranoia | Paranoia system initialized");
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function () {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('add', function (a, b) {
  return a + b;
});

Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

/**
 * Generates the HTML for a segmented health bar.
 * @param {number} health - The current health value (0-4).
 * @param {string} description - The text description of the health level (e.g., "Fine", "Hurt").
 * @returns {Handlebars.SafeString} The HTML for the health bar.
 */
Handlebars.registerHelper('healthBar', function (health, description) {
  const colorClass = description ? description.toLowerCase() : '';
  let segments = '';
  for (let i = 1; i <= 4; i++) {
    const segmentClass = i <= health ? 'filled' : 'empty';
    segments += `<div class="health-segment ${segmentClass}"></div>`;
  }
  const barHtml = `<div class="health-bar ${colorClass}" title="${description} (${health}/4)">${segments}</div>`;
  return new Handlebars.SafeString(`<div class="health-bar-container">${barHtml}<div class="health-bar-terminal"></div></div>`);
});

/**
 * Generates the HTML for a 5-star treason level display.
 * @param {number} treasonLevel - The current treason value (0-4).
 * @param {string} description - The text description of the treason level.
 * @returns {Handlebars.SafeString} The HTML for the treason stars.
 */
Handlebars.registerHelper('treasonBar', function (treasonLevel, description) {
  const filledStars = treasonLevel; // Treason level 0 has 0 stars.
  let stars = '';
  for (let i = 1; i <= 4; i++) {
    const starClass = i <= filledStars ? 'filled' : 'empty';
    stars += `<i class="fas fa-star ${starClass}"></i>`;
  }
  return new Handlebars.SafeString(`<div class="treason-bar" title="${description} (Level ${treasonLevel})">${stars}</div>`);
});

/**
 * Generates the HTML for a segmented moxie bar.
 * @param {number} current - The current moxie value.
 * @param {number} max - The maximum moxie value.
 * @returns {Handlebars.SafeString} The HTML for the moxie bar.
 */
Handlebars.registerHelper('moxieBar', function (current, max) {
  let segments = '';
  for (let i = 1; i <= max; i++) {
    const segmentClass = i <= current ? 'filled' : 'empty';
    segments += `<div class="moxie-segment ${segmentClass}"></div>`;
  }
  const barHtml = `<div class="moxie-bar" title="Moxie (${current}/${max})">${segments}</div>`;
  return new Handlebars.SafeString(`<div class="moxie-bar-container">${barHtml}<div class="moxie-bar-terminal"></div></div>`);
});

/**
* Formats a skill name for display.
* Capitalizes the first letter and handles special cases like "alphaComplex".
* @param {string} skillName - The machine-readable skill name.
* @returns {string} The formatted, human-readable skill name.
*/
Handlebars.registerHelper('formatSkillName', function (skillName) {
  if (skillName === 'alphaComplex') return 'Alpha Complex';
  if (typeof skillName !== 'string' || skillName.length === 0) return '';
  return skillName.charAt(0).toUpperCase() + skillName.slice(1);
});
/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to

  // Friend Computer Eye Tracking
  document.addEventListener('mousemove', (event) => {
    const eyes = document.querySelectorAll('.paranoia-eye');
    // If there are no eyes on the page at all, do nothing. This is a very fast check.
    if (eyes.length === 0) return;

    const screens = document.querySelectorAll('.paranoia-screen');
    eyes.forEach((eye, index) => {
      const screen = screens[index];
      if (!screen) return;

      const rect = screen.getBoundingClientRect();

      // Optimization: If the screen is not in the viewport, do not perform calculations.
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        return;
      }

      const screenCenterX = rect.left + rect.width / 2;
      const screenCenterY = rect.top + rect.height / 2;
      const dx = event.clientX - screenCenterX;
      const dy = event.clientY - screenCenterY;
      const maxMovement = rect.width * 0.1;
      const distance = Math.min(maxMovement, Math.sqrt(dx * dx + dy * dy));
      const angle = Math.atan2(dy, dx);
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance;
      eye.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    });
  });

  // Style items when dragging from the sidebar.
  let draggedElement = null;
  let clickTimeout = null;

  document.body.addEventListener('mousedown', (event) => {
    if (draggedElement) draggedElement.classList.remove('paranoia-dragging-item');
    clearTimeout(clickTimeout);

    const itemElement = event.target.closest('li.directory-item.item');
    if (itemElement) {
      draggedElement = itemElement;
      draggedElement.classList.add('paranoia-dragging-item');

      // Set a timeout. If mouseup happens before this, it's a click.
      clickTimeout = setTimeout(() => {
        clickTimeout = null;
      }, 200);
    }
  });

  document.body.addEventListener('mouseup', () => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      if (draggedElement) draggedElement.classList.remove('paranoia-dragging-item');
      draggedElement = null;
    }
  });

  document.body.addEventListener('dragend', () => {
    if (draggedElement) {
      draggedElement.classList.remove('paranoia-dragging-item');
      draggedElement = null;
    }
  });
});

Hooks.on('getSceneControlButtons', controls => {
  if (!game.user.isGM) return;

  const paranoiaControl = {
    name: 'paranoia',
    title: 'Paranoia Applets',
    icon: 'fas fa-user-secret',
    visble: true,
    tools: {
      'gm-command-center': {
        name: 'gm-command-center',
        title: 'GM Command Center',
        icon: 'fas fa-cogs',
        button: true,
        onClick: () => {
          new GMCommandCenter().render(true);
        }
      }
    }
  }

  if (Array.isArray(controls)) {
    controls.push(paranoiaControl);
  }
  else {
    controls.paranoia = paranoiaControl;
  }
});

Hooks.on("updateActor", (actor, data) => {
  // Find an open GM Command Center window.
  const commandCenter = Object.values(ui.windows).find(app => app instanceof GMCommandCenter);
  if (!commandCenter) return;

  // Only update if the actor is a player character and a relevant property has changed.
  const isPlayerCharacter = actor.hasPlayerOwner;
  const hasRelevantChange = foundry.utils.hasProperty(data, "system.health") || foundry.utils.hasProperty(data, "system.flag") || foundry.utils.hasProperty(data, "system.moxie");

  if (isPlayerCharacter && hasRelevantChange) {
    commandCenter.render(false);
  }
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */
