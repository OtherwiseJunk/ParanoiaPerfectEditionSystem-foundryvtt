export class SettingsKeys {
    static get SYSTEM() {
        return "paranoia";
    }
    static get MAXIMUM_MOXIE() {
        return "maximumMoxie";
    }

    static get STARTING_XP() {
        return "startingXP";
    }
}

export function registerGameSettings() {
    game.settings.register(SettingsKeys.SYSTEM, SettingsKeys.MAXIMUM_MOXIE, {
        name: "Maximum Moxie",
        hint: "The maximum number of Moxie points a character can have.",
        scope: "world",
        config: true,
        default: 8,
        type: Number,
        requiresReload: true
    });

    game.settings.register(SettingsKeys.SYSTEM, SettingsKeys.STARTING_XP, {
        name: "Starting XP Points",
        hint: "The number of XP points a character starts with.",
        scope: "world",
        config: true,
        default: 200,
        type: Number,
        requiresReload: true
    });
}
