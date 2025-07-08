import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // This tells Vitest to run our setup file before executing the tests.
        setupFiles: ['./tests/setup.js'],
    },
});
