import { expect, test } from "bun:test";
import { requestPublicURL, readBounded } from "../src/lib/profileSource";

test("profile requests keep the original hostname for TLS and HTTP routing", async () => {
  let target = "";
  let redirect: RequestInit["redirect"] | undefined;
  const response = await requestPublicURL(
    new URL("https://prajwal.sh/about?source=profile"),
    AbortSignal.timeout(1000),
    async (input, init) => {
      target = String(input);
      redirect = init?.redirect;
      return new Response("Public portfolio content", {
        headers: { "content-type": "text/html" },
      });
    },
  );
  expect(target).toBe("https://prajwal.sh/about?source=profile");
  expect(redirect).toBe("manual");
  expect(await readBounded(response)).toBe("Public portfolio content");
});
test("profile requests leave redirects for public-URL validation", async () => {
  const response = await requestPublicURL(
    new URL("https://prajwal.sh/"),
    AbortSignal.timeout(1000),
    async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://127.0.0.1/private" },
      }),
  );
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("https://127.0.0.1/private");
});
test("profile responses remain bounded while streaming", async () => {
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(200));
        controller.close();
      },
    }),
  );
  await expect(readBounded(response, 100)).rejects.toThrow("too large");
});
