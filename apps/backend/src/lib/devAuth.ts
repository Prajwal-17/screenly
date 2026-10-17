import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

// Imported and registered only when the server's local-development gate is open.
export function developmentAuth(frontendURL: string): BetterAuthPlugin {
  return {
    id: "local-development-auth",
    endpoints: {
      developmentSignIn: createAuthEndpoint(
        "/sign-in/development",
        {
          method: "POST",
          body: z
            .object({
              email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
            })
            .strict(),
        },
        async (ctx) => {
          if (ctx.headers?.get("origin") !== frontendURL) {
            throw new APIError("FORBIDDEN", {
              message: "Local sign-in requires the development app origin.",
            });
          }
          const hostname = ctx.request && new URL(ctx.request.url).hostname;
          if (
            !hostname ||
            !["localhost", "127.0.0.1", "[::1]"].includes(hostname)
          ) {
            throw new APIError("FORBIDDEN", {
              message: "Local sign-in is only available on loopback.",
            });
          }
          const { email } = ctx.body;
          const existing =
            await ctx.context.internalAdapter.findUserByEmail(email);
          const user =
            existing?.user ??
            (await ctx.context.internalAdapter.createUser(
              {
                email,
                emailVerified: false,
                name: email.split("@")[0]!,
              },
              { method: "local-development" },
            ));
          const session = await ctx.context.internalAdapter.createSession(
            user.id,
            true,
          );
          if (!session)
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Could not start the local session.",
            });
          await setSessionCookie(ctx, { session, user }, true);
          return ctx.json({
            user: { id: user.id, email: user.email, name: user.name },
          });
        },
      ),
    },
  };
}
