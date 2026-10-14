type State = {
  listen: boolean;
  answered: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};
const server = Bun.serve<State>({
  port: 8791,
  fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname === "/") return new Response("ok");
    return server.upgrade(request, {
      data: {
        listen: url.pathname.endsWith("listen"),
        answered: false,
        timer: null,
      },
    })
      ? undefined
      : new Response("Upgrade required", { status: 400 });
  },
  websocket: {
    open(socket) {
      socket.send(JSON.stringify({ type: "Connected" }));
    },
    message(socket, data) {
      if (socket.data.listen) {
        if (socket.data.answered) return;
        socket.data.answered = true;
        socket.data.timer = setTimeout(() => {
          socket.send(
            JSON.stringify({
              type: "TurnInfo",
              event: "StartOfTurn",
              turn_index: 0,
              sequence_id: 0,
              transcript: "",
            }),
          );
          socket.send(
            JSON.stringify({
              type: "TurnInfo",
              event: "EndOfTurn",
              turn_index: 0,
              sequence_id: 1,
              transcript: "I test the component behavior and loading states.",
            }),
          );
        }, 1500);
        return;
      }
      if (typeof data !== "string") return;
      const event = JSON.parse(data);
      if (event.type === "Speak") {
        const samples = new Int16Array(2400);
        for (let i = 0; i < samples.length; i++)
          samples[i] = Math.sin((i / 24000) * 440 * Math.PI * 2) * 1000;
        socket.send(new Uint8Array(samples.buffer));
      }
      if (event.type === "Flush") {
        socket.send(JSON.stringify({ type: "Flushed" }));
        socket.data.timer = setTimeout(
          () =>
            socket.send(
              JSON.stringify({
                type: "SpeechMetadata",
                speech_id: "fixture-speech",
                audio_duration_ms: 100,
              }),
            ),
          50,
        );
      }
    },
    close(socket) {
      if (socket.data.timer) clearTimeout(socket.data.timer);
    },
  },
});
console.log(`Local voice fixture listening on ${server.port}`);
