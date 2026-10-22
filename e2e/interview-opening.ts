import { expect, type Page } from "@playwright/test";
import { voiceURL } from "./environment";

// Explicit voice consent for journeys that disable the provider's automatic turns.
export async function beginTechnicalInterview(page: Page) {
  await expect(page.locator('[data-slot="live-caption"]')).toContainText(
    "Ready to begin?",
    { timeout: 15000 },
  );
  await page.request.post(`${voiceURL}/turn`, {
    data: { transcript: "Yes, ready." },
  });
  await expect(page.locator('[data-slot="live-caption"]')).toContainText(
    "How would you test a component",
  );
}
