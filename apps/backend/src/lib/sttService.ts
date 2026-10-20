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
  constructor(
    private env: Config,
    private onTurn: (event: ListenV2TurnInfo) => void,
    private onError: (error: Error) => void,
    private topics: InterviewSettings["topics"] = [],
    private makeSocket?: SocketFactory,
  ) {}
  async connect() {
    const url = new URL("/v2/listen", this.env.DEEPGRAM_WS_URL);
    url.search = new URLSearchParams({
      model: this.env.DEEPGRAM_STT_MODEL,
      encoding: "linear16",
      sample_rate: "16000",
      eot_timeout_ms: String(this.env.DEEPGRAM_EOT_TIMEOUT_MS),
    }).toString();
    // Give technical names context without changing the audio cadence or
    // the confidence required for a natural end-of-turn.
    const keyterms = new Set(this.topics.flatMap((topic) => vocabulary[topic]));
    for (const term of [...keyterms].slice(0, 32))
      url.searchParams.append("keyterm", term);
    this.socket = new DeepgramSocket(
      url,
      this.env.DEEPGRAM_API_KEY ?? "",
      {
        json: (message) => {
          if (message.type === "TurnInfo")
            this.onTurn(message as unknown as ListenV2TurnInfo);
        },
        error: this.onError,
      },
      this.makeSocket,
    );
    await this.socket.connect();
  }
  sendAudio(audio: Uint8Array) {
    this.socket?.send(audio);
  }
  close() {
    this.socket?.close();
    this.socket = null;
  }
}
