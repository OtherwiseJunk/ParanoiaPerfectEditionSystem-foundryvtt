export class ParanoiaNobodyData extends foundry.abstract.TypeDataModel {

    static defineSchema() {
        const { StringField } = foundry.data.fields;

        return {
            looks: new StringField(),
            plans: new StringField(),
            quirks: new StringField(),
        }
    }
}