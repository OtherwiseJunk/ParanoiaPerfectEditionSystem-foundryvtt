export class ParanoiaEquipmentData extends foundry.abstract.TypeDataModel {

    static defineSchema() {
        const { StringField, BooleanField, NumberField } = foundry.data.fields;

        return {
            description: new StringField(),
            level: new NumberField(),
            clearance: new StringField(),
            success: new StringField(),
            treason: new StringField(),
            assigned: new BooleanField({ initial: false }),
            type: new StringField()
        }
    }
}
