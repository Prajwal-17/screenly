import { expect, test } from "@playwright/test";
import { beginTechnicalInterview } from "./interview-opening";
import { signInForTest } from "./session-fixture";
import { backendURL } from "./environment";

for (const width of [1440, 360]) {
  test(`end without feedback preserves the conversation and stops capture at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.grantPermissions(["microphone"]);
    await page.addInitScript(() => {
      const target = window as Window & { capturedTracks: MediaStreamTrack[] };
      target.capturedTracks = [];
      const capture = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await capture(constraints);
        target.capturedTracks.push(...stream.getTracks());
        return stream;
      };
    });
    await signInForTest(context);
    const created = await page.request.post(`${backendURL}/api/interviews`, {
      data: {
        role: "Backend",
        level: "Junior",
        topics: ["APIs"],
        duration: 10,
      },
    });
    expect(created.status()).toBe(201);
    const { id } = await created.json();
    await page.goto(`/interviews/${id}`);
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .click();
    await beginTechnicalInterview(page);
    await expect(
      page.getByText("Listening to you", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect
      .poll(
        async () =>
          (
            await (
              await page.request.get(`${backendURL}/api/interviews/${id}`)
            ).json()
          ).messages.length,
      )
      .toBeGreaterThan(0);
    const attempts: boolean[] = [];
    await page.route(`**/api/interviews/${id}/finish`, async (route) => {
      attempts.push(route.request().postDataJSON().generateFeedback);
      if (width === 1440 && attempts.length === 1) {
        await route.fulfill({
          status: 503,
          json: { error: "Finish was not saved. Try again." },
        });
      } else await route.continue();
    });
    const trigger = page.getByRole("button", {
      name: "Finish interview",
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Your conversation will be saved.");
    await expect(
      dialog.getByRole("button", { name: "Keep going", exact: true }),
    ).toBeFocused();
    await dialog.evaluate(async (node) => {
      await Promise.all(
        node.getAnimations().map((animation) => animation.finished),
      );
    });
    for (const name of [
      "Finish and view feedback",
      "End without feedback",
      "Keep going",
    ]) {
      const box = await dialog
        .getByRole("button", { name, exact: true })
        .boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({
      path: test.info().outputPath("finish-dialog.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    const ended = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/interviews/${id}/finish`) &&
        response.status() === 200,
    );
    await dialog
      .getByRole("button", { name: "End without feedback", exact: true })
      .click();
    if (width === 1440) {
      await expect(
        page.getByText("Finish was not saved. Try again.", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Retry finish", exact: true })
        .click();
    }
    expect((await (await ended).json()).feedbackStatus).toBe("skipped");
    await expect(page).toHaveURL(/\/history$/);
    await expect
      .poll(() =>
        page.evaluate(() =>
          (
            window as Window & { capturedTracks: MediaStreamTrack[] }
          ).capturedTracks.every((track) => track.readyState === "ended"),
        ),
      )
      .toBe(true);
    expect(attempts).toEqual(width === 1440 ? [false, false] : [false]);
    await page.reload();
    await page
      .getByRole("link", { name: /Backend interview/ })
      .first()
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Ended without feedback",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Generating feedback…", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Generate feedback", exact: true }),
    ).toBeEnabled();
    const saved = await (
      await page.request.get(`${backendURL}/api/interviews/${id}`)
    ).json();
    expect(saved.status).toBe("completed");
    expect(saved.feedbackStatus).toBe("skipped");
    expect(saved.feedback).toBeNull();
    expect(saved.messages.length).toBeGreaterThan(0);
  });
}
