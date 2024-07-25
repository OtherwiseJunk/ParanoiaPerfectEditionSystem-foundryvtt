export class ParanoiaActor extends ActorSheet {
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
