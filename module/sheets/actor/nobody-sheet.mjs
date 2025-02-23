import { ParanoiaActor } from "./actor-sheet.mjs";

export class ParanoiaNobodySheet extends ParanoiaActor {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["paranoia", "sheet", "actor"],
      template: "systems/paranoia/templates/actor/nobody-sheet.html",
      width: 1100,
      height: 425
    });
  }

  async getData(){
    const data = super.getData();
    const actorData = this.actor.toObject(false);

    data.system = actorData.system;

    data.enrichedLooks = await TextEditor.enrichHTML(data.system.looks)
    data.enrichedQuirks = await TextEditor.enrichHTML(data.system.quirks)
    data.enrichedPlans = await TextEditor.enrichHTML(data.system.plans)

    return data
  }
}
