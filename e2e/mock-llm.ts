// Local provider fixture for browser tests. The application has no mock-provider mode.
const server = Bun.serve({
  port: 8790,
  async fetch(request) {
    if (new URL(request.url).pathname === "/") return new Response("ok");
    if (new URL(request.url).pathname !== "/v1/chat/completions")
      return new Response("Not found", { status: 404 });
    const body = (await request.json()) as {
      stream?: boolean;
      messages: { role: string; content: string }[];
    };
    const last = body.messages.at(-1)?.content ?? "";
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
    const transcript = JSON.parse(last).transcript as {
      id: string;
      role: string;
      content: string;
    }[];
    const candidates = transcript.filter((m) => m.role === "user");
    const report = {
      summary:
        "You connected component testing to user-visible behavior and considered error handling. Keep exploring concrete examples.",
      overallScore: candidates.length >= 2 ? 78 : null,
      dimensions: [
        {
          name: "Technical accuracy",
          score: 80,
          explanation: "You described behavior-focused assertions.",
        },
        {
          name: "Depth & trade-offs",
          score: 72,
          explanation: "Explore more alternatives and their trade-offs.",
        },
        {
          name: "Problem solving",
          score: 78,
          explanation: "Your approach follows a clear sequence.",
        },
        {
          name: "Communication",
          score: 82,
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
