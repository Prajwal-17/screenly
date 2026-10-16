import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import type { InterviewSettings } from "@repo/shared";
import type { Config } from "../config";
import { DeepgramSocket, type SocketFactory } from "./deepgramSocket";

const vocabulary: Record<InterviewSettings["topics"][number], string[]> = {
  JavaScript: [
    "JavaScript",
    "ECMAScript",
    "Promise",
    "async await",
    "event loop",
  ],
  React: ["React", "JSX", "useEffect", "useState", "useMemo", "React hooks"],
  TypeScript: [
    "TypeScript",
    "generics",
    "type inference",
    "discriminated union",
  ],
  APIs: ["API", "REST", "GraphQL", "HTTP", "OAuth"],
  Databases: ["SQL", "PostgreSQL", "NoSQL", "indexes", "transactions"],
  "System design": [
    "load balancer",
    "caching",
    "sharding",
    "replication",
    "idempotency",
  ],
  Testing: [
    "unit test",
    "integration test",
    "end-to-end test",
    "Jest",
    "Playwright",
  ],
  "Web performance": ["Core Web Vitals", "LCP", "INP", "CLS", "lazy loading"],
};
export class STTService {
  private socket: DeepgramSocket | null = null;
  private opening: Promise<void> | null = null;
  private closed = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAudioAt = 0;
  private pendingBytes = 0;
  private latestTurn = -1;
  private activeTurn = false;
  private endRequested = false;
  constructor(
    private env: Config,
    private onTurn: (event: ListenV2TurnInfo) => void,
    private onError: (error: Error) => void,
    private topics: InterviewSettings["topics"] = [],
    private makeSocket?: SocketFactory,
  ) {}
  connect(): Promise<void> {
    if (this.closed)
      return Promise.reject(new Error("Transcription is closed."));
    if (this.opening) return this.opening;
    if (this.socket) return Promise.resolve();
    const task = this.open().finally(() => {
      if (this.opening === task) this.opening = null;
    });
    this.opening = task;
    return task;
  }
  private async open() {
    const url = new URL("/v2/listen", this.env.DEEPGRAM_WS_URL);
    url.search = new URLSearchParams({
      model: this.env.DEEPGRAM_STT_MODEL,
      encoding: "linear16",
      sample_rate: "16000",
      eot_timeout_ms: String(this.env.DEEPGRAM_EOT_TIMEOUT_MS),
      eager_eot_threshold: "0.5",
    }).toString();
    // Keep final turn confidence at its default. Eager events only prepare a
    // cancellable reply; they never finalize an answer or start speech.
    const keyterms = new Set(this.topics.flatMap((topic) => vocabulary[topic]));
    for (const term of [...keyterms].slice(0, 32))
      url.searchParams.append("keyterm", term);
    // Flux has no KeepAlive control. Retire idle sockets rather than billing
    // silent PCM, and reopen on demand while the caller buffers speech frames.
    // Provider turn indices restart at zero on each connection.
    const turnOffset = this.latestTurn + 1;
    const socket = new DeepgramSocket(
      url,
      this.env.DEEPGRAM_API_KEY ?? "",
      {
        json: (message) => {
          if (this.socket !== socket || this.closed) return;
          if (message.type === "TurnInfo") {
            const turn = message as unknown as ListenV2TurnInfo;
            const turnIndex = turn.turn_index + turnOffset;
            this.latestTurn = Math.max(this.latestTurn, turnIndex);
            if (turn.event === "StartOfTurn" || turn.event === "Update")
              this.activeTurn = true;
            if (turn.event === "EndOfTurn") {
              this.activeTurn = false;
              this.endRequested = false;
              if (this.endTimer) clearTimeout(this.endTimer);
              this.endTimer = null;
            }
            this.onTurn({ ...turn, turn_index: turnIndex });
            this.maybeEndTurn();
          }
        },
        error: (error) => {
          if (this.socket !== socket || this.closed) return;
          this.socket = null;
          this.clearTimers();
          this.onError(error);
        },
      },
      this.makeSocket,
    );
    this.socket = socket;
    await socket.connect();
    if (this.closed || this.socket !== socket) return;
    this.armIdle();
  }
  async sendAudio(audio: Uint8Array) {
    if (this.closed || !audio.byteLength) return;
    // At most three seconds may wait for a handshake. Never grow an unbounded
    // queue or silently discard the beginning of an answer on a slow network.
    this.pendingBytes += audio.byteLength;
    try {
      if (this.pendingBytes > 96000)
        throw new Error(
          "Transcription is too slow. Retry the microphone to continue.",
        );
      this.endRequested = false;
      if (this.endTimer) clearTimeout(this.endTimer);
      this.endTimer = null;
      await this.connect();
      if (this.closed) return;
      this.socket?.send(audio);
      this.lastAudioAt = Date.now();
      this.armIdle();
    } catch (error) {
      if (!this.closed) {
        this.close();
        this.onError(
          error instanceof Error ? error : new Error("Transcription failed."),
        );
      }
    } finally {
      this.pendingBytes -= audio.byteLength;
      this.maybeEndTurn();
    }
  }
  endSpeech() {
    if (this.closed || !this.socket) return;
    this.endRequested = true;
    this.maybeEndTurn();
  }
  private maybeEndTurn() {
    if (
      !this.endRequested ||
      !this.activeTurn ||
      this.pendingBytes ||
      this.endTimer
    )
      return;
    // ForceEndTurn uses the latest decoded Update. Allow the last small PCM
    // packet to be decoded if it waited for an on-demand connection.
    this.endTimer = setTimeout(
      () => {
        this.endTimer = null;
        if (this.endRequested && this.activeTurn && !this.pendingBytes) {
          this.endRequested = false;
          this.socket?.send({ type: "ForceEndTurn" });
        }
      },
      Math.max(0, 320 - (Date.now() - this.lastAudioAt)),
    );
  }
  private armIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.activeTurn || this.pendingBytes) {
        this.endSpeech();
        this.armIdle();
        return;
      }
      const socket = this.socket;
      this.socket = null;
      socket?.send({ type: "CloseStream" });
      socket?.close();
    }, 5000);
  }
  private clearTimers() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.idleTimer = this.endTimer = null;
  }
  close() {
    this.closed = true;
    this.clearTimers();
    this.socket?.close();
    this.socket = null;
  }
}
