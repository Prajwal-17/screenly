import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { test as appTest } from "./fixtures";

// Mount the shipping component with a controlled voice signal. This exercises
// real WebGL/CSS without depending on a microphone or a remote speech provider.
declare global {
  interface Window {
    orbSignal: {
      level: number;
      low: number;
      high: number;
      candidate: boolean;
      inactive: boolean;
    };
    orbPaints: number;
    unmountOrb: () => void;
  }
}

let directory: string;
let javascript: string;
let css: string;
test.beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "screenly-orb-"));
  const web = resolve(import.meta.dirname, "../..");
  const entry = join(directory, "orb.ts");
  await writeFile(
    entry,
    `import { createElement } from ${JSON.stringify(join(web, "node_modules/react"))};
import { createRoot } from ${JSON.stringify(join(web, "node_modules/react-dom/client"))};
import { PorcelainOrb } from ${JSON.stringify(join(web, "components/porcelain-orb"))};
window.orbSignal = { level: 0, low: 0, high: 0, candidate: false, inactive: false };
const root = createRoot(document.getElementById('root'));
root.render(createElement(PorcelainOrb, {readSignal: () => window.orbSignal}));
window.unmountOrb = () => root.unmount();`,
  );
  execFileSync(
    "bun",
    ["build", entry, "--outdir", directory, "--target", "browser", "--minify"],
    { cwd: web, stdio: "pipe" },
  );
  [javascript, css] = await Promise.all([
    readFile(join(directory, "orb.js"), "utf8"),
    readFile(join(directory, "orb.css"), "utf8"),
  ]);
});
test.afterAll(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

async function mount(page: Page, fallback = false) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setContent(`<style>${css}
body { margin: 0; background: white; }
#root { width: 680px; height: 320px; margin: 40px auto;
  --orb-paper: #ffffff; --orb-body: #656e78;
  --orb-highlight: #c9cfd5; --orb-reflection: #7b838c; }
</style><div id="root"></div>`);
  await page.evaluate((forceFallback) => {
    window.orbPaints = 0;
    if (forceFallback) {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        ...args: Parameters<typeof getContext>
      ) {
        if (String(args[0]).startsWith("webgl")) return null;
        return getContext.apply(this, args);
      } as typeof getContext;
    } else {
      const draw = WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays = function (...args) {
        window.orbPaints++;
        return draw.apply(this, args);
      };
    }
  }, fallback);
  await page.addScriptTag({ content: javascript });
  const orb = page.locator(
    `[data-renderer="${fallback ? "fallback" : "webgl"}"]`,
  );
  await expect(orb).toHaveAttribute("data-moving", "false");
  return orb;
}

async function speak(page: Page) {
  await page.evaluate(() => {
    window.orbSignal = {
      level: 0.55,
      low: 0.7,
      high: 0.3,
      candidate: false,
      inactive: false,
    };
  });
}
async function silence(page: Page) {
  // Frequency bins can linger after playback; level is the source of truth.
  await page.evaluate(() => {
    window.orbSignal.level = 0;
  });
}

test("porcelain folds respond to speech and stop repainting during silence", async ({
  page,
}) => {
  const orb = await mount(page);
  const still = await page.screenshot();
  const restingPaints = await page.evaluate(() => window.orbPaints);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.orbPaints)).toBe(restingPaints);
  await speak(page);
  await expect(orb).toHaveAttribute("data-moving", "true");
  await page.waitForTimeout(300);
  const speaking = await page.screenshot();
  expect(speaking.equals(still)).toBe(false);
  await page.waitForTimeout(220);
  expect((await page.screenshot()).equals(speaking)).toBe(false);
  await silence(page);
  await expect(orb).toHaveAttribute("data-moving", "false");
  // Let the frequency envelope and spring finish their release.
  await page.waitForTimeout(400);
  const paints = await page.evaluate(() => window.orbPaints);
  await page.waitForTimeout(220);
  expect(await page.evaluate(() => window.orbPaints)).toBe(paints);
});

