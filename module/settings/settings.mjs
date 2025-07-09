export class SystemSettingsKeys {
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
    game.settings.register(SystemSettingsKeys.SYSTEM, SystemSettingsKeys.MAXIMUM_MOXIE, {
        name: "Maximum Moxie",
        hint: "The maximum number of Moxie points a character can have.",
        scope: "world",
        config: true,
        default: 8,
        type: Number,
        requiresReload: true
    });

    game.settings.register(SystemSettingsKeys.SYSTEM, SystemSettingsKeys.STARTING_XP, {
        name: "Starting XP Points",
        hint: "The number of XP points a character starts with.",
        scope: "world",
        config: true,
        default: 200,
        type: Number,
        requiresReload: true
    });
}
