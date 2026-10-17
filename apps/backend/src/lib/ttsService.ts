import type { Config } from "../config";
import {
  DeepgramConnectionError,
  DeepgramSocket,
  type SocketFactory,
} from "./deepgramSocket";
// A separate connection per reply isolates late binary audio after cancellation.
// The installed SDK's speech socket JSON-parses binary frames; use the wire protocol here.
export class TTSService {
  private socket: DeepgramSocket | null = null;
  private closed = false;
  private failure: Error | null = null;
  private resolveFlush: (() => void) | null = null;
  private rejectFlush: ((error: Error) => void) | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private env: Config,
    private onAudio: (data: Uint8Array) => void,
    private makeSocket?: SocketFactory,
  ) {}
  async connect() {
    const url = new URL("/v2/speak", this.env.DEEPGRAM_WS_URL);
    url.search = new URLSearchParams({
      model: this.env.DEEPGRAM_TTS_MODEL,
      expressivity: String(this.env.DEEPGRAM_TTS_EXPRESSIVITY),
      encoding: "linear16",
      sample_rate: "24000",
    }).toString();
    this.socket = new DeepgramSocket(
      url,
      this.env.DEEPGRAM_API_KEY ?? "",
      {
        json: (message) => {
          if (message.type === "ConfigureFailure") {
            this.failure = new Error(
              "The voice provider rejected the speech speed.",
            );
            this.rejectFlush?.(this.failure);
          }
          // Flushed only acknowledges the text buffer; audio can still be arriving.
          if (message.type === "SpeechMetadata") this.resolveFlush?.();
        },
        audio: (data) => {
          if (!this.closed) {
            if (data.byteLength > 0) this.refreshFlushTimeout();
            this.onAudio(data);
          }
        },
        error: (error) => {
          this.failure = error;
          this.rejectFlush?.(error);
        },
      },
      this.makeSocket,
    );
    await this.socket.connect();
    if (this.closed) this.socket.close();
    else
      this.socket.send({
        type: "Configure",
        speed: this.env.DEEPGRAM_TTS_SPEED,
      });
  }
  sendText(text: string) {
    if (!this.closed) this.socket?.send({ type: "Speak", text });
  }
  async flush() {
    if (this.closed) return;
    if (this.failure) throw this.failure;
    try {
      await new Promise<void>((resolve, reject) => {
        this.resolveFlush = resolve;
        this.rejectFlush = reject;
        this.refreshFlushTimeout();
        this.socket?.send({ type: "Flush" });
      });
    } finally {
      this.clearFlushTimeout();
      this.resolveFlush = null;
      this.rejectFlush = null;
    }
  }
  private refreshFlushTimeout() {
    if (!this.rejectFlush) return;
    // Longer replies can still be synthesizing after twenty seconds. Only
    // time out a stalled stream; SpeechMetadata marks actual completion.
    this.clearFlushTimeout();
    this.flushTimer = setTimeout(() => {
      this.failure = new DeepgramConnectionError("SPEECH_TIMEOUT");
      this.rejectFlush?.(this.failure);
    }, 20000);
  }
  private clearFlushTimeout() {
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }
  close() {
    this.closed = true;
    this.clearFlushTimeout();
    this.resolveFlush?.();
    this.socket?.send({ type: "Interrupt" });
    this.socket?.close();
    this.socket = null;
  }
}
