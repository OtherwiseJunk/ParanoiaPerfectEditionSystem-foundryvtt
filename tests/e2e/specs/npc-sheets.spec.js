import { test, expect } from "@playwright/test";
import { selectors } from "../helpers/selectors.js";
import { ACTOR_NAMES } from "../setup/bootstrap.js";

const BASE_URL = process.env.FOUNDRY_URL ?? "http://foundryvtt:30000";

test.describe("NPC Sheets", () => {
  test.use({ storageState: "tests/e2e/.auth/state.json" });

  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/state.json" });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => typeof game !== "undefined" && game.ready === true,
      { timeout: 60_000 },
    );
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test.afterEach(async () => {
    await page.evaluate(() => {
      Object.values(ui.windows).forEach((w) => { try { w.close(); } catch { /**/ } });
    }).catch(() => {});
  });

  async function openActorSheet(actorName) {
    await page.evaluate(async (name) => {
      const actor = game.actors.find((a) => a.name === name);
      if (!actor) throw new Error(`Actor "${name}" not found.`);
      actor.sheet.render(true);
    }, actorName);
  }

  // -------------------------------------------------------------------------
  // Nobody
  // -------------------------------------------------------------------------

  test.describe("Nobody sheet", () => {
    test.beforeEach(async () => openActorSheet(ACTOR_NAMES.nobody));

    test("opens and displays the actor name", async () => {
      const sheet = page.locator(selectors.actorSheet.nobody).first();
      await expect(sheet).toBeVisible({ timeout: 10_000 });
      const nameInput = sheet.locator(selectors.actorSheet.nameInput);
      await expect(nameInput).toHaveValue(ACTOR_NAMES.nobody);
    });

    test("has Looks, Quirks and Plans editor sections", async () => {
      const sheet = page.locator(selectors.actorSheet.nobody).first();
      await expect(sheet).toBeVisible({ timeout: 10_000 });
      await expect(sheet.locator('label[for="system.looks"]')).toBeVisible();
      await expect(sheet.locator('label[for="system.quirks"]')).toBeVisible();
      await expect(sheet.locator('label[for="system.plans"]')).toBeVisible();
    });

    test("name field is editable", async () => {
      const sheet = page.locator(selectors.actorSheet.nobody).first();
      await expect(sheet).toBeVisible({ timeout: 10_000 });
      const nameInput = sheet.locator(selectors.actorSheet.nameInput);
      await nameInput.fill("E2E-Nobody-Renamed");
      await nameInput.press("Tab");
      await expect(nameInput).toHaveValue("E2E-Nobody-Renamed");
      // Restore
      await nameInput.fill(ACTOR_NAMES.nobody);
      await nameInput.press("Tab");
    });
  });

  // -------------------------------------------------------------------------
  // Somebody
  // -------------------------------------------------------------------------

  test.describe("Somebody sheet", () => {
    test.beforeEach(async () => openActorSheet(ACTOR_NAMES.somebody));

    test("opens and displays the actor name", async () => {
      const sheet = page.locator(selectors.actorSheet.somebody).first();
      await expect(sheet).toBeVisible({ timeout: 10_000 });
      const nameInput = sheet.locator(selectors.actorSheet.nameInput);
      await expect(nameInput).toHaveValue(ACTOR_NAMES.somebody);
    });

    test("has Quote, Looks, Quirks, Plans, Basics and Gear sections", async () => {
      const sheet = page.locator(selectors.actorSheet.somebody).first();
      await expect(sheet).toBeVisible({ timeout: 10_000 });
      await expect(sheet.locator('label[for="system.plans"]').first()).toBeVisible();
      await expect(sheet.locator('label[for="system.looks"]')).toBeVisible();
      await expect(sheet.locator('label[for="system.quirks"]')).toBeVisible();
      await expect(sheet.locator('label[for="system.basics"]')).toBeVisible();
      await expect(sheet.locator('label[for="system.gear"]')).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Accomplice
  // -------------------------------------------------------------------------

  test.describe("Accomplice sheet", () => {
    test.beforeEach(async () => openActorSheet(ACTOR_NAMES.accomplice));

    test("opens and displays the actor name", async () => {
      const sheet = page.locator(selectors.actorSheet.accomplice).first();
      await expect(sheet).toBeVisible({ timeout: 10_000 });
      const nameInput = sheet.locator(selectors.actorSheet.nameInput);
      await expect(nameInput).toHaveValue(ACTOR_NAMES.accomplice);
    });

    test("has health and moxie fields", async () => {
      const sheet = page.locator(selectors.actorSheet.accomplice).first();
      await expect(sheet).toBeVisible({ timeout: 10_000 });
      await expect(sheet.locator('input[name="system.health.value"]')).toBeVisible();
      await expect(sheet.locator('input[name="system.moxie.value"]')).toBeVisible();
    });

    test("has Mutant Powers editor section", async () => {
      const sheet = page.locator(selectors.actorSheet.accomplice).first();
      await expect(sheet).toBeVisible({ timeout: 10_000 });
      await expect(sheet.locator('label[for="system.mutantPowers"]')).toBeVisible();
    });
  });
});
