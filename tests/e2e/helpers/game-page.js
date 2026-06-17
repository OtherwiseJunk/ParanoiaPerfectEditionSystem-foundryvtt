/**
 * Shared helpers for getting a Foundry "game is ready" page in Playwright.
 *
 * Both the bootstrap and every spec need the same two things:
 *   1. A WebGL stub injected before any script runs (PIXI.js crashes in
 *      _detectFormats when canvas.getContext('webgl') returns null, which it
 *      does in the GPU-less CI/devcontainer; the crash halts Foundry's whole
 *      init chain). The stub returns a non-null context whose getExtension()
 *      yields null, so PIXI reports no supported formats and falls back to
 *      Canvas 2D instead of throwing.
 *   2. A correctly-positioned waitForFunction timeout. page.waitForFunction's
 *      signature is (fn, arg, options) — passing { timeout } as the second
 *      argument silently makes it the page-function arg, leaving the default
 *      30s timeout in effect.
 */

import { login } from "./auth.js";

const DEFAULT_BASE_URL = process.env.FOUNDRY_URL ?? "http://foundryvtt:30000";

/* eslint-disable */
// Runs in the browser before Foundry's scripts. Must be fully self-contained.
function webglStub() {
  const _getCtx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    const ctx = _getCtx.call(this, type, opts);
    if (ctx) return ctx;
    if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
      return {
        canvas: this,
        drawingBufferWidth: 1,
        drawingBufferHeight: 1,
        getExtension: () => null,
        getParameter: () => null,
        getSupportedExtensions: () => [],
        isContextLost: () => true,
        enable: () => {},
        disable: () => {},
        hint: () => {},
        clearColor: () => {},
        clear: () => {},
        viewport: () => {},
        pixelStorei: () => {},
        texParameteri: () => {},
        blendFunc: () => {},
        blendFuncSeparate: () => {},
        blendEquation: () => {},
        blendEquationSeparate: () => {},
        activeTexture: () => {},
        bindTexture: () => {},
        bindBuffer: () => {},
        bindFramebuffer: () => {},
        bindRenderbuffer: () => {},
        createTexture: () => ({}),
        createBuffer: () => ({}),
        createFramebuffer: () => ({}),
        createRenderbuffer: () => ({}),
        createProgram: () => ({}),
        createShader: () => ({}),
        deleteTexture: () => {},
        deleteBuffer: () => {},
        deleteFramebuffer: () => {},
        deleteRenderbuffer: () => {},
        deleteProgram: () => {},
        deleteShader: () => {},
        flush: () => {},
        finish: () => {},
        drawArrays: () => {},
        drawElements: () => {},
        getError: () => 0,
        scissor: () => {},
        colorMask: () => {},
        depthMask: () => {},
        stencilMask: () => {},
        lineWidth: () => {},
        generateMipmap: () => {},
        texImage2D: () => {},
        texSubImage2D: () => {},
        compressedTexImage2D: () => {},
        renderbufferStorage: () => {},
        framebufferTexture2D: () => {},
        framebufferRenderbuffer: () => {},
        checkFramebufferStatus: () => 36053,
        shaderSource: () => {},
        compileShader: () => {},
        linkProgram: () => {},
        useProgram: () => {},
        getAttribLocation: () => -1,
        getUniformLocation: () => null,
        uniform1i: () => {},
        uniform1f: () => {},
        uniform2f: () => {},
        uniform3f: () => {},
        uniform4f: () => {},
        uniformMatrix3fv: () => {},
        uniformMatrix4fv: () => {},
        enableVertexAttribArray: () => {},
        disableVertexAttribArray: () => {},
        vertexAttribPointer: () => {},
        bufferData: () => {},
        bufferSubData: () => {},
        getProgramParameter: () => true,
        getShaderParameter: () => true,
        getProgramInfoLog: () => "",
        getShaderInfoLog: () => "",
      };
    }
    return null;
  };
}
/* eslint-enable */

/**
 * Inject the WebGL stub into a Page or BrowserContext so it runs before any
 * page script. Both Page and BrowserContext expose addInitScript.
 */
export async function installWebGLStub(target) {
  await target.addInitScript(webglStub);
}

/**
 * Wait until Foundry's game object is fully initialised.
 */
export async function waitForGameReady(page, timeoutMs = 60_000) {
  await page.waitForFunction(
    () => typeof game !== "undefined" && game.ready === true && typeof game.actors !== "undefined",
    undefined,
    { timeout: timeoutMs },
  );
}

/**
 * Open a new page joined to the active Foundry world as `username`, with the
 * WebGL stub in place, waited until the game is ready. Returns the page.
 *
 * Note: we perform a real join (select user + submit) rather than reusing a
 * saved storageState. The Foundry "join" is server-side session state that does
 * not survive across browser sessions — reconnecting with only the saved cookie
 * lands back on /join, so game.ready never fires.
 */
export async function openGamePage(
  browser,
  { baseURL = DEFAULT_BASE_URL, username = "Gamemaster" } = {},
) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, // Foundry requires ≥ 1366×768
  });
  await installWebGLStub(context);
  const page = await context.newPage();
  await login(page, { baseURL, username });
  await waitForGameReady(page);
  return page;
}

/**
 * Close every open Foundry Application window. Used between tests that share a
 * single page so leftover sheets/dialogs don't leak into the next test.
 */
export async function closeAllWindows(page) {
  await page
    .evaluate(() => {
      for (const w of Object.values(ui.windows)) {
        try {
          w.close();
        } catch {
          /* ignore */
        }
      }
    })
    .catch(() => {});
}

/**
 * Render an actor's sheet and wait for the render to complete. Returns nothing;
 * callers assert on the resulting DOM. Awaiting render() avoids racing the
 * asynchronous re-render that Foundry performs after document updates.
 */
export async function renderActorSheet(page, actorName) {
  await page.evaluate(async (name) => {
    const actor = game.actors.find((a) => a.name === name);
    if (!actor) throw new Error(`Actor "${name}" not found.`);
    await actor.sheet.render(true);
  }, actorName);
  // Foundry fires additional asynchronous re-renders after document updates
  // (and resets the active tab). Let them flush before the test interacts, so
  // clicks don't land on elements that are about to detach.
  await page.waitForTimeout(400);
}

/**
 * Reset an actor's embedded items to a known set, awaiting completion. Tests
 * that create/delete gear mutate shared actor state, so each test resets to a
 * predictable baseline (one public + one treasonous gear item).
 */
export async function resetActorGear(page, actorName) {
  await page.evaluate(async (name) => {
    const actor = game.actors.find((a) => a.name === name);
    if (!actor) throw new Error(`Actor "${name}" not found.`);
    const ids = actor.items.map((i) => i.id);
    if (ids.length) await actor.deleteEmbeddedDocuments("Item", ids);
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
