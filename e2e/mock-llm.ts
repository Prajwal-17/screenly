import { llmPort } from "./environment";
// Local provider fixture for browser tests. The application has no mock-provider mode.
const failedReports = new Set<string>();
const server = Bun.serve({
  port: llmPort,
  async fetch(request) {
    if (new URL(request.url).pathname === "/") return new Response("ok");
    if (new URL(request.url).pathname !== "/v1/chat/completions")
      return new Response("Not found", { status: 404 });
    const body = (await request.json()) as {
      stream?: boolean;
      messages: { role: string; content: string }[];
    };
    const last = body.messages.at(-1)?.content ?? "";
    if (body.messages[0]?.content.startsWith("screenly-profile-import")) {
      if (last.includes("PROFILE_PROVIDER_FAILURE"))
        return Response.json(
          { error: { message: "Test import failure" } },
          { status: 503 },
        );
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                headline: "Backend engineer",
                location: "London",
                role: "Backend",
                level: "Senior",
                stack: ["Python", "SQL"],
                githubUrl: "https://github.com/example-candidate",
              }),
            },
          },
        ],
      });
    }
    if (body.stream) {
      if (
        last.includes("I would test a failed request and show a retry control.")
      )
        return Response.json(
          { error: { message: "Test provider failure" } },
          { status: 500 },
        );
      const text = last.includes("mock a rejected request")
        ? "How would you keep asynchronous tests deterministic without relying on arbitrary delays?"
        : body.messages.some((m) => m.role === "assistant")
          ? "You mentioned testing behavior. How would you handle an asynchronous request that fails?"
          : "Welcome. Let’s begin with React. How would you test a component that fetches data?";
      const chunks = text.match(/.{1,25}/g) ?? [];
      const stream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`,
              ),
            );
            await Bun.sleep(25);
          }
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      });
    }
    if (last.includes("feedback-retry") && !failedReports.has(last)) {
      failedReports.add(last);
      return Response.json(
        { error: { message: "One-time feedback failure" } },
        { status: 400 },
      );
    }
    const transcript = JSON.parse(last).transcript as {
      id: string;
      role: string;
      content: string;
    }[];
    const candidates = transcript.filter((m) => m.role === "user");
    const report = {
      scoreScale: 10,
      summary:
        "You connected component testing to user-visible behavior and considered error handling. Keep exploring concrete examples.",
      overallScore: candidates.length >= 2 ? 7.8 : null,
      dimensions: [
        {
          name: "Technical accuracy",
          score: 8,
          explanation: "You described behavior-focused assertions.",
        },
        {
          name: "Depth & trade-offs",
          score: 7.2,
          explanation: "Explore more alternatives and their trade-offs.",
        },
        {
          name: "Problem solving",
          score: 7.8,
          explanation: "Your approach follows a clear sequence.",
        },
        {
          name: "Communication",
          score: 8.2,
          explanation: "Your explanations were clear and concise.",
        },
      ],
      strengths: [
        "You focused on behavior rather than implementation details.",
      ],
      improvements: ["Explain how you would test failure and loading states."],
      answers: candidates.map((m) => ({
        messageId: m.id,
        observation: "You offered a concrete approach to component testing.",
        suggestion: "Include an example assertion and a failure case.",
      })),
      nextSteps: [
        "Write a loading-state test.",
        "Practice explaining asynchronous errors.",
        "Compare integration tests with unit tests.",
      ],
    };
    return Response.json({
      id: "test-completion",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: JSON.stringify(report) },
          finish_reason: "stop",
        },
      ],
    });
  },
});
console.log(`Local LLM fixture listening on ${server.port}`);
