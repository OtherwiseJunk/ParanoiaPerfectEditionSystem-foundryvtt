const { NumberField, StringField, SchemaField } = foundry.data.fields;

export function resourceField(initialValue, initialMax) {
    return new SchemaField({
      // Make sure to call new so you invoke the constructor!
      min: new NumberField({ initial: 0 }),
      value: new NumberField({ initial: initialValue }),
      max: new NumberField({ initial: initialMax }),
    });
}

export function skillField(fieldLabel, initialValue){
    return new SchemaField({
        label: new StringField({ initial: fieldLabel }),
        value: new NumberField({ initial: initialValue })
    });
}