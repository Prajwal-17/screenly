import { describe, expect, test } from "vitest";
import { app } from "./runtime";
import { createTestSession } from "./runtime";
describe("authenticated API", () => {
  test("Google sign-in starts an OAuth redirect with state", async () => {
    const response = await app.request("/api/auth/sign-in/social", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        provider: "google",
        callbackURL: "http://localhost:3000/dashboard",
        errorCallbackURL: "http://localhost:3000/auth/sign-in?error=oauth",
      }),
    });
    expect(response.status).toBe(200);
    const result = await response.json<any>();
    const url = new URL(result.url);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:8787/api/auth/callback/google",
    );
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
  });
  test("email signup and sign-in are disabled", async () => {
    for (const path of ["sign-up/email", "sign-in/email"]) {
      const response = await app.request(`/api/auth/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Candidate",
          email: "blocked@example.com",
          password: "test-password-123",
        }),
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });
  test("sessions are isolated across accounts", async () => {
    const origin = "http://localhost:3000";
    const session = await createTestSession();
    const cookie = `${session.name}=${session.value}`;
    const headers = {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: origin,
    };
    const create = await app.request("/api/interviews", {
      method: "POST",
      headers,
      body: JSON.stringify({
        role: "Backend",
        level: "Junior",
        topics: ["APIs"],
        duration: 10,
      }),
    });
    expect(create.status).toBe(201);
    const interview = await create.json<any>();
    expect(
      (await app.request(`/api/interviews/${interview.id}`, { headers }))
        .status,
    ).toBe(200);
    expect((await app.request(`/api/interviews/${interview.id}`)).status).toBe(
      401,
    );
    const other = await createTestSession();
    const otherCookie = `${other.name}=${other.value}`;
    expect(
      (
        await app.request(`/api/interviews/${interview.id}`, {
          headers: { Cookie: otherCookie },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await app.request(`/api/interviews/${interview.id}/ws`, {
          headers: { Cookie: otherCookie },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await app.request(`/api/interviews/${interview.id}`, {
          method: "DELETE",
          headers: { Cookie: otherCookie },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await app.request(`/api/interviews/${interview.id}/finish`, {
          method: "POST",
          headers,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await app.request("/api/interviews", {
          method: "POST",
          headers,
          body: "{}",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await app.request(`/api/interviews/${interview.id}`, {
          method: "DELETE",
          headers,
        })
      ).status,
    ).toBe(204);
  });
});
