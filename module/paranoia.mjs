// Import document classes.
import { ParanoiaActor } from "./documents/actor.mjs";
// Import sheet classes.
import { ParanoiaActorSheet } from "./sheets/actor-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { PARANOIA } from "./helpers/config.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.paranoia = {
    ParanoiaActor
  };

  // Add custom constants for configuration.
  CONFIG.PARANOIA = PARANOIA;

  // Define custom Document classes
  CONFIG.Actor.documentClass = ParanoiaActor;

  CONFIG.Combat.initiative = {
    formula: "@sec"
  }

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("paranoia", ParanoiaActorSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('add', function(a, b) {
  return a + b;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */
