import { test, expect, now } from "./fixtures";

test("individual save merges only the field into fresh data and Cancel makes no write", async ({
  page,
  api,
}, testInfo) => {
  api.profile.onboarding.step = 4;
  await page.goto("/profile");
  await page
    .getByRole("button", { name: "Edit headline", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("Backend engineer");
  api.profile.details.location = "Changed in another tab";
  const completedAt = api.profile.completedAt;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator('[data-profile-field="headline"]')).toContainText(
    "Backend engineer",
  );
  expect(api.profile.details.location).toBe("Changed in another tab");
  expect(api.profile.details.about).toBe(
    "I build accessible web applications.",
  );
  expect(api.profile.status).toBe("complete");
  expect(api.profile.completedAt).toBe(completedAt);
  expect(api.profile.onboarding.step).toBe(4);
  await expect(page).toHaveURL(/\/profile$/);
  const writes = api.requests.filter((r) => r.method === "PUT").length;
  await page
    .getByRole("button", { name: "Edit headline", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("Discard this");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Edit headline", exact: true }),
  ).toBeFocused();
  expect(api.requests.filter((r) => r.method === "PUT")).toHaveLength(writes);
  await page.getByRole("button", { name: "Edit role", exact: true }).click();
  await page.getByRole("combobox", { name: "Role", exact: true }).click();
  await page.getByRole("option", { name: "Backend", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => api.profile.details.role).toBe("Backend");
  await page
    .getByRole("button", { name: "Edit technologies", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Technologies", exact: true })
    .fill("React, React, SQL");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => api.profile.details.stack).toEqual(["React", "SQL"]);
  const typography = await page
    .locator('[data-profile-field="about"] p')
    .evaluate((node) => {
      const s = getComputedStyle(node);
      return {
        size: s.fontSize,
        weight: s.fontWeight,
        loaded: [...document.fonts].some(
          (font) =>
            font.status === "loaded" &&
            s.fontFamily.includes(font.family.replaceAll('"', "")),
        ),
      };
    });
  expect(typography.size).toBe("16px");
  expect(typography.weight).toBe("400");
  expect(typography.loaded).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("profile-overview.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator('[data-profile-field="headline"]')).toContainText(
    "Backend engineer",
  );
});

test("failed saves retain input and stale field changes require a fresh edit", async ({
  page,
  api,
}, testInfo) => {
  await page.goto("/profile");
  await page
    .getByRole("button", { name: "Edit headline", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("Retained edit");
  api.failures.set("PUT /api/profile", {
    status: 503,
    error: "Private stack trace",
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Couldn’t save. Try again.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Headline", exact: true }),
  ).toHaveValue("Retained edit");
  await expect(page.getByText("Private stack trace")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("profile-edit-error.png"),
    fullPage: true,
  });
  api.failures.delete("PUT /api/profile");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator('[data-profile-field="headline"]')).toContainText(
    "Retained edit",
  );
  await page
    .getByRole("button", { name: "Edit headline", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("My new edit");
  api.profile.details.headline = "Saved elsewhere";
  const writes = api.requests.filter((r) => r.method === "PUT").length;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("This changed in another tab. Cancel and edit it again.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(api.requests.filter((r) => r.method === "PUT")).toHaveLength(writes);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator('[data-profile-field="headline"]')).toContainText(
    "Saved elsewhere",
  );
  await page
    .getByRole("button", { name: "Edit headline", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("New confirmed edit");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator('[data-profile-field="headline"]')).toContainText(
    "New confirmed edit",
  );
});

test("projects and custom links validate, edit and delete without onboarding", async ({
  page,
  api,
}) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  const form = page.getByRole("form", { name: "Add project", exact: true });
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    form.getByRole("textbox", { name: "Project name", exact: true }),
  ).toBeFocused();
  await form
    .getByRole("textbox", { name: "Project name", exact: true })
    .fill("Relay");
  await form
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Offline billing.");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit project Relay", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit description", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Updated description.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect(api.profile.details.projects[0]?.name).toBe("Relay");
  await expect
    .poll(() => api.profile.details.projects[0]?.description)
    .toBe("Updated description.");
  await page
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(api.profile.details.projects).toHaveLength(1);
  await page
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect.poll(() => api.profile.details.projects.length).toBe(0);
  await page
    .getByRole("button", { name: "Add another link", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Link label", exact: true })
    .fill("Writing");
  await page
    .getByRole("textbox", { name: "URL", exact: true })
    .fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "URL", exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page
    .getByRole("textbox", { name: "URL", exact: true })
    .fill("https://example.com/writing");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => api.profile.details.otherLinks.length).toBe(1);
  await page
    .getByRole("button", { name: "Delete Writing", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect.poll(() => api.profile.details.otherLinks.length).toBe(0);
  await expect(page).toHaveURL(/\/profile$/);
});

test("profile import persists choices and applies selected nonempty fields only", async ({
  page,
  api,
}) => {
  api.imported.suggestions.about = "";
  const previousAbout = api.profile.details.about;
  api.profile.onboarding.step = 4;
  await page.goto("/profile");
  await page
    .getByRole("button", { name: "Import profile", exact: true })
    .click();
  await page.getByRole("tab", { name: "Paste text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Resume or profile text", exact: true })
    .fill("A synthetic resume with enough background text to analyze.");
  await page.getByRole("button", { name: "Analyze text", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review suggestions", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Name", exact: true }).uncheck();
  await expect
    .poll(() => api.profile.onboarding.importSelection?.includes("name"))
    .toBe(false);
  expect(api.profile.details.headline).toBe("Frontend engineer");
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Name", exact: true }),
  ).not.toBeChecked();
  api.profile.details.location = "Fresh remote value";
  await page
    .getByRole("button", { name: "Apply selected", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review suggestions", exact: true }),
  ).toHaveCount(0);
  expect(api.profile.details.name).toBe("Alex Morgan");
  expect(api.profile.details.headline).toBe("Imported headline");
  expect(api.profile.details.about).toBe(previousAbout);
  expect(api.profile.details.location).toBe("Fresh remote value");
  expect(api.profile.onboarding.pendingImport).toBeNull();
  expect(api.profile.onboarding.step).toBe(4);
  expect(api.profile.completedAt).toBe(now);
});

test("leaving the account aborts a queued edit before it can write", async ({
  page,
  api,
}) => {
  await page.goto("/profile");
  await page
    .getByRole("button", { name: "Edit headline", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Headline", exact: true })
    .fill("Do not write after logout");
  let release!: () => void;
  api.holds.set(
    "GET /api/profile",
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const reading = page.waitForRequest(
    (request) =>
      request.method() === "GET" &&
      new URL(request.url()).pathname === "/api/profile",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const request = await reading;
  const aborted = page.waitForEvent(
    "requestfailed",
    (failed) => failed === request,
  );
  try {
    await page
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(new RegExp("/$"));
    await aborted;
    expect(api.requests.filter((item) => item.method === "PUT")).toHaveLength(
      0,
    );
    expect(api.profile.details.headline).toBe("Frontend engineer");
  } finally {
    api.holds.delete("GET /api/profile");
    release();
  }
});
