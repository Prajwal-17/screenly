import { test as base, expect, type WebSocketRoute } from "@playwright/test";
import {
  emptyProfile,
  type Capabilities,
  type ClientEvent,
  type Feedback,
  type InterviewDetail,
  type ProfileImport,
  type ServerEvent,
  type UserProfile,
} from "@repo/shared";

export const now = Date.UTC(2026, 9, 20, 12);
export const profile: UserProfile = {
  status: "complete",
  completedAt: now,
  updatedAt: now,
  onboarding: { step: 5, pendingImport: null },
  details: {
    ...emptyProfile("Alex Morgan"),
    headline: "Frontend engineer",
    about: "I build accessible web applications.",
    role: "Frontend",
    level: "Mid-level",
    stack: ["React", "TypeScript"],
  },
};
export const feedback: Feedback = {
  scoreScale: 10,
  overallScore: 7.5,
  summary:
    "You explained the rendering lifecycle clearly. Compare alternatives with a concrete example.",
  dimensions: [
    "Technical accuracy",
    "Depth & trade-offs",
    "Problem solving",
    "Communication",
  ].map((name) => ({
    name,
    score: 7.5,
    explanation: "You connected the concept to a practical example.",
  })) as Feedback["dimensions"],
  strengths: ["Clear explanation of component rendering."],
  improvements: ["Compare alternatives before choosing an approach."],
  answers: [
    {
      messageId: "answer",
      observation: "You identified unnecessary renders.",
      suggestion: "Describe how profiling would confirm the issue.",
    },
  ],
  nextSteps: [
    "Profile an unnecessary render.",
    "Compare memoization with simpler boundaries.",
    "Explain a performance trade-off aloud.",
  ],
};
export function interview(
  id: string,
  status: InterviewDetail["status"],
): InterviewDetail {
  return {
    id,
    status,
    role: "Frontend",
    level: "Mid-level",
    topics: ["React", "TypeScript", "Web performance"],
    duration: 20,
    phase: "questions",
    createdAt: now - 86_400_000,
    startedAt: status === "draft" ? null : now - 180_000,
    endedAt: status === "completed" ? now : null,
    pausedAt: null,
    pausedMs: 0,
    feedbackStatus: status === "completed" ? "ready" : "pending",
    feedback: status === "completed" ? structuredClone(feedback) : null,
    feedbackModel: status === "completed" ? "synthetic-fixture" : null,
    messages:
      status === "draft"
        ? []
        : [
            {
              id: "question",
              role: "assistant",
              content:
                "How would you identify unnecessary re-renders in a React application?",
              status: "complete",
              createdAt: now - 120_000,
            },
            {
              id: "answer",
              role: "user",
              content:
                "I would profile the application, then check which props change.",
              status: "complete",
              createdAt: now - 60_000,
            },
          ],
  };
}

type Failure = { status: number; error: string };
type RequestRecord = { method: string; path: string; body: unknown };
export type FixtureApi = {
  authenticated: boolean;
  capabilities: Capabilities;
  profile: UserProfile;
  interviews: InterviewDetail[];
  requests: RequestRecord[];
  unexpected: string[];
  failures: Map<string, Failure>;
  holds: Map<string, Promise<void>>;
  imported: ProfileImport;
  importFailure: {
    error: string;
    status: number;
    extractedText?: string;
  } | null;
  clients: ClientEvent[];
  sockets: Set<WebSocketRoute>;
  send: (event: ServerEvent) => void;
  disconnect: () => void;
};

