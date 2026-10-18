// Runs in its own process so each case exercises config parsing and plugin registration.
import { auth } from "../src/auth";
import { capabilities } from "../src/config";
const endpoint = "http://localhost:8787/api/auth/sign-in/development";
const send = (
  email: string,
  origin: string | null = "http://localhost:3000",
  url = endpoint,
) =>
  auth.handler(
    new Request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify({ email }),
    }),
  );
if (!capabilities.devLogin) {
  const result = await send("developer@example.com");
  console.log(
    JSON.stringify({
      enabled: false,
      status: result.status,
      cookie: result.headers.has("set-cookie"),
    }),
  );
} else {
  const invalid = await send("invalid");
  const untrusted = await send(
    "developer@example.com",
    "https://other.example",
  );
  const noOrigin = await send("developer@example.com", null);
  const remoteHost = await send(
    "developer@example.com",
    "http://localhost:3000",
    "https://remote.example/api/auth/sign-in/development",
  );
  const first = await send("  Developer@Example.com  ");
  const cookie = first.headers.get("set-cookie")?.split(";")[0] ?? "";
  const user = await first.json();
  const session = await auth.api.getSession({
    headers: new Headers({ Cookie: cookie }),
  });
  const second = await send("developer@example.com");
  const secondUser = await second.json();
  const signOut = await auth.handler(
    new Request("http://localhost:8787/api/auth/sign-out", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
  );
  const signedOut = await auth.api.getSession({
    headers: new Headers({ Cookie: cookie }),
  });
  console.log(
    JSON.stringify({
      enabled: true,
      invalid: invalid.status,
      untrusted: untrusted.status,
      noOrigin: noOrigin.status,
      remoteHost: remoteHost.status,
      status: first.status,
      email: session?.user.email,
      verified: session?.user.emailVerified,
      sameUser: user.user?.id === secondUser.user?.id,
      signOut: signOut.status,
      signedOut: signedOut === null,
    }),
  );
}
