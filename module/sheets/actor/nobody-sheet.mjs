import { ParanoiaActor } from "./actor-sheet.mjs";

export class ParanoiaNobodySheet extends ParanoiaActor {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["paranoia", "sheet", "actor"],
      template: "systems/paranoia/templates/actor/nobody-sheet.html",
      width: 1100,
      height: 350
    });
  }
}
