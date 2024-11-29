import { ParanoiaActor } from "./actor-sheet.mjs";
export class ParanoiaSomebodySheet extends ParanoiaActor {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["paranoia", "sheet", "actor"],
      template: "systems/paranoia/templates/actor/somebody-sheet.html",
      width: 1100,
      height: 425
    });
  }
}
