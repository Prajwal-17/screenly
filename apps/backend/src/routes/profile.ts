import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { profileSaveSchema } from "@repo/shared";
import { auth } from "../auth";
import { env, capabilities } from "../config";
import { profiles } from "../db/profiles";
import { analyzeProfile } from "../lib/profileAnalysis";
import {
  ImportError,
  MAX_SOURCE_CHARS,
  profileLinkSource,
  resumeSource,
} from "../lib/profileSource";

export const profileRoutes = new Hono<{ Variables: { userId: string } }>();
const imports = new Map<
  string,
  { start: number; count: number; active: boolean }
>();
profileRoutes.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  if (c.req.method !== "GET" && c.req.header("Origin") !== env.FRONTEND_URL)
    return c.json({ error: "Origin is not allowed." }, 403);
  c.set("userId", session.user.id);
  c.header("Cache-Control", "no-store");
  await next();
});
profileRoutes.get("/", (c) => c.json(profiles.get(c.get("userId"))));
profileRoutes.put("/", bodyLimit({ maxSize: 65536 }), async (c) => {
  const result = profileSaveSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!result.success)
    return c.json(
      {
        error: "Check your name, links, and profile details.",
        fields: result.error.flatten().fieldErrors,
      },
      400,
    );
  return c.json(
    profiles.save(c.get("userId"), result.data.details, result.data.complete),
  );
});
profileRoutes.post("/skip", (c) => c.json(profiles.skip(c.get("userId"))));
profileRoutes.post(
  "/import",
  bodyLimit({
    maxSize: 6 * 1024 * 1024,
    onError: (c) => c.json({ error: "Choose a resume up to 5 MB." }, 413),
  }),
  async (c) => {
    if (!capabilities.llm)
      return c.json(
        {
          error:
            "AI import is unavailable. You can still enter your details manually.",
        },
        503,
      );
    const now = Date.now();
    for (const [key, value] of imports)
      if (!value.active && now - value.start > 600000) imports.delete(key);
    const id = c.get("userId");
    const activity = imports.get(id) ?? { start: now, count: 0, active: false };
    if (
      activity.active ||
      activity.count >= 8 ||
      [...imports.values()].filter((value) => value.active).length >= 8
    )
      return c.json(
        {
          error:
            "Please wait before importing again. You can continue manually.",
        },
        429,
      );
    activity.active = true;
    activity.count++;
    imports.set(id, activity);
    try {
      let source: {
        text: string;
        source: string;
        link: Partial<
          Record<"githubUrl" | "linkedinUrl" | "portfolioUrl", string>
        >;
      };
      if (c.req.header("Content-Type")?.includes("multipart/form-data")) {
        const data = await c.req.formData();
        const file = data.get("resume");
        if (!(file instanceof File))
          throw new ImportError("Choose a PDF, DOCX, or TXT resume.", 400);
        source = await resumeSource(file);
      } else {
        const data: unknown = await c.req.json().catch(() => null);
        if (!data || typeof data !== "object")
          throw new ImportError(
            "Add a profile link or paste your resume text.",
            400,
          );
        const { url, text } = data as { url?: unknown; text?: unknown };
        if (typeof url === "string" && url.trim() && url.length <= 2048)
          source = await profileLinkSource(url, c.req.raw.signal);
        else if (
          typeof text === "string" &&
          text.trim().length >= 40 &&
          text.length <= MAX_SOURCE_CHARS
        )
          source = { text: text.trim(), source: "Pasted profile", link: {} };
        else
          throw new ImportError(
            "Add a public link or paste 40–30,000 characters of profile text.",
            400,
          );
      }
      const suggestions = await analyzeProfile(source.text, c.req.raw.signal);
      return c.json({
        suggestions: { ...suggestions, ...source.link },
        source: source.source,
      });
    } catch (error) {
      return error instanceof ImportError
        ? c.json({ error: error.message }, error.status)
        : c.json(
            {
              error:
                "That source could not be imported. Try a resume, paste text, or continue manually.",
            },
            422,
          );
    } finally {
      activity.active = false;
    }
  },
);
