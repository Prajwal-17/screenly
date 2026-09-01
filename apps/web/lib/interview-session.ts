import { useDownloadStore } from "@/store/downloadStore";
import { MicVAD } from "@ricky0123/vad-web";
import { AudioPlayer } from "./audio-player";

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
  utteranceChunks: Blob[] = []; // for streaming

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
          // signal to DO that utterance is complete
          this.socket?.send(JSON.stringify({ type: "utterance-end" }));
          this.speechEndTimer = null;
        }, 1000);
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
    this.player.stop();

    const downloadAudio = useDownloadStore.getState().downloadAudio;

    if (this.recorder?.state === "recording") {
      this.cleanupQueued = false;
      const origOnStop = this.recorder.onstop;
      this.recorder.onstop = (ev: Event) => {
        origOnStop?.call(this.recorder, ev);
        this.finalizeStop(downloadAudio);
      };
    } else {
      this.finalizeStop(downloadAudio);
    }
  }

  private finalizeStop(downloadAudio: boolean) {
    if (this.cleanupQueued) return;
    this.cleanupQueued = true;

    if (downloadAudio && this.chunks && this.chunks.length > 0) {
      this.downloadAudio();
      this.chunks = null;
    }

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
