import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { chromium } from "@playwright/test";
import { login } from "../helpers/auth.js";
import { installWebGLStub } from "../helpers/game-page.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOTSTRAP_STATE_PATH = path.resolve(__dirname, "../.bootstrap-state.json");

const WORLD_NAME = "e2e-test-world";

// Actor names used across specs — kept as constants so specs can import them.
export const ACTOR_NAMES = {
  troubleshooter: "E2E-Troubleshooter",
  troubleshooter2: "E2E-Troubleshooter-2",
  troubleshooter3: "E2E-Troubleshooter-3",
  nobody: "E2E-Nobody",
  somebody: "E2E-Somebody",
  accomplice: "E2E-Accomplice",
};

export const PLAYER_NAMES = {
  player1: "E2E-Player-1",
  player2: "E2E-Player-2",
};

// Known-good defaults stamped onto every troubleshooter so NODE calculations
// are predictable across test runs.
const DEFAULT_ABILITY_VALUES = {
  "system.abilities.brains.value": 4,
  "system.abilities.brains.skills.alphaComplex.value": 0,
  "system.abilities.brains.skills.bureaucracy.value": 0,
  "system.abilities.brains.skills.psychology.value": 0,
  "system.abilities.brains.skills.science.value": 0,
  "system.abilities.chutzpah.value": 4,
  "system.abilities.chutzpah.skills.bluff.value": 0,
  "system.abilities.chutzpah.skills.charm.value": 0,
  "system.abilities.chutzpah.skills.intimidate.value": 0,
  "system.abilities.chutzpah.skills.stealth.value": 0,
  "system.abilities.mechanics.value": 4,
  "system.abilities.mechanics.skills.demolitions.value": 0,
  "system.abilities.mechanics.skills.engineer.value": 0,
  "system.abilities.mechanics.skills.operate.value": 0,
  "system.abilities.mechanics.skills.program.value": 0,
  "system.abilities.violence.value": 4,
  "system.abilities.violence.skills.athletics.value": 0,
  "system.abilities.violence.skills.guns.value": 2,
  "system.abilities.violence.skills.melee.value": 0,
  "system.abilities.violence.skills.throw.value": 0,
  "system.health.value": 4,
  "system.health.max": 4,
  "system.flag.value": 0,
  "system.flag.max": 4,
};

async function readBootstrapState() {
  try {
    return JSON.parse(await fs.readFile(BOOTSTRAP_STATE_PATH, "utf-8"));
  } catch {
    return null;
  }
}

async function writeBootstrapState(state) {
  await fs.mkdir(path.dirname(BOOTSTRAP_STATE_PATH), { recursive: true });
  await fs.writeFile(BOOTSTRAP_STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

async function waitForGameReady(page, timeoutMs = 60_000) {
  await page.waitForFunction(
    () => typeof game !== "undefined" && game.ready === true && typeof game.actors !== "undefined",
    undefined,
    { timeout: timeoutMs },
  );
}

// ---------------------------------------------------------------------------
// Setup auth helpers
// ---------------------------------------------------------------------------

async function ensureSetupAccess(page, baseURL) {
  await page.goto(`${baseURL}/setup`, { waitUntil: "domcontentloaded" });
  const url = page.url();

  if (url.includes("/license")) {
    console.log("[bootstrap] Accepting EULA…");
    await page.evaluate(async () => {
      await fetch("/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "license", id: "" }),
      });
    });
    await page.goto(`${baseURL}/setup`, { waitUntil: "domcontentloaded" });
  }

  if (page.url().includes("/auth") || page.url().includes("/admin")) {
    console.log("[bootstrap] Authenticating as admin…");
    await page.evaluate(async (password) => {
      await fetch("/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: password }),
      });
    }, "admin");
    await page.goto(`${baseURL}/setup`, { waitUntil: "domcontentloaded" });
  }

  if (!page.url().includes("/setup")) {
    throw new Error(`[bootstrap] Could not reach setup page. Current URL: ${page.url()}`);
  }
}

// ---------------------------------------------------------------------------
// Entity helpers — each is idempotent (checks before creating)
// ---------------------------------------------------------------------------

