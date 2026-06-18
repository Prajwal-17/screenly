import { useDownloadStore } from "@/store/downloadStore";
import { MicVAD } from "@ricky0123/vad-web";

/**
 * AudioPlayer — decodes and plays ArrayBuffer audio chunks received from the
 * backend (mp3 / aac / webm, whatever the TTS emits).
 *
 * Calls are queued so that back-to-back AI utterances don't overlap.
 */
class AudioPlayer {
  private ctx: AudioContext | null = null;
  private queue: Promise<void> = Promise.resolve();

  /** Lazily create / resume the AudioContext (browsers suspend it until a gesture). */
  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Decode `buffer` and play it. Returns a promise that resolves when playback
   * finishes, so callers can await it if needed. Internally the calls are
   * serialised via a promise chain so utterances never overlap.
   */
  play(buffer: ArrayBuffer): Promise<void> {
    this.queue = this.queue.then(() => this._play(buffer));
    return this.queue;
  }

  private _play(buffer: ArrayBuffer): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const ctx = this.getCtx();
        // decodeAudioData consumes the buffer — copy it first so the original
        // reference stays intact in case the caller still needs it.
        const decoded = await ctx.decodeAudioData(buffer.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        source.onended = () => resolve();
        source.start();
      } catch (err) {
        console.error("[AudioPlayer] playback error:", err);
        resolve(); // swallow so the queue keeps moving
      }
    });
  }

  /** Stop any in-flight audio immediately. */
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
      // This version of vad-web derives all asset filenames from a base path.
      // Files must be in public/vad/ (already copied there).
      baseAssetPath: "/vad/",
      onnxWASMBasePath: "/vad/",
      onSpeechStart: () => {
        if (this.recorder?.state === "inactive") {
          this.recorder.start();
        }
        // TODO - interrupt user
        console.log("User has started speaking");
      },
      onSpeechEnd: async (audio) => {
        console.log("audio", audio);
        if (this.recorder?.state === "recording") {
          this.recorder.stop();
          // this.socket?.send(audio);
        }
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
