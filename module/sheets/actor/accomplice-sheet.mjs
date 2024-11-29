import { ParanoiaActor } from "./actor-sheet.mjs";
export class ParanoiaAccompliceSheet extends ParanoiaActor {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["paranoia", "sheet", "actor"],
      template: "systems/paranoia/templates/actor/accomplice-sheet.html",
      width: 1100,
      height: 425
    });
  }

  /** @override */
  getData() {
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

    return data;
  }
}
