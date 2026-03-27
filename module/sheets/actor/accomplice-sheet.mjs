import { ParanoiaActor } from "./actor-sheet.mjs";
import { getCompatibleTextEditor } from "../../utils/compatibility.mjs";
export class ParanoiaAccompliceSheet extends ParanoiaActor {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["paranoia", "sheet", "actor"],
      template: "systems/paranoia/templates/actor/accomplice-sheet.html",
      width: 1100,
      height: 475
    });
  }

  /** @override */
  async getData() {
    const data = super.getData();

    const actorData = this.actor.toObject(false);

    if (actorData.system.health == undefined) {
      actorData.system.health = {};
      actorData.system.health.value = 4;
    }

    if (actorData.system.moxie == undefined) {
      actorData.system.moxie = {};
      actorData.system.moxie.value = 8;
    }

    data.system = actorData.system;

    const textEditor = getCompatibleTextEditor();
    data.enrichedLooks = await textEditor.enrichHTML(data.system.looks)
    data.enrichedQuirks = await textEditor.enrichHTML(data.system.quirks)
    data.enrichedPlans = await textEditor.enrichHTML(data.system.plans)
    data.enrichedBasics = await textEditor.enrichHTML(data.system.basics)
    data.enrichedGear = await textEditor.enrichHTML(data.system.gear)
    data.enrichedMutantPowers = await textEditor.enrichHTML(data.system.mutantPowers)
    data.enrichedQuote = await textEditor.enrichHTML(data.system.quote)

    return data;
  }
}
