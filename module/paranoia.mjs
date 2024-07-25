// Import document classes.
import { ParanoiaActor } from "./documents/actor.mjs";
import { ParanoiaEquipment } from "./documents/equipment.mjs";
// Import sheet classes.
import { ParanoiaTroubleshooterSheet } from "./sheets/actor/troubleshooter-sheet.mjs";
import { ParanoiaNobodySheet } from "./sheets/actor/nobody-sheet.mjs";
import { ParanoiaSomebodySheet } from "./sheets/actor/somebody-sheet.mjs";
import { ParanoiaAccompliceSheet } from "./sheets/actor/accomplice-sheet.mjs";
import { ParanoiaEquipmentSheet } from "./sheets/equipment/equipment-sheet.mjs";
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

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
const blah = {};
Hooks.once('init', async function () {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.paranoia = {
    ParanoiaActor,
    ParanoiaEquipment
  };

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
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("paranoia", ParanoiaTroubleshooterSheet, { types: ["troubleshooter"], makeDefault: true });
  Actors.registerSheet("paranoia", ParanoiaNobodySheet, { types: ["nobody"], makeDefault: true });
  Actors.registerSheet("paranoia", ParanoiaSomebodySheet, { types: ["somebody"], makeDefault: true });
  Actors.registerSheet("paranoia", ParanoiaAccompliceSheet, { types: ["accomplice"], makeDefault: true });
  Items.registerSheet("paranoia", ParanoiaEquipmentSheet, { types: ["equipment"], makeDefault: true });

  // Preload Handlebars templates.
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

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */
