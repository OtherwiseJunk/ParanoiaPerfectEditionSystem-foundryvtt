import { test, expect } from "@playwright/test";
import { selectors } from "../helpers/selectors.js";
import { ACTOR_NAMES } from "../setup/bootstrap.js";

const BASE_URL = process.env.FOUNDRY_URL ?? "http://foundryvtt:30000";
const ACTOR_NAME = ACTOR_NAMES.troubleshooter;
const WORLD_ITEM_NAME = "E2E-World-Laser-Pistol";

test.describe("Equipment", () => {
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

  test.beforeEach(async () => {
    await page.evaluate(() => {
      Object.values(ui.windows).forEach((w) => { try { w.close(); } catch { /**/ } });
    }).catch(() => {});

    await page.evaluate(async (name) => {
      const actor = game.actors.find((a) => a.name === name);
      if (!actor) throw new Error(`Actor "${name}" not found.`);
      actor.sheet.render(true);
    }, ACTOR_NAME);

    await expect(page.locator(selectors.actorSheet.troubleshooter).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  // -------------------------------------------------------------------------
  // Drag-and-drop world item → public gear zone
  // -------------------------------------------------------------------------

  test("dragging a world item to the public gear zone creates a public gear entry", async () => {
    await page.locator(selectors.tabs.role).first().click();
    const dropZone = page.locator(selectors.gear.publicDropZone).first();
    const countBefore = await dropZone.locator(selectors.gear.item).count();

    await page.evaluate(
      async ({ actorName, itemName }) => {
        const actor = game.actors.find((a) => a.name === actorName);
        const item = game.items.find((i) => i.name === itemName);
        if (!actor || !item) throw new Error("Actor or item not found");

        const dropZoneEl = actor.sheet.element
          .find('.gear-list-container[data-drop-type="publicGear"]')[0];

        const dragData = JSON.stringify({ type: "Item", uuid: item.uuid });
        const dt = new DataTransfer();
        dt.setData("text/plain", dragData);

        const dropEvent = new DragEvent("drop", {
          dataTransfer: dt,
          bubbles: true,
          cancelable: true,
        });
        dropZoneEl.dispatchEvent(dropEvent);
      },
      { actorName: ACTOR_NAME, itemName: WORLD_ITEM_NAME },
    );

    await expect(dropZone.locator(selectors.gear.item)).toHaveCount(countBefore + 1, {
      timeout: 10_000,
    });
  });

  test("dragging a world item to the treasonous gear zone creates a treasonous gear entry", async () => {
    await page.locator(selectors.tabs.naughty).first().click();
    const dropZone = page.locator(selectors.gear.treasonousDropZone).first();
    const countBefore = await dropZone.locator(selectors.gear.item).count();

    await page.evaluate(
      async ({ actorName, itemName }) => {
        const actor = game.actors.find((a) => a.name === actorName);
        const item = game.items.find((i) => i.name === itemName);
        if (!actor || !item) throw new Error("Actor or item not found");

        const dropZoneEl = actor.sheet.element
          .find('.gear-list-container[data-drop-type="treasonousGear"]')[0];

        const dragData = JSON.stringify({ type: "Item", uuid: item.uuid });
        const dt = new DataTransfer();
        dt.setData("text/plain", dragData);

        const dropEvent = new DragEvent("drop", {
          dataTransfer: dt,
          bubbles: true,
          cancelable: true,
        });
        dropZoneEl.dispatchEvent(dropEvent);
      },
      { actorName: ACTOR_NAME, itemName: WORLD_ITEM_NAME },
    );

    await expect(dropZone.locator(selectors.gear.item)).toHaveCount(countBefore + 1, {
      timeout: 10_000,
    });
  });

  // -------------------------------------------------------------------------
  // Equipment sheet fields
  // -------------------------------------------------------------------------

  test("equipment sheet shows name, level, clearance and description fields", async () => {
    await page.locator(selectors.tabs.role).first().click();
    const dropZone = page.locator(selectors.gear.publicDropZone).first();

    if ((await dropZone.locator(selectors.gear.item).count()) === 0) {
      await page.locator(selectors.gear.createPublicBtn).first().click();
      await expect(dropZone.locator(selectors.gear.item)).toHaveCount(1, { timeout: 10_000 });
    }

    await dropZone.locator(selectors.gear.editBtn).first().click();

    const sheet = page.locator(selectors.equipmentSheet).first();
    await expect(sheet).toBeVisible({ timeout: 10_000 });
    await expect(sheet.locator('input[name="name"]')).toBeVisible();
    await expect(sheet.locator('input[name="system.level"]')).toBeVisible();
    await expect(sheet.locator('input[name="system.clearance"]')).toBeVisible();
  });

  test("equipment name is editable and persists", async () => {
    await page.locator(selectors.tabs.role).first().click();
    const dropZone = page.locator(selectors.gear.publicDropZone).first();

    if ((await dropZone.locator(selectors.gear.item).count()) === 0) {
      await page.locator(selectors.gear.createPublicBtn).first().click();
      await expect(dropZone.locator(selectors.gear.item)).toHaveCount(1, { timeout: 10_000 });
    }

    await dropZone.locator(selectors.gear.editBtn).first().click();

    const sheet = page.locator(selectors.equipmentSheet).first();
    await expect(sheet).toBeVisible({ timeout: 10_000 });

    const nameInput = sheet.locator('input[name="name"]');
    await nameInput.fill("E2E-Renamed-Gear");
    await nameInput.press("Tab");
    await expect(nameInput).toHaveValue("E2E-Renamed-Gear");
  });
});
