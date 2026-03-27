import { getCompatibleItemSheet, getCompatibleTextEditor } from "../../utils/compatibility.mjs";

export class ParanoiaEquipmentSheet extends getCompatibleItemSheet() {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['paranoia', 'sheet', 'item'],
            width: 1100,
            height: 450,
        });
    }

    /** @override */
    get template() {
        return `systems/paranoia/templates/equipment/equipment-sheet.html`;
    }

    /** @override */
    async getData() {
        const data = super.getData();

        const itemData = this.item.toObject(false);
        data.system = itemData.system;

        const textEditor = getCompatibleTextEditor();
        data.enrichedDescription = await textEditor.enrichHTML(data.system.description);
        data.enrichedSuccess = await textEditor.enrichHTML(data.system.success);
        data.enrichedTreason = await textEditor.enrichHTML(data.system.treason);

        return data;
    }
}