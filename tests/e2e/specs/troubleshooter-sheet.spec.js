import { test, expect } from "@playwright/test";
import { selectors } from "../helpers/selectors.js";
import { ACTOR_NAMES } from "../setup/bootstrap.js";
import { openGamePage, renderActorSheet, resetActorGear } from "../helpers/game-page.js";

const BASE_URL = process.env.FOUNDRY_URL ?? "http://foundryvtt:30000";
const ACTOR_NAME = ACTOR_NAMES.troubleshooter;

test.describe("Troubleshooter Sheet", () => {
  test.use({ storageState: "tests/e2e/.auth/state.json" });

  let page;

  // A fresh joined page per test. Foundry re-renders sheets asynchronously on
  // every document change, and a single shared page accumulates instability
  // across many mutations; isolating each test keeps them deterministic.
  test.beforeEach(async ({ browser }) => {
    page = await openGamePage(browser, { baseURL: BASE_URL });
    await resetActorGear(page, ACTOR_NAME);
    await renderActorSheet(page, ACTOR_NAME);

    await expect(page.locator(selectors.actorSheet.troubleshooter).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test.afterEach(async () => {
    await page?.context().close();
  });

  // -------------------------------------------------------------------------
  // Header fields
  // -------------------------------------------------------------------------

  test("displays actor name in the header", async () => {
    const nameInput = page.locator(selectors.actorSheet.nameInput).first();
    await expect(nameInput).toHaveValue(ACTOR_NAME);
  });

  test("team and service group fields are editable", async () => {
    const teamInput = page.locator('input[name="system.team"]').first();
    const sgInput = page.locator('input[name="system.serviceGroup"]').first();
    await expect(teamInput).toBeVisible();
    await expect(sgInput).toBeVisible();
    await teamInput.fill("Alpha-Red");
    await teamInput.press("Tab");
    await expect(teamInput).toHaveValue("Alpha-Red");
  });

  // -------------------------------------------------------------------------
  // Tab navigation
  // -------------------------------------------------------------------------

  test("all tabs are navigable", async () => {
    const tabs = [
      selectors.tabs.productivityProfile,
      selectors.tabs.wellness,
      selectors.tabs.role,
      selectors.tabs.foundry,
      selectors.tabs.naughty,
    ];

    for (const tabSelector of tabs) {
      await page.locator(tabSelector).first().click();
      await expect(page.locator(tabSelector).first()).toHaveClass(/active/);
    }
  });

  // -------------------------------------------------------------------------
  // Productivity Profile tab — attribute/skill grid
  // -------------------------------------------------------------------------

  test("productivity profile tab shows selectable attributes and skills", async () => {
    await page.locator(selectors.tabs.productivityProfile).first().click();
    await expect(page.locator(selectors.selectableAttribute).first()).toBeVisible();
    await expect(page.locator(selectors.selectableSkill).first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Wellness tab
  // -------------------------------------------------------------------------

  test("wellness tab shows health, flag and moxie inputs", async () => {
    await page.locator(selectors.tabs.wellness).first().click();
    await expect(page.locator(selectors.wellness.healthInput).first()).toBeVisible();
    await expect(page.locator(selectors.wellness.flagInput).first()).toBeVisible();
    await expect(page.locator(selectors.wellness.moxieInput).first()).toBeVisible();
  });

  test("health value is clamped to 0-4", async () => {
    await page.locator(selectors.tabs.wellness).first().click();
    const healthInput = page.locator(selectors.wellness.healthInput).first();
    await healthInput.fill("9");
    await healthInput.press("Tab");
    // clampWellnessValue caps at max (4)
    await expect(healthInput).toHaveValue("4");
  });

  test("flag value is clamped to 0-4", async () => {
    await page.locator(selectors.tabs.wellness).first().click();
    const flagInput = page.locator(selectors.wellness.flagInput).first();
    await flagInput.fill("-1");
    await flagInput.press("Tab");
    await expect(flagInput).toHaveValue("0");
  });

  // -------------------------------------------------------------------------
  // Role tab — public gear
  // -------------------------------------------------------------------------

  test("role tab shows the public gear list and create button", async () => {
    await page.locator(selectors.tabs.role).first().click();
    await expect(page.locator(selectors.gear.publicDropZone).first()).toBeVisible();
    await expect(page.locator(selectors.gear.createPublicBtn).first()).toBeVisible();
  });

  test("creating public gear adds an item to the list", async () => {
    await page.locator(selectors.tabs.role).first().click();
    const dropZone = page.locator(selectors.gear.publicDropZone).first();
    const countBefore = await dropZone.locator(selectors.gear.item).count();

    await page.locator(selectors.gear.createPublicBtn).first().click();

    await expect(dropZone.locator(selectors.gear.item)).toHaveCount(countBefore + 1, {
      timeout: 10_000,
    });
  });

  test("clicking gear edit button opens the equipment sheet", async () => {
    await page.locator(selectors.tabs.role).first().click();

    // Ensure at least one public gear item exists.
    const dropZone = page.locator(selectors.gear.publicDropZone).first();
    if ((await dropZone.locator(selectors.gear.item).count()) === 0) {
      await page.locator(selectors.gear.createPublicBtn).first().click();
      await expect(dropZone.locator(selectors.gear.item)).toHaveCount(1, { timeout: 10_000 });
    }

    await dropZone.locator(selectors.gear.editBtn).first().click();
    await expect(page.locator(selectors.equipmentSheet).first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Naughty tab — treasonous gear
  // -------------------------------------------------------------------------

  test("naughty tab shows the treasonous gear list and create button", async () => {
    await page.locator(selectors.tabs.naughty).first().click();
    await expect(page.locator(selectors.gear.treasonousDropZone).first()).toBeVisible();
    await expect(page.locator(selectors.gear.createTreasonousBtn).first()).toBeVisible();
  });

  test("creating treasonous gear adds an item to the treasonous list", async () => {
    await page.locator(selectors.tabs.naughty).first().click();
    const dropZone = page.locator(selectors.gear.treasonousDropZone).first();
    const countBefore = await dropZone.locator(selectors.gear.item).count();

    await page.locator(selectors.gear.createTreasonousBtn).first().click();

    await expect(dropZone.locator(selectors.gear.item)).toHaveCount(countBefore + 1, {
      timeout: 10_000,
    });
  });

  test("deleting gear shows confirmation and removes the item", async () => {
    await page.locator(selectors.tabs.naughty).first().click();
    const dropZone = page.locator(selectors.gear.treasonousDropZone).first();

    // Ensure at least one treasonous gear item exists.
    if ((await dropZone.locator(selectors.gear.item).count()) === 0) {
      await page.locator(selectors.gear.createTreasonousBtn).first().click();
      await expect(dropZone.locator(selectors.gear.item)).toHaveCount(1, { timeout: 10_000 });
    }

    const countBefore = await dropZone.locator(selectors.gear.item).count();
    await dropZone.locator(selectors.gear.deleteBtn).first().click();

    // Foundry's Dialog.confirm — click the Yes/confirm button.
    await page.locator('.dialog button[data-button="yes"]').first().click();

    await expect(dropZone.locator(selectors.gear.item)).toHaveCount(countBefore - 1, {
      timeout: 10_000,
    });
  });
});
