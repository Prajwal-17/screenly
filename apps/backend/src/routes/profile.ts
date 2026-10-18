import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { stream } from "hono/streaming";
import {
  profileDetailsSchema,
  profileSaveSchema,
  type ProfileImportEvent,
  type ProfileImportStage,
} from "@repo/shared";
import { getCapabilities } from "../config";
import type { AppEnv } from "../context";
import { analyzeProfile } from "../lib/profileAnalysis";
import {
  ImportError,
  MAX_SOURCE_CHARS,
  normalizeSourceURL,
  profileLinkSource,
  resumeSource,
} from "../lib/profileSource";

export const profileRoutes = new Hono<AppEnv>();
profileRoutes.use("*", async (c, next) => {
  const session = await c
    .get("services")
    .auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  if (
    c.req.method !== "GET" &&
    c.req.header("Origin") !== c.get("config").FRONTEND_URL
  )
    return c.json({ error: "Origin is not allowed." }, 403);
  c.set("userId", session.user.id);
  c.header("Cache-Control", "no-store");
  await next();
});
profileRoutes.get("/", async (c) =>
  c.json(await c.get("services").profiles.get(c.get("userId"))),
);
profileRoutes.put("/", bodyLimit({ maxSize: 128 * 1024 }), async (c) => {
  const result = profileSaveSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!result.success)
    return c.json(
      {
        error: "Check your profile details before continuing.",
        fields: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  const { details, complete, onboarding } = result.data;
  return c.json(
    await c
      .get("services")
      .profiles.save(
        c.get("userId"),
        complete ? profileDetailsSchema.parse(details) : details,
        complete,
        onboarding,
      ),
  );
});
profileRoutes.post("/skip", async (c) =>
  c.json(await c.get("services").profiles.skip(c.get("userId"))),
);
profileRoutes.post(
  "/import",
  bodyLimit({
    maxSize: 6 * 1024 * 1024,
    onError: (c) => c.json({ error: "Choose a resume up to 5 MB." }, 413),
  }),
  async (c) => {
    let extract: () => ReturnType<typeof resumeSource>;
    try {
      if (c.req.header("Content-Type")?.includes("multipart/form-data")) {
        const data = await c.req.formData();
        const file = data.get("resume");
        if (!(file instanceof File))
          throw new ImportError("Choose a PDF, DOCX, DOC, or TXT resume.", 400);
        if (!file.size || file.size > 5 * 1024 * 1024)
          throw new ImportError("Choose a nonempty resume up to 5 MB.", 413);
        if (!/\.(pdf|docx?|txt)$/i.test(file.name))
          throw new ImportError("Choose a PDF, DOCX, DOC, or TXT resume.", 415);
        extract = () => resumeSource(file);
      } else {
        const data: unknown = await c.req.json().catch(() => null);
        if (!data || typeof data !== "object")
          throw new ImportError(
            "Add a profile link or paste your resume text.",
            400,
          );
        const { url, text } = data as { url?: unknown; text?: unknown };
        if (typeof url === "string" && url.trim() && url.length <= 2048) {
          normalizeSourceURL(url);
          extract = () => profileLinkSource(url, c.req.raw.signal);
        } else if (
          typeof text === "string" &&
          text.trim().length >= 40 &&
          text.length <= MAX_SOURCE_CHARS
        )
          extract = async () => ({
            text: text.trim(),
            source: "Pasted profile",
            link: {},
          });
        else
          throw new ImportError(
            "Add a public profile link or paste 40–30,000 characters of profile text.",
            400,
          );
      }
    } catch (error) {
      const issue =
        error instanceof ImportError
          ? error
          : new ImportError(
              "That upload could not be read. Choose the file again.",
              400,
            );
      return c.json({ error: issue.message }, issue.status);
    }
    if (!getCapabilities(c.get("config")).llm)
      return c.json(
        {
          error:
            "AI import is unavailable. You can still enter your details manually.",
        },
        503,
      );
    const now = Date.now();
    const id = c.get("userId");
    const acquired = await c.env.DB.prepare(
      `INSERT INTO profile_import_limit (user_id, window_start, count, active_until) VALUES (?, ?, 1, ?)
      ON CONFLICT(user_id) DO UPDATE SET
      window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END,
      count = CASE WHEN window_start < ? THEN 1 ELSE count + 1 END,
      active_until = excluded.active_until
      WHERE active_until < ? AND (window_start < ? OR count < 8) RETURNING user_id`,
    )
      .bind(
        id,
        now,
        now + 120000,
        now - 600000,
        now - 600000,
        now,
        now - 600000,
      )
      .first();
    if (!acquired)
      return c.json(
        {
          error:
            "Please wait before importing again. You can continue manually.",
        },
        429,
      );
    const release = async () => {
      await c.env.DB.prepare(
        "UPDATE profile_import_limit SET active_until=0 WHERE user_id=? AND active_until=?",
      )
        .bind(id, now + 120000)
        .run();
    };
    const controller = new AbortController();
    const signal = AbortSignal.any([
      c.req.raw.signal,
      controller.signal,
      AbortSignal.timeout(90000),
    ]);
    let extractedText = "";
    const run = async (
      progress: (stage: ProfileImportStage) => Promise<void>,
    ) => {
      await progress("extracting");
      signal.throwIfAborted();
      const source = await extract();
      extractedText = source.text;
      signal.throwIfAborted();
      await progress("analyzing");
      const suggestions = await analyzeProfile(
        source.text,
        signal,
        c.get("config"),
      );
      signal.throwIfAborted();
      return {
        suggestions: { ...suggestions, ...source.link },
        source: source.source,
        extractedCharacters: source.text.length,
      };
    };
    const failure = (error: unknown) =>
      error instanceof ImportError
        ? error
        : new ImportError(
            signal.aborted
              ? "Import took too long or was cancelled. Retry or continue manually."
              : "That source could not be imported. Try a resume, paste text, or continue manually.",
          );
    if (c.req.header("Accept")?.includes("application/x-ndjson")) {
      c.header("Content-Type", "application/x-ndjson");
      c.header("X-Accel-Buffering", "no");
      return stream(c, async (output) => {
        output.onAbort(() => controller.abort());
        const send = async (event: ProfileImportEvent) => {
          await output.write(JSON.stringify(event) + "\n");
        };
        try {
          const result = await run((stage) =>
            send({ type: "progress", stage }),
          );
          await send({ type: "result", result });
        } catch (error) {
          if (!output.aborted) {
            const issue = failure(error);
            await send({
              type: "error",
              error: issue.message,
              status: issue.status,
              ...(extractedText ? { extractedText } : {}),
            });
          }
        } finally {
          await release();
        }
      });
    }
    try {
      return c.json(await run(async () => {}));
    } catch (error) {
      const issue = failure(error);
      return c.json(
        { error: issue.message, ...(extractedText ? { extractedText } : {}) },
        issue.status,
      );
    } finally {
      await release();
    }
  },
);
