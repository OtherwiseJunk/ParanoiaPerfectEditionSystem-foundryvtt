import path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "@playwright/test";
import { ACTOR_NAMES, PLAYER_NAMES } from "../setup/bootstrap.js";
import { login } from "../helpers/auth.js";
import { openGamePage, waitForGameReady, installWebGLStub } from "../helpers/game-page.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.FOUNDRY_URL ?? "http://foundryvtt:30000";
const PLAYER_STATE_PATH = path.resolve(__dirname, "../.auth/player-state.json");
const SOCKET_CHANNEL = "system.paranoia";

async function clearChat(page) {
  await page
    .evaluate(async () => {
      const ids = game.messages.map((m) => m.id);
      if (ids.length) await ChatMessage.deleteDocuments(ids);
    })
    .catch(() => {});
}

test.describe("Skill Draft", () => {
  /** @type {import('@playwright/test').Page} */
  let gmPage;
  /** @type {import('@playwright/test').Page} */
  let playerPage;

  // Fresh GM + player pages per test. Foundry re-renders asynchronously and a
  // shared page accumulates instability across the multi-step draft flow.
  test.beforeEach(async ({ browser }) => {
    // GM context.
    gmPage = await openGamePage(browser, { baseURL: BASE_URL });

    // Player context — log in as E2E-Player-1, saved to a separate state file so
    // the GM's state.json is not overwritten. The WebGL stub must be installed
    // before login navigates to /game, or PIXI crashes and game.ready never fires.
    const playerContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    await installWebGLStub(playerContext);
    playerPage = await playerContext.newPage();
    await login(playerPage, {
      baseURL: BASE_URL,
      username: PLAYER_NAMES.player1,
      password: "",
      statePath: PLAYER_STATE_PATH,
    });
    await waitForGameReady(playerPage);

    await clearChat(gmPage);
  });

  test.afterEach(async () => {
    await gmPage?.context().close();
    await playerPage?.context().close();
  });

  // -------------------------------------------------------------------------
  // Controller UI — GM-only
  // -------------------------------------------------------------------------

  test("GM can open the Skill Draft Controller", async () => {
    await gmPage.evaluate(() => new SkillDraftController().render(true));
    await expect(gmPage.locator("#paranoia-skill-draft-controller")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("controller shows player-owned actors in the participant list", async () => {
    await gmPage.evaluate(() => new SkillDraftController().render(true));
    const select = gmPage.locator("#paranoia-skill-draft-controller select[name='participants']");
    await expect(select).toBeVisible({ timeout: 10_000 });

    const optionLabels = await select.locator("option").allTextContents();
    expect(optionLabels).toContain(ACTOR_NAMES.troubleshooter2);
    expect(optionLabels).toContain(ACTOR_NAMES.troubleshooter3);
  });

  test("controller starts in pending state with the Start Draft button visible", async () => {
    await gmPage.evaluate(() => new SkillDraftController().render(true));
    const controller = gmPage.locator("#paranoia-skill-draft-controller");
    await expect(controller).toBeVisible({ timeout: 10_000 });
    await expect(controller.locator(".start-draft")).toBeVisible();
    await expect(controller.locator("select[name='participants']")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Full happy path — two contexts
  // -------------------------------------------------------------------------

  test("starting a draft opens the player UI on the player's page", async () => {
    // Open controller and select both player-owned actors.
    await gmPage.evaluate(() => new SkillDraftController().render(true));
    const controller = gmPage.locator("#paranoia-skill-draft-controller");
    await expect(controller).toBeVisible({ timeout: 10_000 });

    await gmPage.evaluate(
      ([name2, name3]) => {
        const select = document.querySelector(
          "#paranoia-skill-draft-controller select[name='participants']",
        );
        const ids = game.actors.filter((a) => [name2, name3].includes(a.name)).map((a) => a.id);
        Array.from(select.options).forEach((opt) => {
          opt.selected = ids.includes(opt.value);
        });
      },
      [ACTOR_NAMES.troubleshooter2, ACTOR_NAMES.troubleshooter3],
    );

    await controller.locator(".start-draft").click();

    await expect(playerPage.locator("#paranoia-skill-draft-player")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("completing all draft rounds applies skill assignments to both actors", async () => {
    await gmPage.evaluate(() => new SkillDraftController().render(true));
    const controller = gmPage.locator("#paranoia-skill-draft-controller");
    await expect(controller).toBeVisible({ timeout: 10_000 });

    // Get actor IDs upfront.
    const { actor2Id, actor3Id } = await gmPage.evaluate(
      ([n2, n3]) => ({
        actor2Id: game.actors.find((a) => a.name === n2)?.id,
        actor3Id: game.actors.find((a) => a.name === n3)?.id,
      }),
      [ACTOR_NAMES.troubleshooter2, ACTOR_NAMES.troubleshooter3],
    );

    if (!actor2Id || !actor3Id) throw new Error("Test actors not found — run bootstrap first.");

    // Select both actors and start.
    await gmPage.evaluate(
      ([id2, id3]) => {
        const select = document.querySelector(
          "#paranoia-skill-draft-controller select[name='participants']",
        );
        Array.from(select.options).forEach((opt) => {
          opt.selected = opt.value === id2 || opt.value === id3;
        });
      },
      [actor2Id, actor3Id],
    );

    await controller.locator(".start-draft").click();
    await expect(playerPage.locator("#paranoia-skill-draft-player")).toBeVisible({
      timeout: 15_000,
    });

    // Drive all 10 picks (5 rounds × 2 players). The number of chat messages a
    // pick produces varies, so synchronise on the controller's own state: the
    // total count of assigned-skill keys is strictly monotonic (keys are only
    // ever added), so we wait for it to grow after each pick.
    for (let pick = 0; pick < 10; pick++) {
      const { currentActorId, availableSkills, assignedBefore } = await gmPage.evaluate(() => {
        const ctrl = Object.values(ui.windows).find(
          (w) => w.id === "paranoia-skill-draft-controller",
        );
        const assigned = Object.values(ctrl.state.assignments).reduce(
          (n, o) => n + Object.keys(o).length,
          0,
        );
        return {
          currentActorId: ctrl.state.participants[ctrl.state.currentPlayerIndex],
          availableSkills: [...ctrl.state.availableSkills],
          assignedBefore: assigned,
        };
      });

      const skill = availableSkills[0];
      if (!skill) throw new Error(`No available skills on pick ${pick + 1}`);

      if (currentActorId === actor2Id) {
        // E2E-Player-1's turn — click the skill button on the player page.
        await playerPage.locator(`.skill-button[data-skill="${skill}"]`).click();
      } else {
        // E2E-Player-2's turn — simulate socket from player page (the controller
        // validates actorId, not which socket the event came from).
        await playerPage.evaluate(
          ({ channel, actorId, skillName }) => {
            game.socket.emit(channel, {
              event: "playerSkillSelected",
              data: { actorId, skill: skillName },
            });
          },
          { channel: SOCKET_CHANNEL, actorId: actor3Id, skillName: skill },
        );
      }

      // Wait for the controller to record the pick (assignment key count grows).
      await gmPage.waitForFunction(
        (before) => {
          const ctrl = Object.values(ui.windows).find(
            (w) => w.id === "paranoia-skill-draft-controller",
          );
          if (!ctrl) return false;
          const assigned = Object.values(ctrl.state.assignments).reduce(
            (n, o) => n + Object.keys(o).length,
            0,
          );
          return assigned > before;
        },
        assignedBefore,
        { timeout: 15_000 },
      );
    }

    // Controller should now show the completed state.
    await gmPage.waitForFunction(
      () =>
        Object.values(ui.windows).find((w) => w.id === "paranoia-skill-draft-controller")?.state
          .status === "complete",
      undefined,
      { timeout: 15_000 },
    );

    // Player app should have closed automatically.
    await expect(playerPage.locator("#paranoia-skill-draft-player")).not.toBeVisible({
      timeout: 10_000,
    });

    // Verify at least one positive skill was applied to each actor.
    const actor2PositiveSkills = await gmPage.evaluate((id) => {
      const actor = game.actors.get(id);
      return Object.values(actor.system.abilities)
        .flatMap((ab) => Object.values(ab.skills).map((s) => s.value))
        .filter((v) => v > 0).length;
    }, actor2Id);

    const actor3PositiveSkills = await gmPage.evaluate((id) => {
      const actor = game.actors.get(id);
      return Object.values(actor.system.abilities)
        .flatMap((ab) => Object.values(ab.skills).map((s) => s.value))
        .filter((v) => v > 0).length;
    }, actor3Id);

    expect(actor2PositiveSkills).toBeGreaterThan(0);
    expect(actor3PositiveSkills).toBeGreaterThan(0);
  });
});
