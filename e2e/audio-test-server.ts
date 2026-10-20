// Only test assets are served; no app login, database, or voice provider is used.
Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.SCREENLY_AUDIO_TEST_PORT ?? 9493),
  fetch(request) {
    if (new URL(request.url).pathname === "/audio/playback-processor.js")
      return new Response(
        Bun.file("apps/web/public/audio/playback-processor.js"),
        {
          headers: { "Content-Type": "application/javascript" },
        },
      );
    return new Response("Audio test server");
  },
});
