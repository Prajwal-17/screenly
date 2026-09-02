import { DeepgramClient } from "@deepgram/sdk";
import { V2Socket } from "@deepgram/sdk/speak/v2";
import { env } from "../config";

type AudioHandler = (audio: Uint8Array<ArrayBuffer>) => void;

export class TTSService {
  readonly DEEPGRAM_API_KEY = env.DEEPGRAM_API_KEY;
  ttsClient: V2Socket | null = null;

  private deepgramSpeakReady = false;
  private deepgramConnecting: Promise<void> | null = null;
  private textQueue: string[] = [];

  constructor(private readonly onAudio: AudioHandler) {}

  async connect(): Promise<void> {
    if (this.ttsClient && this.deepgramSpeakReady) return;
    if (this.deepgramConnecting) return this.deepgramConnecting;

    const connectionPromise = this.openConnection();
    this.deepgramConnecting = connectionPromise;

    try {
      await connectionPromise;
    } finally {
      if (this.deepgramConnecting === connectionPromise) {
        this.deepgramConnecting = null;
      }
    }
  }

  async sendText(text: string): Promise<void> {
    if (!text) return;

    if (this.ttsClient && this.deepgramSpeakReady) {
      this.ttsClient.sendSpeak({ type: "Speak", text });
      return;
    }

    this.textQueue.push(text);

    await this.connect();
  }

  async flush(): Promise<void> {
    await this.connect();

    if (this.ttsClient && this.deepgramSpeakReady) {
      this.ttsClient.sendFlush({ type: "Flush" });
    }
  }

  close() {
    this.ttsClient?.close();
    this.ttsClient = null;
    this.deepgramSpeakReady = false;
    this.textQueue = [];
  }

  private async openConnection(): Promise<void> {
    const client = new DeepgramClient({
      apiKey: this.DEEPGRAM_API_KEY,
    });

    const connection = await client.speak.v2.connect({
      model: "flux-alexis-en",
      encoding: "linear16",
      sample_rate: "24000",
    });

    this.ttsClient = connection;

    let resolveReady!: () => void;
    let rejectReady!: (reason?: unknown) => void;
    const readyPromise = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    connection.on("open", () => {
      console.log("Connected To Deepgram Speak");
    });

    connection.on("message", (event) => {
      const message: unknown = event;

      if (message instanceof Blob) {
        void message
          .arrayBuffer()
          .then((buffer) => this.onAudio(new Uint8Array(buffer)))
          .catch((error) => console.error("TTS audio handling failed", error));
        return;
      }

      if (message instanceof ArrayBuffer) {
        this.onAudio(new Uint8Array(message));
        return;
      }

      if (!message || typeof message !== "object") {
        console.log("Deepgram Speak message:", message);
        return;
      }

      const type = "type" in message ? message.type : undefined;

      if (type === "Connected") {
        this.deepgramSpeakReady = true;

        const queuedText = this.textQueue.splice(0);
        for (const text of queuedText) {
          connection.sendSpeak({ type: "Speak", text });
        }

        resolveReady();
        return;
      }

      console.log("Deepgram Speak event:", message);
    });

    connection.on("error", (error) => {
      console.error("Deepgram Speak error", error);
      rejectReady(error);
    });

    connection.on("close", () => {
      if (this.ttsClient === connection) {
        this.ttsClient = null;
        this.deepgramSpeakReady = false;
      }

      rejectReady(new Error("Deepgram Speak connection closed"));
    });

    try {
      connection.connect();
      await connection.waitForOpen();
      await readyPromise;
    } catch (error) {
      if (this.ttsClient === connection) {
        this.ttsClient = null;
        this.deepgramSpeakReady = false;
      }

      connection.close();
      throw error;
    }
  }
}
