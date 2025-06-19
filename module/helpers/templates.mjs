/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  const templates = [

    // Actor partials.
    "systems/paranoia/templates/actor/parts/actor-societal-role.html",
    "systems/paranoia/templates/actor/parts/actor-productivity-profile.html",
    "systems/paranoia/templates/actor/parts/actor-dice-roller.html",
    "systems/paranoia/templates/actor/parts/actor-wellness-tab.html",
    "systems/paranoia/templates/actor/parts/actor-naughty-side.html",
    "systems/paranoia/templates/actor/parts/actor-foundry-data.html",
  ];

  if( foundry.utils.isNewerVersion(game.version, "13")) {
    // If Foundry is version 13 or newer, use the new loadTemplates method
    return foundry.applications.handlebars.loadTemplates(templates);
  }
  
  return loadTemplates(templates);
};