async function ensureWorld(page, baseURL) {
  await ensureSetupAccess(page, baseURL);

  const result = await page.evaluate(
    async (data) => {
      const resp = await fetch("/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createWorld", ...data }),
      });
      if (!resp.ok) throw new Error(`createWorld HTTP ${resp.status}`);
      return resp.json();
    },
    {
      id: WORLD_NAME,
      title: WORLD_NAME,
      system: "paranoia",
      background: "",
      description: "Automated e2e test world — do not modify manually.",
      resetKeys: false,
      safeMode: false,
    },
  );

  if (result.error) {
    if (result.error.includes("already exists")) {
      console.log(`[bootstrap] World already exists.`);
    } else {
      throw new Error(`createWorld error: ${result.error}`);
    }
  } else {
    console.log(`[bootstrap] World created.`);
  }

  return true;
}

async function joinWorld(page, baseURL) {
  await page.evaluate(async (name) => {
    await fetch("/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "launchWorld", world: name }),
    });
  }, WORLD_NAME);

  // Poll /api/status until the world is active (up to 90s)
  let active = false;
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(2000);
    try {
      const status = await fetch(`${baseURL}/api/status`).then((r) => r.json());
      if (status.active === true && status.world === WORLD_NAME) {
        active = true;
        break;
      }
    } catch {
      // server not ready yet
    }
  }
  if (!active) throw new Error("World did not become active within 90s.");

  await login(page, { baseURL, username: "Gamemaster", password: "" });
  await waitForGameReady(page);
  console.log(`[bootstrap] Joined world; game is ready.`);
}

async function ensureActor(page, name, type, updates = null) {
  let exists = await page.evaluate((n) => !!game.actors?.find((a) => a.name === n), name);

  if (!exists) {
    console.log(`[bootstrap] Creating actor "${name}" (${type})…`);
    await page.evaluate(async ({ n, t }) => Actor.implementation.create({ name: n, type: t }), {
      n: name,
      t: type,
    });

    exists = await page.evaluate((n) => !!game.actors?.find((a) => a.name === n), name);
    if (!exists) throw new Error(`Failed to create actor "${name}".`);
  }

  if (updates) {
    await page.evaluate(
      async ({ n, u }) => {
        const actor = game.actors.find((a) => a.name === n);
        await actor.update(u);
      },
      { n: name, u: updates },
    );
  }

  return true;
}

async function ensurePlayerUser(page, userName, characterName) {
  const alreadyExists = await page.evaluate(
    (n) => !!game.users?.find((u) => u.name === n),
    userName,
  );

  if (!alreadyExists) {
    console.log(`[bootstrap] Creating player user "${userName}"…`);
    await page.evaluate(async (n) => {
      await User.create({ name: n, role: CONST.USER_ROLES.PLAYER, password: "" });
    }, userName);

    const created = await page.evaluate((n) => !!game.users?.find((u) => u.name === n), userName);
    if (!created) throw new Error(`Failed to create user "${userName}".`);
  }

  // Always re-set character assignment so it survives re-runs.
  await page.evaluate(
    async ({ uName, aName }) => {
      const user = game.users.find((u) => u.name === uName);
      const actor = game.actors.find((a) => a.name === aName);
      if (!user || !actor) throw new Error(`Cannot link ${uName} → ${aName}: not found`);

      await user.update({ character: actor.id });

      const ownership = { ...actor.ownership, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER };
      await actor.update({ ownership });
    },
    { uName: userName, aName: characterName },
  );

  console.log(`[bootstrap] Player "${userName}" linked to "${characterName}".`);
  return true;
}

async function ensureEmbeddedEquipment(page, actorName) {
  const hasEquipment = await page.evaluate((n) => {
    const actor = game.actors.find((a) => a.name === n);
    return actor?.items.size > 0;
  }, actorName);

  if (!hasEquipment) {
    console.log(`[bootstrap] Creating embedded equipment on "${actorName}"…`);
    await page.evaluate(async (n) => {
      const actor = game.actors.find((a) => a.name === n);
      await actor.createEmbeddedDocuments("Item", [
        {
          name: "E2E-Laser-Pistol",
          type: "equipment",
          system: { type: "publicGear", level: 1, clearance: "Red", description: "" },
        },
        {
          name: "E2E-Treason-Device",
          type: "equipment",
          system: { type: "treasonousGear", level: 2, clearance: "Infrared", description: "" },
        },
      ]);
    }, actorName);
  }
  return true;
}

