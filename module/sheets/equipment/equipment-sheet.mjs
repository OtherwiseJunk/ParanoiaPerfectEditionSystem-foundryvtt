export class ParanoiaEquipmentSheet extends ItemSheet {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['paranoia', 'sheet', 'item'],
            width: 800,
            height: 350,
        });
    }

    /** @override */
    get template() {
        return `systems/paranoia/templates/equipment/equipment-sheet.html`;
    }

    /** @override */
    getData() {
        const data = super.getData();

        const itemData = this.item.toObject(false);
        data.system = itemData.system;
        data.equipmentClearanceLevels = [
            "Infrared",
            "Red",
            "Orange",
            "Yellow",
            "Green",
            "Blue",
            "Indigo",
            "Violet",
            "Ultra Violet",
            "Treasonous"
        ]

        return data;
    }
}
