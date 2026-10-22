import { expect, test } from "@playwright/test";
import { signInForTest } from "./session-fixture";
import { backendURL, voiceURL } from "./environment";

test("question reveal stays readable independently of speech and fits mobile", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["microphone"]);
  await page.request.post(`${voiceURL}/speech-settings`, {
    data: { wordMs: 240, automaticAnswer: false, audioDelayMs: 1500 },
  });
  await signInForTest(context);
  const created = await page.request.post(`${backendURL}/api/interviews`, {
    data: {
      role: "Frontend",
      level: "Mid-level",
      topics: ["React"],
      duration: 10,
    },
  });
  const { id } = await created.json();
  const caption = page.locator('[data-slot="live-caption"]');
  const response = caption.locator('[data-slot="message-response"]');
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/interviews/${id}`);
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .click();
    await expect(caption).toContainText("Ready to begin?", { timeout: 15000 });
    await expect(caption.locator("[data-caption-word]")).toHaveCount(0);
    await expect(response).toHaveAttribute("data-revealing", "false");
    expect(
      await response.evaluate((node) => getComputedStyle(node).clipPath),
    ).toBe("none");
    await page.screenshot({
      path: testInfo.outputPath("question-desktop.png"),
    });

    // Candidate turns below are injected through mock STT. Keep the looping
    // fake microphone from simulating a fresh interruption on audio resume.
    await page.getByRole("button", { name: "Mute", exact: true }).click();

    await caption.focus();
    await page.keyboard.press("Space");
    await expect(
      page.getByText("Interview paused", { exact: true }),
    ).toBeVisible();
    await expect(caption).toContainText("Ready to begin?");
    const resume = page.getByRole("button", { name: "Resume interview" });
    await expect(resume).toBeEnabled();
    await resume.click();
    await expect(
      page.getByText("Interview paused", { exact: true }),
    ).toBeHidden();
    await page.request.post(`${voiceURL}/turn`, {
      data: { transcript: "Yes, ready." },
    });
    const question = "How would you test a component that fetches data?";
    await expect(caption).toHaveText(question);
    await expect(response).toHaveAttribute("data-revealing", "false");
    await page
      .getByRole("button", { name: "Replay question", exact: true })
      .click();
    await expect(caption).toHaveText(question);
    await expect(response).toHaveAttribute("data-revealing", "false");

    // Inspect the same streaming entrance in isolation from network timing.
    await response.evaluate((node) => {
      node.setAttribute("data-revealing", "true");
    });
    expect(
      await response.evaluate((node) => getComputedStyle(node).animationName),
    ).toContain("questionReveal");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await response.evaluate((node) => getComputedStyle(node).animationName),
    ).toBe("none");
    expect(
      await response.evaluate((node) => getComputedStyle(node).clipPath),
    ).toBe("none");
    await response.evaluate((node) => {
      node.setAttribute("data-revealing", "false");
    });
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(caption).toBeInViewport();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("question-mobile.png") });
  } finally {
    await page.close();
    await page.request.delete(`${backendURL}/api/interviews/${id}`);
    await page.request.post(`${voiceURL}/speech-settings`, {
      data: { wordMs: 45, automaticAnswer: true, audioDelayMs: 0 },
    });
  }
});
