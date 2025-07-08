/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  const templates = {
    // Actor partials.
    "actor-societal-role": "systems/paranoia/templates/actor/parts/actor-societal-role.html",
    "actor-productivity-profile": "systems/paranoia/templates/actor/parts/actor-productivity-profile.html",
    "actor-dice-roller": "systems/paranoia/templates/actor/parts/actor-dice-roller.html",
    "actor-wellness-tab": "systems/paranoia/templates/actor/parts/actor-wellness-tab.html",
    "actor-naughty-side": "systems/paranoia/templates/actor/parts/actor-naughty-side.html",
    "actor-foundry-data": "systems/paranoia/templates/actor/parts/actor-foundry-data.html",

    // App partials.
    "skill-draft-assignments": "systems/paranoia/templates/partials/skill-draft-assignments.hbs",
    "skill-draft-turn-info": "systems/paranoia/templates/partials/skill-draft-turn-info.hbs",
    "skill-draft-complete": "systems/paranoia/templates/partials/skill-draft-complete.hbs",
  };

  if( foundry.utils.isNewerVersion(game.version, "13")) {
    // If Foundry is version 13 or newer, use the new loadTemplates method
    return foundry.applications.handlebars.loadTemplates(templates);
  }
  
  return loadTemplates(templates);
};
