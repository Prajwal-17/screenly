import { useDownloadStore } from "@/store/downloadStore";
import { MicVAD } from "@ricky0123/vad-web";

class AudioPlayer {
  private ctx: AudioContext | null = null;
  private queue: Promise<void> = Promise.resolve();

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  play(buffer: ArrayBuffer): Promise<void> {
    this.queue = this.queue.then(() => this._play(buffer));
    return this.queue;
  }

  private async _play(buffer: ArrayBuffer): Promise<void> {
    try {
      const ctx = this.getCtx();
      const decoded = await ctx.decodeAudioData(buffer.slice(0));

      await new Promise<void>((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        source.onended = () => resolve();
        source.start();
      });
    } catch (err) {
      console.error("[AudioPlayer] playback error:", err);
    }
  }

  // stop in-flight audio
  stop() {
    this.ctx?.close();
    this.ctx = null;
    this.queue = Promise.resolve();
  }
}

export class Session {
  sessionId: string = "";
  socket: WebSocket | null = null;
  vad: MicVAD | null = null;

  recorder: MediaRecorder | null = null;
  stream: MediaStream | null = null;
  // for download
  chunks: Blob[] | null = null;
  // buffer : for streaming
  utteranceChunks: Blob[] = [];
  private cleanupQueued = false;
  private speechEndTimer: ReturnType<typeof setTimeout> | null = null;

  player = new AudioPlayer();

  setSessionId(id: string) {
    this.sessionId = id;
  }

  setRecorder(mediaRecorder: MediaRecorder) {
    this.recorder = mediaRecorder;
  }

  setIsRecording(value: boolean) {
    useDownloadStore.setState({
      isRecording: value,
    });
  }

  private setSocket(ws: WebSocket | null) {
    this.socket = ws;
  }

  async startRecording() {
    if (this.recorder || this.vad) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.stream = stream;
    this.chunks = [];
    this.setIsRecording(true);

    this.vad = await MicVAD.new({
      baseAssetPath: "/vad/",
      onnxWASMBasePath: "/vad/",
      onSpeechStart: () => {
        if (this.speechEndTimer) {
          clearTimeout(this.speechEndTimer);
          this.speechEndTimer = null;
        }
        if (this.recorder?.state === "inactive") {
          this.recorder.start();
        }
        // TODO - interrupt user
        console.log("User has started speaking");
      },
      onSpeechEnd: () => {
        // clear any previous timer
        if (this.speechEndTimer) {
          clearTimeout(this.speechEndTimer);
        }
        this.speechEndTimer = setTimeout(() => {
          if (this.recorder?.state === "recording") {
            this.recorder.stop();
          }
          this.speechEndTimer = null;
        }, 1200);
      },
    });

    this.vad.start();

    const recorder = new MediaRecorder(stream, {
      mimeType: "audio/webm",
    });

    this.setRecorder(recorder);

    recorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        this.chunks?.push(event.data);
        this.utteranceChunks.push(event.data);
        // const buffer = await event.data.arrayBuffer();
        // this.socket?.send(buffer);
      }
    };

    // returns array of blob wrt timeslice
    // recorder.start(1000); // not to start in VAD

    recorder.onstop = async () => {
      const blob = new Blob(this.utteranceChunks, {
        type: "audio/webm",
      });
      const buffer = await blob.arrayBuffer();
      this.socket?.send(buffer);
      // ---

      this.utteranceChunks = [];
      // this.setIsRecording(false);
      // const downloadAudio = useDownloadStore.getState().downloadAudio;
      // if (downloadAudio) {
      //   this.downloadAudio();
      // } else {
      //   this.chunks = [];
      // }
    };
  }

  stopRecording() {
    // Clear any pending speech-end timer
    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }

    this.vad?.destroy();
    this.vad = null;

    const downloadAudio = useDownloadStore.getState().downloadAudio;

    if (this.recorder?.state === "recording") {
      this.cleanupQueued = false;
      const origOnStop = this.recorder.onstop;
      this.recorder.onstop = (ev: Event) => {
        origOnStop?.call(this.recorder, ev);
        this.finalizeStop(downloadAudio);
      };
      this.recorder.stop();
    } else {
      this.finalizeStop(downloadAudio);
    }
  }

  private finalizeStop(downloadAudio: boolean) {
    if (this.cleanupQueued) return;
    this.cleanupQueued = true;

    if (downloadAudio && this.chunks && this.chunks.length > 0) {
      this.downloadAudio();
    }

    this.chunks = null;
    this.utteranceChunks = [];
    this.recorder = null;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.setIsRecording(false);
  }

  async downloadAudio() {
    if (!this.chunks) return;
    const blob = new Blob(this.chunks, {
      type: "audio/webm",
    });

    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = downloadUrl;
    a.download = `sample-${new Date().toLocaleTimeString()}.webm`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
    this.chunks = [];
  }

  connect(webSocketURL: string) {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const ws = new WebSocket(webSocketURL);
    this.setSocket(ws);

    ws.onopen = () => {};

    ws.binaryType = "arraybuffer"; // receive binary frames as ArrayBuffer, not Blob

    ws.onmessage = async (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        // backend sent a raw binary frame → play directly
        await this.player.play(event.data);
      } else if (event.data instanceof Blob) {
        // fallback: decode Blob → ArrayBuffer first
        const buffer = await event.data.arrayBuffer();
        await this.player.play(buffer);
      }
      // ignore plain-text control messages
    };

    ws.onerror = () => {};

    ws.onclose = () => {};
  }

  disconnect() {
    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }

    this.vad?.destroy();
    this.vad = null;
    if (this.recorder?.state === "recording") this.recorder.stop();
    this.recorder = null;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  reset() {}
}

export const session = new Session();
