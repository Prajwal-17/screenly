import { env } from "../config";
import { DeepgramSocket } from "./deepgramSocket";
// A separate connection per reply isolates late binary audio after cancellation.
// The installed SDK's speech socket JSON-parses binary frames; use the wire protocol here.
export class TTSService {
  private socket: DeepgramSocket | null = null;
  private closed = false;
  private failure: Error | null = null;
  private resolveFlush: (() => void) | null = null;
  private rejectFlush: ((error: Error) => void) | null = null;
  constructor(private onAudio: (data: Uint8Array) => void) {}
  async connect() {
    const url = new URL("/v2/speak", env.DEEPGRAM_WS_URL);
    url.search = new URLSearchParams({
      model: env.DEEPGRAM_TTS_MODEL,
      encoding: "linear16",
      sample_rate: "24000",
    }).toString();
    this.socket = new DeepgramSocket(url, env.DEEPGRAM_API_KEY ?? "", {
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
        if (!this.closed) this.onAudio(data);
      },
      error: (error) => {
        this.failure = error;
        this.rejectFlush?.(error);
      },
    });
    await this.socket.connect();
    if (this.closed) this.socket.close();
    else this.socket.send({ type: "Configure", speed: env.DEEPGRAM_TTS_SPEED });
  }
  sendText(text: string) {
    if (!this.closed) this.socket?.send({ type: "Speak", text });
  }
  async flush() {
    if (this.closed) return;
    if (this.failure) throw this.failure;
    let timer: ReturnType<typeof setTimeout>;
    try {
      await new Promise<void>((resolve, reject) => {
        this.resolveFlush = resolve;
        this.rejectFlush = reject;
        timer = setTimeout(() => reject(new Error("Speech timed out.")), 20000);
        this.socket?.send({ type: "Flush" });
      });
    } finally {
      clearTimeout(timer!);
      this.resolveFlush = null;
      this.rejectFlush = null;
    }
  }
  close() {
    this.closed = true;
    this.resolveFlush?.();
    this.socket?.send({ type: "Interrupt" });
    this.socket?.close();
    this.socket = null;
  }
}
