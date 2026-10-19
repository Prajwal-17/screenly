export type SocketFactory = (
  url: URL,
  key: string,
) => WebSocket | Promise<WebSocket>;
export async function openProviderSocket(
  url: URL,
  key: string,
  timeoutMs = 12000,
): Promise<WebSocket> {
  const target = new URL(url);
  target.protocol = target.protocol === "wss:" ? "https:" : "http:";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target, {
      headers: { Upgrade: "websocket", Authorization: `Token ${key}` },
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status !== 101 || !response.webSocket) {
      await response.body?.cancel();
      throw new DeepgramConnectionError(String(response.status));
    }
    return response.webSocket;
  } catch (error) {
    if (controller.signal.aborted) throw new DeepgramConnectionError("TIMEOUT");
    throw error;
  } finally {
    // A fetch abort also closes an upgraded Workers WebSocket. Only time out
    // the handshake; the established socket lives for the interview session.
    clearTimeout(timer);
  }
}
export type DeepgramMessage = { type: string; [key: string]: unknown };
type Handlers = {
  json: (message: DeepgramMessage) => void;
  audio?: (data: Uint8Array) => void;
  error: (error: Error) => void;
};
export class DeepgramConnectionError extends Error {
  constructor(code = "CONNECTION_FAILED") {
    const message =
      code === "401" || code === "INVALID_AUTH"
        ? "Deepgram rejected the API key (401 INVALID_AUTH). Update DEEPGRAM_API_KEY on the backend and restart it."
        : code === "403"
          ? "Deepgram denied access (403). Check API key permissions and model access."
          : code === "429"
            ? "Deepgram rate limit reached (429). Wait a moment and retry."
            : code === "400"
              ? "Deepgram rejected the model or audio settings (400). Check backend voice configuration."
              : code === "MISSING_KEY"
                ? "The backend Deepgram API key is missing. Configure DEEPGRAM_API_KEY and restart."
                : code === "TIMEOUT"
                  ? "Deepgram connection timed out. Check network access and retry."
                  : "Deepgram connection failed. Check the backend API key, model, and network access, then retry.";
    super(message);
    this.name = "DeepgramConnectionError";
  }
}
export class DeepgramSocket {
  private socket: WebSocket | null = null;
  private closed = false;
  private rejectReady: ((error: Error) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private url: URL,
    private key: string,
    private handlers: Handlers,
    private makeSocket: (
      url: URL,
      key: string,
    ) => WebSocket | Promise<WebSocket> = openProviderSocket,
  ) {}
  async connect() {
    if (this.closed) throw new Error("Connection was cancelled.");
    if (!this.key) throw new DeepgramConnectionError("MISSING_KEY");
    let socket: WebSocket;
    try {
      socket = await this.makeSocket(this.url, this.key);
    } catch (error) {
      throw error instanceof DeepgramConnectionError
        ? error
        : new DeepgramConnectionError();
    }
    if (this.closed) {
      if ("accept" in socket && typeof socket.accept === "function")
        socket.accept();
      socket.close();
      throw new Error("Connection was cancelled.");
    }
    this.socket = socket;
    socket.binaryType = "arraybuffer";
    await new Promise<void>((resolve, reject) => {
      this.rejectReady = reject;
      this.timer = setTimeout(
        () => this.fail(new DeepgramConnectionError("TIMEOUT")),
        12000,
      );
      socket.addEventListener("message", (event: MessageEvent) => {
        if (this.closed) return;
        if (event.data instanceof ArrayBuffer) {
          this.handlers.audio?.(new Uint8Array(event.data));
          return;
        }
        try {
          const message = JSON.parse(String(event.data)) as DeepgramMessage;
          if (message.type === "Connected") {
            if (this.timer) clearTimeout(this.timer);
            this.rejectReady = null;
            resolve();
          }
          if (message.type === "Error") {
            this.fail(new DeepgramConnectionError(String(message.code)));
            return;
          }
          this.handlers.json(message);
        } catch {
          this.fail();
        }
      });
      socket.addEventListener("error", (event) => {
        const status = (event as ErrorEvent).message?.match(
          /\b(400|401|403|429)\b/,
        )?.[1];
        this.fail(new DeepgramConnectionError(status));
      });
      socket.addEventListener("close", () => {
        if (!this.closed) this.fail();
      });
      if ("accept" in socket && typeof socket.accept === "function")
        socket.accept();
    });
  }
  send(data: unknown) {
    if (!this.closed && this.socket?.readyState === 1) {
      try {
        this.socket.send(
          data instanceof Uint8Array
            ? Uint8Array.from(data)
            : JSON.stringify(data),
        );
      } catch {
        this.fail();
      }
    }
  }
  private fail(error: Error = new DeepgramConnectionError()) {
    if (this.closed) return;
    this.rejectReady?.(error);
    this.close();
    this.handlers.error(error);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.rejectReady?.(new Error("Connection was cancelled."));
    this.rejectReady = null;
    this.socket?.close();
    this.socket = null;
  }
}
