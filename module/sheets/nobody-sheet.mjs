export class ParanoiaNobodySheet extends ActorSheet {
      /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["paranoia", "sheet", "actor"],
      template: "systems/paranoia/templates/actor/nobody-sheet.html",
      width: 800,
      height: 275
    });
  }
    /** @override */
    get template() {
        return `systems/paranoia/templates/actor/${this.actor.type}-sheet.html`;
    }

    /** @override */
    getData() {
        const data = super.getData();

        const actorData = this.actor.toObject(false);
        data.system = actorData.system;

        return data;
    }
}
