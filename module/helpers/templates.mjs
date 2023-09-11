/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/paranoia/templates/actor/parts/actor-societal-role.html",
    "systems/paranoia/templates/actor/parts/actor-productivity-profile.html",
    "systems/paranoia/templates/actor/parts/actor-dice-roller.html",
    "systems/paranoia/templates/actor/parts/actor-wellness-tab.html",
    "systems/paranoia/templates/actor/parts/actor-naughty-side.html",
  ]);
};
