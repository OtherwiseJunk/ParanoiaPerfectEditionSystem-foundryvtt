/**
 * This file is run by Vitest before any tests are executed.
 * It sets up a mock environment to simulate Foundry VTT's global objects.
 */

class MockApplication { }
class MockActor { }

global.Application = MockApplication;
global.Actor = MockActor;

global.game = {
    actors: {
        get: (id) => ({ id, name: `Player ${id}` })
    },
    socket: {
        emit: () => { }
    },
    user: { isGM: true }
};

global.ui = {
    notifications: {
        info: () => { },
        warn: () => { },
        error: () => { }
    }
};

global.Handlebars = {
    helpers: {
        formatSkillName: (name) => name
    }
};
