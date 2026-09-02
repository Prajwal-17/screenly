import { useDownloadStore } from "@/store/downloadStore";
import { MicVAD } from "@ricky0123/vad-web";
import { AudioPlayer } from "./audio-player";

const TTS_SAMPLE_RATE = 24000;

export type TranscriptMessage = {
  turnIndex: number;
  transcript: string;
  sequenceId: number;
};

export class Session {
  sessionId: string = "";
  socket: WebSocket | null = null;

  vad: MicVAD | null = null;

  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;

  recorder: MediaRecorder | null = null;
  stream: MediaStream | null = null;

  chunks: Blob[] | null = null; // for download

  private transcripts = new Map<number, TranscriptMessage>();
  private transcriptSnapshot: TranscriptMessage[] = [];
  private transcriptListeners = new Set<() => void>();

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

  getTranscripts() {
    return this.transcriptSnapshot;
  }

  subscribeTranscripts(listener: () => void) {
    this.transcriptListeners.add(listener);
    return () => {
      this.transcriptListeners.delete(listener);
    };
  }

  private updateTranscript(data: unknown) {
    if (!data || typeof data !== "object") return;

    const message = data as {
      type?: unknown;
      turnIndex?: unknown;
      transcript?: unknown;
      sequenceId?: unknown;
    };

    if (
      message.type !== "turnInfo" ||
      typeof message.turnIndex !== "number" ||
      typeof message.transcript !== "string" ||
      typeof message.sequenceId !== "number"
    ) {
      return;
    }

    const previous = this.transcripts.get(message.turnIndex);
    if (previous && message.sequenceId <= previous.sequenceId) return;

    this.transcripts.set(message.turnIndex, {
      turnIndex: message.turnIndex,
      transcript: message.transcript,
      sequenceId: message.sequenceId,
    });
    this.transcriptSnapshot = Array.from(this.transcripts.values()).sort(
      (a, b) => a.turnIndex - b.turnIndex,
    );
    this.transcriptListeners.forEach((listener) => listener());
  }

  async startRecording() {
    if (this.recorder || this.vad) return;

    this.cleanupQueued = false;
    void this.player.unlock();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.stream = stream;
    this.ctx = new AudioContext({ sampleRate: 16000 });
    await this.ctx.audioWorklet.addModule("/audio/pcm-processor.js");
    this.source = this.ctx.createMediaStreamSource(stream);
    this.worklet = new AudioWorkletNode(this.ctx, "pcm-processor");
    this.source.connect(this.worklet); // Send mic audio from source node into the worklet node.

    this.worklet.port.onmessage = (e) => {
      const msg = e.data;

      if (msg.type === "pcm-chunk") {
        const pcm16 = msg.samples;
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(pcm16.buffer);
        }
      } else {
        console.log("worklet message:", msg);
      }
    };

    this.chunks = [];

    const recorder = new MediaRecorder(stream, {
      mimeType: "audio/webm",
    });

    this.setRecorder(recorder);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks?.push(event.data);
      }
    };

    recorder.start();
    this.setIsRecording(true);

    this.vad = await MicVAD.new({
      baseAssetPath: "/vad/",
      onnxWASMBasePath: "/vad/",
      onSpeechStart: () => {
        if (this.speechEndTimer) {
          clearTimeout(this.speechEndTimer);
          this.speechEndTimer = null;
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
          // Signal to the backend that the current utterance is complete.
          this.socket?.send(JSON.stringify({ type: "utterance-end" }));
          this.speechEndTimer = null;
        }, 1000);
      },
    });

    this.vad.start();
  }

  stopRecording() {
    // Clear any pending speech-end timer
    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }

    this.vad?.destroy();
    this.vad = null;
    this.player.stop();

    const downloadAudio = useDownloadStore.getState().downloadAudio;

    const recorder = this.recorder;
    if (recorder?.state === "recording") {
      recorder.onstop = () => {
        this.finalizeStop(downloadAudio);
      };
      recorder.stop();
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

    if (this.worklet) {
      this.worklet.disconnect();
      this.worklet.port.onmessage = null;
      this.worklet = null;
    }
    this.source?.disconnect();
    this.source = null;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }

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
        this.player.playPcm16(event.data, TTS_SAMPLE_RATE);
      } else if (event.data instanceof Blob) {
        // fallback: decode Blob → ArrayBuffer first
        const buffer = await event.data.arrayBuffer();
        this.player.playPcm16(buffer, TTS_SAMPLE_RATE);
      } else if (typeof event.data === "string") {
        try {
          this.updateTranscript(JSON.parse(event.data));
        } catch {
          // Ignore non-JSON control messages.
        }
      }
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
    if (this.worklet) {
      this.worklet.disconnect();
      this.worklet.port.onmessage = null;
      this.worklet = null;
    }
    this.source?.disconnect();
    this.source = null;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
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
