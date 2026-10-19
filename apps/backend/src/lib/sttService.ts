import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import type { Config } from "../config";
import { DeepgramSocket } from "./deepgramSocket";
export class STTService {
  private socket: DeepgramSocket | null = null;
  constructor(
    private env: Config,
    private onTurn: (event: ListenV2TurnInfo) => void,
    private onError: (error: Error) => void,
  ) {}
  async connect() {
    const url = new URL("/v2/listen", this.env.DEEPGRAM_WS_URL);
    url.search = new URLSearchParams({
      model: this.env.DEEPGRAM_STT_MODEL,
      encoding: "linear16",
      sample_rate: "16000",
    }).toString();
    this.socket = new DeepgramSocket(url, this.env.DEEPGRAM_API_KEY ?? "", {
      json: (message) => {
        if (message.type === "TurnInfo")
          this.onTurn(message as unknown as ListenV2TurnInfo);
      },
      error: this.onError,
    });
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
