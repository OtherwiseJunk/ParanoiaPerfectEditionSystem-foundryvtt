import { ParanoiaActor } from "./actor-sheet.mjs";
export class ParanoiaSomebodySheet extends ParanoiaActor {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["paranoia", "sheet", "actor"],
      template: "systems/paranoia/templates/actor/somebody-sheet.html",
      width: 1100,
      height: 475
    });
  }
  async getData(){
    const data = super.getData();
    const actorData = this.actor.toObject(false);

    data.system = actorData.system;

    data.enrichedLooks = await TextEditor.enrichHTML(data.system.looks)
    data.enrichedQuirks = await TextEditor.enrichHTML(data.system.quirks)
    data.enrichedPlans = await TextEditor.enrichHTML(data.system.plans)
    data.enrichedBasics = await TextEditor.enrichHTML(data.system.basics)
    data.enrichedGear = await TextEditor.enrichHTML(data.system.gear)
    data.enrichedQuote = await TextEditor.enrichHTML(data.system.quote)

    return data
  }
}
