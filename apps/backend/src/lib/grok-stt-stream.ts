export class GrokSttStream {
  private listeners: Record<string, Function[]> = {};
  apiKey: string;
  grokBaseUrl = "https://api.x.ai/v1/stt";

  isReady: boolean = false;
  private pendingAudioChunks: ArrayBuffer[] = [];

  private grokWs: WebSocket | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  on(event: string, cb: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  emit(event: string, data?: any) {
    (this.listeners[event] || []).forEach((cb) => cb(data));
  }

  off(event: string, cb?: Function) {
    if (!cb) {
      delete this.listeners[event];
    } else {
      this.listeners[event] = (this.listeners[event] || []).filter((f) => f !== cb);
    }
  }

  async connect(): Promise<void> {
    const url = new URL(this.grokBaseUrl);
    url.searchParams.append("sample_rate", "16000");
    url.searchParams.append("encoding", "pcm");
    url.searchParams.append("language", "en");
    url.searchParams.append("interim_results", "true");
    url.searchParams.append("filler_words", "true");
    url.searchParams.append("multichannel", "false");

    if (this.grokWs) return;

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Upgrade: "websocket",
      },
    });

    if (response.status !== 101) {
      throw new Error(`Failed to connect to Grok STT: ${response.status}`);
    }
    const ws = response.webSocket;
    ws?.accept();
    this.grokWs = ws;

    ws?.addEventListener("message", (event: MessageEvent) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        console.log("msg from grok", msg);

        if (msg.type === "transcript.created") {
          console.log("grok stream ready");
          this.isReady = true;
          this.flushPendingAudioChunks();
        }

        if (msg.transcript) {
          this.emit("transcript", msg);
        }
      }
    });

    ws?.addEventListener("close", () => {
      console.log("grok ws closed");
      this.emit("close");
    });

    ws?.addEventListener("error", (err) => {
      console.log("grok ws error", err);
      this.emit("error", err);
    });
  }

  sendAudio(chunk: ArrayBuffer) {
    // if (this.isClosed) return;
    if (!this.grokWs) throw new Error("Grok STT stream not connected");

    if (!this.isReady) {
      this.pendingAudioChunks.push(chunk);
      return;
    }

    this.grokWs.send(chunk);
  }

  flushPendingAudioChunks() {
    if (!this.grokWs) return;
    if (!this.isReady) return;

    for (const chunk of this.pendingAudioChunks) {
      this.grokWs.send(chunk);
    }

    this.pendingAudioChunks = [];
  }

  endInput() {}
  close() {}
}
