// Only test assets are served; no app login, database, or voice provider is used.
Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.SCREENLY_AUDIO_TEST_PORT ?? 9493),
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (/^\/(audio|vad)\/[a-zA-Z0-9_.-]+$/.test(path)) {
      const file = Bun.file(`apps/web/public${path}`);
      return new Response(file, {
        headers: {
          "Content-Type": path.endsWith(".wasm")
            ? "application/wasm"
            : /\.(m?js)$/.test(path)
              ? "application/javascript"
              : "application/octet-stream",
        },
      });
    }
    if (path === "/vad-speech.wav")
      return new Response(Bun.file("e2e/fixtures/vad-speech.wav"));
    return new Response("Audio test server");
  },
});
