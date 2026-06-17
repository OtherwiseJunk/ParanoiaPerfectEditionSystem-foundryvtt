import { test, expect } from "@playwright/test";
import bootstrap from "../setup/bootstrap.js";
import { selectors } from "../helpers/selectors.js";

const BASE_URL = process.env.FOUNDRY_URL ?? "http://foundryvtt:30000";
const ACTOR_NAME = "E2E-Troubleshooter";

async function waitForGameReady(page) {
  await page.waitForFunction(
    () => typeof game !== "undefined" && game.ready === true && typeof game.actors !== "undefined",
    { timeout: 60_000 },
  );
}

async function openActorSheet(page) {
  await waitForGameReady(page);
  await page.evaluate(async (actorName) => {
    const actor = game.actors.find((a) => a.name === actorName);
    if (!actor) throw new Error(`Actor "${actorName}" not found. Run bootstrap first.`);
    actor.sheet.render(true);
  }, ACTOR_NAME);
  const sheet = page.locator(selectors.actorSheet.root).first();
  await expect(sheet).toBeVisible({ timeout: 15_000 });
  return sheet;
}

async function closeAllWindows(page) {
  await page
    .evaluate(() => {
      Object.values(ui.windows).forEach((w) => {
        try {
          w.close();
        } catch {
          // ignore
        }
      });
    })
    .catch(() => {});
}

async function clearChat(page) {
  await page
    .evaluate(async () => {
      const ids = game.messages.map((m) => m.id);
      if (ids.length) {
        await ChatMessage.deleteDocuments(ids);
      }
    })
    .catch(() => {});
}

test.describe("@setup", () => {
  test("@setup bootstrap", async () => {
    await bootstrap({ baseURL: BASE_URL });
  });
});

test.describe("Dice Roller", () => {
  test.use({
    storageState: "tests/e2e/.auth/state.json",
  });

  /** @type {import('@playwright/test').Page} */
  let page;

  test.beforeAll(async ({ browser }) => {
    // Single persistent page so Foundry doesn't re-initialise between every test.
    const context = await browser.newContext({
      storageState: "tests/e2e/.auth/state.json",
    });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await waitForGameReady(page);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test.beforeEach(async () => {
    await closeAllWindows(page);
    await openActorSheet(page);

    // Navigate explicitly in case a prior test changed tabs.
    const productivityTab = page.locator('.sheet-tabs a[data-tab="productivityProfile"]');
    if (await productivityTab.isVisible()) {
      await productivityTab.click();
    }
  });

  test.afterEach(async () => {
    await closeAllWindows(page);
    await clearChat(page);
  });

  test("clicking an attribute label highlights it", async () => {
    const attributeLabel = page
      .locator(".paranoia-selectable-attribute[data-attribute-key='violence']")
      .first();
    await expect(attributeLabel).toBeVisible();

    await attributeLabel.click();

    await expect(attributeLabel).toHaveClass(/paranoia-selected/);

    const modal = page.locator(selectors.diceRoller.root);
    await expect(modal).not.toBeVisible();
  });

  test("clicking same attribute twice deselects it", async () => {
    const attributeLabel = page
      .locator(".paranoia-selectable-attribute[data-attribute-key='brains']")
      .first();
    await expect(attributeLabel).toBeVisible();

    await attributeLabel.click();
    await expect(attributeLabel).toHaveClass(/paranoia-selected/);

    await attributeLabel.click();
    await expect(attributeLabel).not.toHaveClass(/paranoia-selected/);

    const modal = page.locator(selectors.diceRoller.root);
    await expect(modal).not.toBeVisible();
  });

  test("dice roller opens after clicking an attribute then a skill", async () => {
    const attributeLabel = page
      .locator(".paranoia-selectable-attribute[data-attribute-key='violence']")
      .first();
    const skillLabel = page
      .locator(".paranoia-selectable-skill[data-skill-key='guns']")
      .first();

    await expect(attributeLabel).toBeVisible();
    await expect(skillLabel).toBeVisible();

    await attributeLabel.click();
    await expect(attributeLabel).toHaveClass(/paranoia-selected/);

    await skillLabel.click();

    const modal = page.locator(selectors.diceRoller.root);
    await expect(modal).toBeVisible({ timeout: 10_000 });

    await expect(page.locator(selectors.diceRoller.statSelect)).toHaveValue("violence");
    await expect(page.locator(selectors.diceRoller.skillSelect)).toHaveValue("guns");
  });

  test("modal stat and skill selects are pre-populated with the clicked values", async () => {
    const attributeLabel = page
      .locator(".paranoia-selectable-attribute[data-attribute-key='brains']")
      .first();
    const skillLabel = page
      .locator(".paranoia-selectable-skill[data-skill-key='science']")
      .first();

    await attributeLabel.click();
    await skillLabel.click();

    const modal = page.locator(selectors.diceRoller.root);
    await expect(modal).toBeVisible({ timeout: 10_000 });

    await expect(page.locator(selectors.diceRoller.statSelect)).toHaveValue("brains");
    await expect(page.locator(selectors.diceRoller.skillSelect)).toHaveValue("science");
    await expect(page.locator(selectors.diceRoller.equipmentInput)).toHaveValue("0");
    await expect(page.locator(selectors.diceRoller.initiativeInput)).toHaveValue("0");
  });

  test("rolling dice sends two chat messages and closes the modal", async () => {
    const existingMessages = page.locator(selectors.chat.message);
    const countBefore = await existingMessages.count();

    const attributeLabel = page
      .locator(".paranoia-selectable-attribute[data-attribute-key='violence']")
      .first();
    const skillLabel = page
      .locator(".paranoia-selectable-skill[data-skill-key='guns']")
      .first();

    await attributeLabel.click();
    await skillLabel.click();

    const modal = page.locator(selectors.diceRoller.root);
    await expect(modal).toBeVisible({ timeout: 10_000 });

    const rollBtn = page.locator(selectors.diceRoller.rollBtn);
    await expect(rollBtn).toBeEnabled();
    await rollBtn.click();

    await expect(modal).not.toBeVisible({ timeout: 15_000 });

    // Two messages expected: the dice roll result and the Friend Computer follow-up.
    await expect(page.locator(selectors.chat.message)).toHaveCount(countBefore + 2, {
      timeout: 20_000,
    });
  });

  test("opening the modal a second time reuses the existing window", async () => {
    // --- First open ---
    const violenceLabel = page
      .locator(".paranoia-selectable-attribute[data-attribute-key='violence']")
      .first();
    const gunsLabel = page
      .locator(".paranoia-selectable-skill[data-skill-key='guns']")
      .first();

    await violenceLabel.click();
    await gunsLabel.click();

    const modal = page.locator(selectors.diceRoller.root);
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(selectors.diceRoller.statSelect)).toHaveValue("violence");
    await expect(page.locator(selectors.diceRoller.skillSelect)).toHaveValue("guns");

    // --- DO NOT roll — go back and click a different attribute/skill ---
    const brainsLabel = page
      .locator(".paranoia-selectable-attribute[data-attribute-key='brains']")
      .first();
    const scienceLabel = page
      .locator(".paranoia-selectable-skill[data-skill-key='science']")
      .first();

    await brainsLabel.click();
    await scienceLabel.click();

    const allModals = page.locator(selectors.diceRoller.root);
    await expect(allModals).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator(selectors.diceRoller.statSelect)).toHaveValue("brains");
    await expect(page.locator(selectors.diceRoller.skillSelect)).toHaveValue("science");
  });
});
