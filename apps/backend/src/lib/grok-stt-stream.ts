export const STREAM_EVENTS = {
  READY: "ready", // grok socket conn
  TRANSCRIPT: "transcript",
  INTERIM: "interim", // temp text, UI only
  UTTERANCE_FINAL: "utterance_final", // for final text
  CHUNK_FINAL: "chunk_final", // ignore
  ERROR: "error", // error
};

export const GROK_SERVER_EVENTS = {
  TRANSCRIPT_CREATED: "transcript.created",
  TRANSCRIPT_PARTIAL: "transcript.partial",
  TRANSCRIPT_DONE: "transcript.done",
  ERROR: "error",
};

// Grok Voice Api Docs - https://docs.x.ai/developers/model-capabilities/audio/speech-to-text#streaming-speech-to-text-websocket
export class GrokSttStream {
  private listeners: Record<string, Function[]> = {};
  apiKey: string;
  grokBaseUrl = "https://api.x.ai/v1/stt";

  // for grok socket conn - is ready
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
      this.listeners[event] = (this.listeners[event] || []).filter(
        (f) => f !== cb,
      );
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
    // url.searchParams.append("smart_turn", "0.7");
    // url.searchParams.append("smart_turn_timeout", "3000");

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
        this.handleMessage(event.data);
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

  private handleMessage(raw: string) {
    let event: any;

    try {
      event = JSON.parse(raw);
    } catch {
      // this.emit
      return;
    }

    switch (event.type) {
      case GROK_SERVER_EVENTS.TRANSCRIPT_CREATED: {
        this.isReady = true;
        this.flushPendingAudioChunks();
        this.emit(STREAM_EVENTS.READY);
        return;
      }

      case GROK_SERVER_EVENTS.TRANSCRIPT_PARTIAL: {
        if (event.is_final) {
          if (event.speech_final) {
            this.emit(STREAM_EVENTS.UTTERANCE_FINAL, event);
          } else {
            this.emit(STREAM_EVENTS.CHUNK_FINAL, event);
          }
        } else {
          this.emit(STREAM_EVENTS.TRANSCRIPT, event);
        }
        return;
      }

      case GROK_SERVER_EVENTS.TRANSCRIPT_DONE: {
        console.log("transcript done");
        this.emit(STREAM_EVENTS.UTTERANCE_FINAL, event);
        return;
      }

      case GROK_SERVER_EVENTS.ERROR: {
        this.emit(STREAM_EVENTS.ERROR, event);
        return;
      }
    }
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
