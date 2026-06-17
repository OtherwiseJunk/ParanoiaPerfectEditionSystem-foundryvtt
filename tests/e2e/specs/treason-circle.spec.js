import { test, expect } from "@playwright/test";
import { selectors } from "../helpers/selectors.js";
import { ACTOR_NAMES } from "../setup/bootstrap.js";

const BASE_URL = process.env.FOUNDRY_URL ?? "http://foundryvtt:30000";

test.describe("Treason Circle", () => {
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

    await page.evaluate(async () => {
      const ids = game.messages.map((m) => m.id);
      if (ids.length) await ChatMessage.deleteDocuments(ids);
    }).catch(() => {});
  });

  async function openTreasonCircle() {
    await page.evaluate(() => new TreasonCircleApp().render(true));
    await expect(page.locator(selectors.treasonCircle.root)).toBeVisible({ timeout: 10_000 });
  }

  // -------------------------------------------------------------------------

  test("GM can open the Treason Circle Architect", async () => {
    await openTreasonCircle();
    await expect(page.locator(selectors.treasonCircle.root)).toBeVisible();
  });

  test("app renders the primary treason input and entry container", async () => {
    await openTreasonCircle();
    await expect(page.locator(selectors.treasonCircle.primaryTreasonInput)).toBeVisible();
    await expect(page.locator(selectors.treasonCircle.entriesContainer)).toBeVisible();
  });

  test("an initial entry row is added automatically on open", async () => {
    await openTreasonCircle();
    await expect(page.locator(selectors.treasonCircle.entryRow)).toHaveCount(1, {
      timeout: 5_000,
    });
  });

  test("Add Row button appends a new entry row", async () => {
    await openTreasonCircle();
    const countBefore = await page.locator(selectors.treasonCircle.entryRow).count();
    await page.locator(selectors.treasonCircle.addRowBtn).click();
    await expect(page.locator(selectors.treasonCircle.entryRow)).toHaveCount(countBefore + 1, {
      timeout: 5_000,
    });
  });

  test("Remove button deletes an entry row", async () => {
    await openTreasonCircle();
    await page.locator(selectors.treasonCircle.addRowBtn).click();
    const countAfterAdd = await page.locator(selectors.treasonCircle.entryRow).count();

    await page.locator(".remove-row-button").first().click();
    await expect(page.locator(selectors.treasonCircle.entryRow)).toHaveCount(countAfterAdd - 1, {
      timeout: 5_000,
    });
  });

  test("player-owned troubleshooters appear in the character dropdowns", async () => {
    await openTreasonCircle();

    // The entry row character select should contain our seeded player-owned troubleshooters.
    const firstSelect = page.locator(`${selectors.treasonCircle.entryRow} select`).first();
    await expect(firstSelect).toBeVisible();
    const options = await firstSelect.locator("option").allTextContents();
    expect(options).toContain(ACTOR_NAMES.troubleshooter2);
    expect(options).toContain(ACTOR_NAMES.troubleshooter3);
  });

  test("submitting a filled entry sends a whisper per entry", async () => {
    await openTreasonCircle();

    // Fill primary treason act.
    await page.locator(selectors.treasonCircle.primaryTreasonInput).fill(
      "The navigation computer was tampered with.",
    );

    // Fill entry 1: Troubleshooter-2 did it, Troubleshooter-3 suspects.
    const row = page.locator(selectors.treasonCircle.entryRow).first();
    const [charSelect, suspectSelect] = await row.locator("select").all();
    await charSelect.selectOption({ label: ACTOR_NAMES.troubleshooter2 });
    await row.locator("textarea").nth(0).fill("Mis-filed the mission debrief.");
    await suspectSelect.selectOption({ label: ACTOR_NAMES.troubleshooter3 });
    await row.locator("textarea").nth(1).fill("They were standing nearby.");

    await page.locator(selectors.treasonCircle.submitBtn).click();

    // GM sees whispered messages in the log.
    await expect(page.locator(selectors.chat.message)).toHaveCount(1, { timeout: 15_000 });
  });
});
