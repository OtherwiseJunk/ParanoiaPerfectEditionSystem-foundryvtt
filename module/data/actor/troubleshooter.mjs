import { resourceField, skillField } from "../index.mjs";
import { SystemSettingsKeys } from "../../settings/settings.mjs";

export class ParanoiaTroubleshooterData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const { SchemaField, NumberField, StringField } = foundry.data.fields;
        const maximumMoxie = game.settings.get(SystemSettingsKeys.SYSTEM, SystemSettingsKeys.MAXIMUM_MOXIE);
        const startingXP = game.settings.get(SystemSettingsKeys.SYSTEM, SystemSettingsKeys.STARTING_XP);

        return {
            health: resourceField(4, 4),
            flag: resourceField(0, 4),
            moxie: resourceField(8, maximumMoxie),
            team: new StringField(),
            mbd: new StringField(),
            serviceGroup: new StringField(),
            treasonButton: new StringField(),
            violenceButton: new StringField(),
            abilities: new SchemaField({
                brains: new SchemaField({
                    label: new StringField({ initial: "Brains" }),
                    value: new NumberField({ initial: 0 }),
                    skills: new SchemaField({
                        alphaComplex: skillField("Alpha Complex", 0),
                        bureaucracy: skillField("Bureaucracy", 0),
                        psychology: skillField("Psychology", 0),
                        science: skillField("Science", 0)
                    })
                }),
                chutzpah: new SchemaField({
                    label: new StringField({ initial: "Chutzpah" }),
                    value: new NumberField({ initial: 0 }),
                    skills: new SchemaField({
                        bluff: skillField("Bluff", 0),
                        charm: skillField("Charm", 0),
                        intimidate: skillField("Intimidate", 0),
                        stealth: skillField("Stealth", 0)
                    })
                }),
                mechanics: new SchemaField({
                    label: new StringField({ initial: "Mechanics" }),
                    value: new NumberField({ initial: 0 }),
                    skills: new SchemaField({
                        demolitions: skillField("Demolitions", 0),
                        engineer: skillField("Engineer", 0),
                        operate: skillField("Operate", 0),
                        program: skillField("Program", 0)
                    })
                }),
                violence: new SchemaField({
                    label: new StringField({ initial: "Violence" }),
                    value: new NumberField({ initial: 0 }),
                    skills: new SchemaField({
                        athletics: skillField("Athletics", 0),
                        guns: skillField("Guns", 2),
                        melee: skillField("Melee", 0),
                        throw: skillField("Throw", 0)
                    })
                })
            }),
            xp: new NumberField({ initial: startingXP }),
            missionObjectives: new StringField({ initial: "When you are given your assignment you can keep track of the objective here, that way you don't forget anything important, Citizen!" }),
            assignedGear: new StringField({ initial: "List any of the gear you're responsible for here. Be sure to keep it in tip-top shape!" }),
            secrets: new SchemaField({
                aliases: new StringField({ initial: "List your alternative identities. Perfect for when you need to blend in... or stand out!" }),
                secretObjective: new StringField({ initial: "Record your covert mission. Stay discreet; we wouldn't want any surprises, would we?" }),
                serviceGroupFavors: new StringField({ initial: "Track favors owed to you by your service group and those you've called in. Cooperation keeps Alpha Complex running smoothly!" }),
                secretSociety: new StringField({ initial: "Document your treasonous society. Remember, revealing this could lead to unauthorized fun!" }),
                mutantPower: new StringField({ initial: "Note your forbidden abilities. Remember, unauthorized mutations are not a laughing matter... unless they're hilarious!" }),
                secretSocietyFavors: new StringField({ initial: "Note favors from your society and any favors asked of you by Fellow members. Loyalty earns perks... and sometimes, extra lives!" }),
                treasonousGear: new StringField({ initial: "Catalog illegal items here. Not that you would have anything like that, of course." }),
                evidence: new StringField({ initial: "Log evidence against traitors. Blackmail can be such a delightful team-building exercise!" }),
                notes: new StringField({ initial: "Keep track of any other interesting, potentially-treasonous details. A well-documented traitor is a well-prepared traitor!" })
            })
        }
    }
}
