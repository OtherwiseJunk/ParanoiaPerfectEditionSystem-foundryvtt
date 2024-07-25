import { ParanoiaSomebodyData, resourceField } from "../index.mjs";

export class ParanoiaAccompliceData extends ParanoiaSomebodyData {

    static defineSchema() {
        const { SchemaField, StringField } = foundry.data.fields;

        const parentFields = super.defineSchema();
        return {
            ...parentFields,
            moxie: resourceField(8, 99),
            mutantPower: new StringField(),
            health: resourceField(4, 4)
        }
    }
}
