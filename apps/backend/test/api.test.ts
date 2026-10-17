import { afterAll, describe, expect, test } from "bun:test";
import { app, server } from "../src";
afterAll(() => server.stop(true));
describe("authenticated API", () => {
  test("email signup works and sessions are isolated across accounts", async () => {
    const origin = "http://localhost:3000";
    const signup = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        name: "API Candidate",
        email: "api-candidate@example.com",
        password: "test-password-123",
      }),
    });
    expect(signup.status).toBe(200);
    const cookie = signup.headers.get("set-cookie")!.split(";")[0]!;
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
    const interview = await create.json();
    expect(
      (await app.request(`/api/interviews/${interview.id}`, { headers }))
        .status,
    ).toBe(200);
    expect((await app.request(`/api/interviews/${interview.id}`)).status).toBe(
      401,
    );
    const other = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        name: "Other Candidate",
        email: "other-candidate@example.com",
        password: "test-password-123",
      }),
    });
    const otherCookie = other.headers.get("set-cookie")!.split(";")[0]!;
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