export const test = base.extend<{ api: FixtureApi }>({
  api: [
    async ({ context, page }, use) => {
      const api: FixtureApi = {
        authenticated: true,
        capabilities: { google: true, voice: true, llm: true, devLogin: false },
        profile: structuredClone(profile),
        interviews: [
          interview("completed", "completed"),
          interview("active", "active"),
          interview("draft", "draft"),
        ],
        requests: [],
        unexpected: [],
        failures: new Map(),
        holds: new Map(),
        imported: {
          source: "Synthetic resume",
          extractedCharacters: 80,
          suggestions: {
            name: "Imported Name",
            headline: "Imported headline",
            stack: ["Python"],
          },
        },
        importFailure: null,
        clients: [],
        sockets: new Set(),
        send(event) {
          for (const socket of api.sockets) socket.send(JSON.stringify(event));
        },
        disconnect() {
          for (const socket of api.sockets) socket.close();
          api.sockets.clear();
        },
      };
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.clock.setFixedTime(now);
      await context.route("**/api/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        const method = request.method();
        const key = `${method} ${path}`;
        const headers = {
          "access-control-allow-origin":
            request.headers().origin ?? "http://127.0.0.1:3106",
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
        };
        if (method === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        let body: unknown;
        try {
          body = request.postDataJSON();
        } catch {
          body = request.postData();
        }
        api.requests.push({ method, path, body });
        await api.holds.get(key);
        const failure = api.failures.get(key);
        if (failure)
          return route.fulfill({
            status: failure.status,
            headers,
            json: { error: failure.error },
          });
        let data: unknown;
        let status = 200;
        const id = path.split("/")[3];
        const detail = api.interviews.find((item) => item.id === id);
        if (path === "/api/auth/get-session") {
          const date = new Date(now).toISOString();
          data = api.authenticated
            ? {
                user: {
                  id: "fixture-user",
                  name: "Alex Morgan",
                  email: "alex@example.com",
                  emailVerified: true,
                  image: null,
                  createdAt: date,
                  updatedAt: date,
                },
                session: {
                  id: "fixture-session",
                  userId: "fixture-user",
                  token: "synthetic",
                  expiresAt: new Date(now + 86_400_000).toISOString(),
                  createdAt: date,
                  updatedAt: date,
                },
              }
            : null;
        } else if (path === "/api/auth/sign-out") {
          api.authenticated = false;
          data = { success: true };
        } else if (path === "/api/capabilities") data = api.capabilities;
        else if (path === "/api/profile" && method === "GET")
          data = api.profile;
        else if (path === "/api/profile" && method === "PUT") {
          const saved = body as {
            details: UserProfile["details"];
            complete: boolean;
            onboarding?: UserProfile["onboarding"];
          };
          api.profile = {
            ...api.profile,
            details: saved.details,
            onboarding: saved.complete
              ? { step: 5, pendingImport: null }
              : (saved.onboarding ?? api.profile.onboarding),
            updatedAt: now + api.requests.length,
            status: saved.complete
              ? "complete"
              : api.profile.status === "new"
                ? "draft"
                : api.profile.status,
          };
          data = api.profile;
        } else if (path === "/api/profile/skip") {
          api.profile.status = "skipped";
          data = api.profile;
        } else if (path === "/api/profile/import") {
          const events = [
            { type: "progress", stage: "extracting" },
            { type: "progress", stage: "analyzing" },
            api.importFailure
              ? { type: "error", ...api.importFailure }
              : { type: "result", result: api.imported },
          ];
          return route.fulfill({
            headers,
            contentType: "application/x-ndjson",
            body:
              events.map((event) => JSON.stringify(event)).join("\n") + "\n",
          });
        } else if (path === "/api/interviews" && method === "POST") {
          const created = {
            ...interview("created", "draft"),
            ...(body as object),
          };
          api.interviews.push(created);
          data = created;
        } else if (path === "/api/interviews") data = api.interviews;
        else if (detail && method === "DELETE") {
          api.interviews = api.interviews.filter((item) => item.id !== id);
          status = 204;
        } else if (detail && path.endsWith("/finish")) {
          const generate =
            (body as { generateFeedback?: boolean }).generateFeedback !== false;
          Object.assign(detail, {
            status: "completed",
            endedAt: now,
            feedbackStatus: generate ? "pending" : "skipped",
          });
          data = detail;
        } else if (detail && path.endsWith("/feedback")) {
          detail.feedbackStatus = "ready";
          detail.feedback = structuredClone(feedback);
          data = { ok: true };
        } else if (detail) data = detail;
        else if (path.startsWith("/api/interviews/")) {
          status = 404;
          data = { error: "Interview not found." };
        } else {
          api.unexpected.push(key);
          status = 501;
          data = { error: "Unhandled fixture request." };
        }
        await route.fulfill({
          status,
          headers,
          ...(status === 204 ? {} : { json: data }),
        });
      });
      await context.routeWebSocket("**/api/interviews/*/ws", (socket) => {
        const id = new URL(socket.url()).pathname.split("/").at(-2);
        const detail = api.interviews.find((item) => item.id === id);
        if (!detail) return socket.close();
        api.sockets.add(socket);
        socket.onClose(() => api.sockets.delete(socket));
        socket.send(
          JSON.stringify({
            type: "ready",
            interview: detail,
          } satisfies ServerEvent),
        );
        if (detail.status === "active")
          socket.send(
            JSON.stringify({
              type: "status",
              status: "listening",
            } satisfies ServerEvent),
          );
        socket.onMessage((message) => {
          if (typeof message !== "string") return;
          const event = JSON.parse(message) as ClientEvent;
          api.clients.push(event);
          if (event.type === "pause") {
            detail.pausedAt = event.paused ? now : null;
            socket.send(
              JSON.stringify({
                type: "pause-state",
                interview: detail,
                requestId: event.requestId,
              } satisfies ServerEvent),
            );
          }
          if (event.type === "finish") {
            Object.assign(detail, {
              status: "completed",
              endedAt: now,
              feedbackStatus:
                event.generateFeedback === false ? "skipped" : "pending",
            });
            socket.send(
              JSON.stringify({
                type: "finished",
                id: detail.id,
                generateFeedback: event.generateFeedback,
              } satisfies ServerEvent),
            );
          }
        });
      });
      await use(api);
      expect(pageErrors, "No uncaught browser errors").toEqual([]);
      expect(
        api.unexpected,
        "Every fixture request must be intentional",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