async function ensureWorldItem(page, itemName) {
  const exists = await page.evaluate((n) => !!game.items?.find((i) => i.name === n), itemName);

  if (!exists) {
    console.log(`[bootstrap] Creating world item "${itemName}"…`);
    await page.evaluate(async (n) => {
      await Item.create({
        name: n,
        type: "equipment",
        system: { type: "publicGear", level: 1, clearance: "Red", description: "" },
      });
    }, itemName);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default async function bootstrap({
  baseURL = "http://foundryvtt:30000",
  majorVersion = 13,
  force = false,
} = {}) {
  if (!force) {
    const existing = await readBootstrapState();
    if (
      existing?.worldExists &&
      existing?.actorExists &&
      existing?.extraTroubleshootersExist &&
      existing?.npcActorsExist &&
      existing?.playersExist &&
      existing?.equipmentExist
    ) {
      console.log(
        `[bootstrap] Skipping — all entities exist (lastRun: ${existing.lastRun}). Pass force=true to re-run.`,
      );
      return;
    }
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      // Disable WebGL so PIXI.js falls back to Canvas 2D renderer.
      // Without GPU in the devcontainer, PIXI crashes in _detectFormats
      // when the WebGL context is null and getExtension() throws.
      "--disable-webgl",
      "--disable-webgl2",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, // Foundry requires ≥ 1366×768
  });
  const page = await context.newPage();

  // PIXI.js crashes in _detectFormats when canvas.getContext('webgl') returns
  // null (no GPU in the CI/devcontainer); the stub lets it fall back to Canvas 2D.
  await installWebGLStub(page);

  page.on("pageerror", (err) =>
    console.log("[bootstrap:browser-error]", err.message, "\n", err.stack?.slice(0, 600)),
  );
  page.on("console", (msg) => {
    if (msg.type() === "error")
      console.log("[bootstrap:browser-console-error]", msg.text().slice(0, 400));
  });

  try {
    // Check if a world is already active (e.g. previous test run left it running).
    const statusResp = await fetch(`${baseURL}/api/status`);
    const statusData = await statusResp.json();
    const worldAlreadyActive = statusData.active === true && statusData.world === WORLD_NAME;

    let worldExists;
    if (worldAlreadyActive) {
      console.log(`[bootstrap] World already active; joining directly.`);
      worldExists = true;
      await login(page, { baseURL, username: "Gamemaster", password: "" });
      await waitForGameReady(page);
    } else {
      worldExists = await ensureWorld(page, baseURL);
      await joinWorld(page, baseURL);
    }

    // Primary troubleshooter
    const actorExists = await ensureActor(
      page,
      ACTOR_NAMES.troubleshooter,
      "troubleshooter",
      DEFAULT_ABILITY_VALUES,
    );

    // Party troubleshooters (for treason circle / skill draft)
    await ensureActor(page, ACTOR_NAMES.troubleshooter2, "troubleshooter", DEFAULT_ABILITY_VALUES);
    await ensureActor(page, ACTOR_NAMES.troubleshooter3, "troubleshooter", DEFAULT_ABILITY_VALUES);
    const extraTroubleshootersExist = true;

    // Player users linked to their troubleshooters
    await ensurePlayerUser(page, PLAYER_NAMES.player1, ACTOR_NAMES.troubleshooter2);
    await ensurePlayerUser(page, PLAYER_NAMES.player2, ACTOR_NAMES.troubleshooter3);
    const playersExist = true;

    // NPC actors
    await ensureActor(page, ACTOR_NAMES.nobody, "nobody");
    await ensureActor(page, ACTOR_NAMES.somebody, "somebody");
    await ensureActor(page, ACTOR_NAMES.accomplice, "accomplice");
    const npcActorsExist = true;

    // Embedded equipment on primary troubleshooter
    await ensureEmbeddedEquipment(page, ACTOR_NAMES.troubleshooter);

    // World-level item for drag-drop tests
    await ensureWorldItem(page, "E2E-World-Laser-Pistol");
    const equipmentExist = true;

    await writeBootstrapState({
      worldExists,
      actorExists,
      extraTroubleshootersExist,
      npcActorsExist,
      playersExist,
      equipmentExist,
      foundryVersion: majorVersion,
      lastRun: new Date().toISOString(),
    });
    console.log(`[bootstrap] Done.`);
  } finally {
    await browser.close();
  }
}

export { bootstrap };
