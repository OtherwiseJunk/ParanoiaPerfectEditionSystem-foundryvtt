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

    static get ALLOW_NEGATIVE_XP() {
        return "allowNegativeXP";
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

    game.settings.register(SystemSettingsKeys.SYSTEM, SystemSettingsKeys.ALLOW_NEGATIVE_XP, {
        name: "Allow Negative XP",
        hint: "If enabled, characters can have negative XP.",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        requiresReload: true
    });
}
