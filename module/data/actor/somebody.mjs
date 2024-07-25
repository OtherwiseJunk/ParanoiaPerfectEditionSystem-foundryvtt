import { ParanoiaNobodyData } from "./nobody.mjs";

export class ParanoiaSomebodyData extends ParanoiaNobodyData {

    static defineSchema() {
        const { StringField } = foundry.data.fields;

        const parentFields = super.defineSchema();
        return {
            ...parentFields,
            quote: new StringField(),
            basics: new StringField(),
            gear: new StringField(),
        }
    }
}