import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AUTH_STATE_PATH = path.resolve(__dirname, "../.auth/state.json");

/**
 * Log in to FoundryVTT as `username` by interacting with the join form the way
 * Foundry's own JavaScript expects — selecting the user from the dropdown and
 * clicking the submit button. Foundry v13 handles this via its own client-side
 * form handler; raw POST /join bypasses that and leaves the session unauthenticated.
 */
export async function login(
  page,
  {
    baseURL = "http://foundryvtt:30000",
    username = "Gamemaster",
    password = "",
    statePath = AUTH_STATE_PATH,
  } = {},
) {
  await page.goto(`${baseURL}/join`, { waitUntil: "domcontentloaded" });

  // The join form is rendered via Socket.IO template delivery — wait for the
  // select to appear, which may take longer inside Docker devcontainers where
  // the WebSocket connection takes a few extra seconds to establish.
  await page.waitForSelector('select[name="userid"]', {
    state: "attached",
    timeout: 60_000,
  });

  await page.selectOption('select[name="userid"]', { label: username });

  if (password) {
    await page.fill('input[name="password"]', password);
  }

  // Foundry's JS intercepts the submit and navigates to /game
  await Promise.all([
    page.waitForURL("**/game", { timeout: 30_000 }),
    page.click('button[name="join"]'),
  ]);

  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await page.context().storageState({ path: statePath });
}

export { AUTH_STATE_PATH };
