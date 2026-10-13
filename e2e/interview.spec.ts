import { expect, test, type Page } from "@playwright/test";
async function capture(
  page: Page,
  options: { path: string; fullPage: boolean },
) {
  const reveal = page.locator(".content > div").first();
  if (await reveal.count()) await expect(reveal).toHaveCSS("opacity", "1");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ ...options, animations: "disabled" });
}
test("complete practice journey, recovery, history, and mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Find your voice/ }),
  ).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/landing.png",
      fullPage: true,
    });
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Alex");
  await page.getByLabel("Email address").fill(`alex-${Date.now()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("practice-password-123");
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.getByText("Your first conversation is waiting"),
  ).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/dashboard.png",
      fullPage: true,
    });
  await page
    .getByRole("link", { name: "New interview", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "What’s your next challenge?" }),
  ).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, { path: "docs/screenshots/setup.png", fullPage: true });
  await page.getByRole("button", { name: "Prepare my interview" }).click();
  await expect(page).toHaveURL(/\/interviews\/[a-f0-9-]+$/);
  await page.getByLabel("Typed answers", { exact: true }).check();
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(page.getByText("Your turn", { exact: true })).toBeVisible();
  await page
    .getByLabel("Your interview answer")
    .fill(
      "I test what the user can see, including loading and success states.",
    );
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.getByText("Your turn", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/You mentioned testing behavior/).first(),
  ).toBeVisible();
  // The controlled provider fails once; the UI must preserve the conversation.
  await page
    .getByLabel("Your interview answer")
    .fill("I would test a failed request and show a retry control.");
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.locator(".error[role=alert]")).toContainText(
    "could not respond",
  );
  await page
    .getByLabel("Your interview answer")
    .fill(
      "I would mock a rejected request and assert that the retry control appears.",
    );
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.getByText("Your turn", { exact: true })).toBeVisible();
  await expect(page.locator(".error[role=alert]")).toHaveCount(0);
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/interview.png",
      fullPage: true,
    });
  await page
    .getByRole("button", { name: "Finish interview", exact: true })
    .click();
  await page.getByRole("button", { name: "Finish & reflect" }).click();
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(
    page.getByRole("heading", { name: /Here’s where you stand/ }),
  ).toBeVisible();
  await expect(page.getByText("78", { exact: true })).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/feedback.png",
      fullPage: true,
    });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Transcript", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(
    /forma-interview.*\.txt/,
  );
  await page.reload();
  await expect(page.getByText("78", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(
    page.getByText("Frontend interview", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Every conversation, kept." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/history-mobile.png",
      fullPage: true,
    });
  await page
    .getByRole("link")
    .filter({ hasText: "Frontend interview" })
    .click();
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(
    page.getByText("Your first conversation is waiting"),
  ).toBeVisible();
  // Drafts can be removed directly from history without starting an interview.
  await page
    .getByRole("link", { name: "New interview", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Prepare my interview" }).click();
  await expect(page).toHaveURL(/\/interviews\/[a-f0-9-]+$/);
  await page.getByRole("link", { name: "History", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete Frontend interview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .click();
  await expect(
    page.getByText("Your first conversation is waiting"),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("protected workspace redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
});

test("voice capture, transcription, playback, mute, and cleanup", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["microphone"]);
  await page.goto("/auth/sign-in");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Voice Candidate");
  await page
    .getByLabel("Email address")
    .fill(`voice-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("voice-password-123");
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page
    .getByRole("link", { name: "New interview", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Prepare my interview" }).click();
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mute", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("I test the component behavior and loading states.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unmute", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume interview", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mute", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Finish saved interview" }).click();
  await page.getByRole("button", { name: "Finish & reflect" }).click();
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(
    page.getByRole("heading", { name: /Here’s where you stand/ }),
  ).toBeVisible();
});