test("reduced motion stops spatial movement and resumes on the current signal", async ({
  page,
}) => {
  const orb = await mount(page);
  await speak(page);
  await expect(orb).toHaveAttribute("data-moving", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(orb).toHaveAttribute("data-moving", "false");
  await page.waitForTimeout(150);
  const paints = await page.evaluate(() => window.orbPaints);
  await page.waitForTimeout(220);
  expect(await page.evaluate(() => window.orbPaints)).toBe(paints);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(orb).toHaveAttribute("data-moving", "true");
  await page.evaluate(() => {
    window.orbSignal.inactive = true;
  });
  await expect(orb).toHaveAttribute("data-moving", "false");
  await expect
    .poll(async () => {
      const stopped = await page.evaluate(() => window.orbPaints);
      await page.waitForTimeout(220);
      return (await page.evaluate(() => window.orbPaints)) === stopped;
    })
    .toBe(true);
});

test("CSS fallback shares the voice envelope and reduced-motion behavior", async ({
  page,
}) => {
  const orb = await mount(page, true);
  const shape = orb.locator(":scope > div");
  const resting = await shape.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await speak(page);
  await expect(orb).toHaveAttribute("data-moving", "true");
  await expect
    .poll(() =>
      shape.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe(resting);
  await silence(page);
  await expect(orb).toHaveAttribute("data-moving", "false");
  const settled = await shape.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await page.waitForTimeout(220);
  expect(
    await shape.evaluate((element) => getComputedStyle(element).transform),
  ).toBe(settled);
  await speak(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(orb).toHaveAttribute("data-moving", "false");
  expect(
    await shape.evaluate((element) => getComputedStyle(element).borderRadius),
  ).toBe("50%");
});

test("offscreen rendering and unmounted renderers release their frame loop", async ({
  page,
}) => {
  const orb = await mount(page);
  await speak(page);
  await expect(orb).toHaveAttribute("data-moving", "true");
  await page.evaluate(() => {
    document.getElementById("root")!.style.marginTop = "2000px";
  });
  await expect(orb).toHaveAttribute("data-moving", "false");
  const hidden = await page.evaluate(() => window.orbPaints);
  await page.waitForTimeout(220);
  expect(await page.evaluate(() => window.orbPaints)).toBe(hidden);
  await page.evaluate(() => {
    document.getElementById("root")!.style.marginTop = "40px";
  });
  await expect(orb).toHaveAttribute("data-moving", "true");
  await page.evaluate(() => window.unmountOrb());
  const unmounted = await page.evaluate(() => window.orbPaints);
  await page.waitForTimeout(220);
  expect(await page.evaluate(() => window.orbPaints)).toBe(unmounted);
});

appTest(
  "liquid porcelain fits the live stage at full and short desktop sizes",
  async ({ page }, testInfo) => {
    await page.goto("/interviews/active");
    const orb = page.locator('[data-renderer="webgl"]');
    await expect(orb).toBeVisible();
    for (const [width, height] of [
      [1440, 900],
      [1024, 600],
    ]) {
      await page.setViewportSize({ width: width!, height: height! });
      const canvas = orb.locator("canvas");
      await expect(canvas).toBeInViewport();
      await expect(
        page.getByRole("button", { name: "Finish interview", exact: true }),
      ).toBeInViewport();
      await expect(page.locator('[data-slot="live-caption"]')).toContainText(
        "How would you identify unnecessary re-renders",
      );
      await expect
        .poll(async () => {
          const box = await canvas.boundingBox();
          return !!box && Math.abs(box.width - box.height) < 1;
        })
        .toBe(true);
      const capture = testInfo.outputPath(
        `liquid-porcelain-${width}x${height}.png`,
      );
      await page.screenshot({ path: capture });
      await testInfo.attach(`liquid-porcelain-${width}x${height}`, {
        path: capture,
        contentType: "image/png",
      });
    }
  },
);
