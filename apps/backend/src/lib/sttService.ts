import { DeepgramClient } from "@deepgram/sdk";
import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import { V2Socket } from "@deepgram/sdk/listen/v2";
import { env } from "../config";

export class STTService {
  readonly DEEPGRAM_API_KEY = env.DEEPGRAM_API_KEY;
  sttClient: V2Socket | null = null;

  private deepgramListenReady = false;
  private deepgramConnecting: Promise<void> | null = null;
  private audioQueue: Uint8Array[] = [];

  constructor(private readonly onTurnInfo: (event: ListenV2TurnInfo) => void) {}

  async connect(): Promise<void> {
    // A socket already exists or is being opened. Never create another one.
    if (this.sttClient) return;
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

  async sendAudio(audio: Uint8Array): Promise<void> {
    if (this.sttClient && this.deepgramListenReady) {
      this.sttClient.sendMedia(audio);
      return;
    }

    this.audioQueue.push(audio);
    await this.connect();
  }

  close() {
    this.sttClient?.close();
    this.sttClient = null;
    this.deepgramListenReady = false;
    this.audioQueue = [];
  }

  private async openConnection(): Promise<void> {
    const client = new DeepgramClient({
      apiKey: this.DEEPGRAM_API_KEY,
    });

    const connection = await client.listen.v2.connect({
      model: "flux-general-en",
      sample_rate: 16000,
      encoding: "linear16",
    });

    this.sttClient = connection;

    connection.on("open", () => {
      console.log("Connected To Deepgram Listen");
    });

    connection.on("message", (event) => {
      switch (event.type) {
        case "Connected": {
          this.deepgramListenReady = true;

          const queuedAudio = this.audioQueue.splice(0);

          for (const audio of queuedAudio) {
            connection.sendMedia(audio);
          }

          break;
        }

        case "TurnInfo": {
          this.onTurnInfo(event);
          break;
        }

        case "ConfigureFailure": {
          console.log("fail");
          break;
        }

        case "ConfigureSuccess": {
          console.log("success");
          break;
        }

        case "Error": {
          console.log(event);
          break;
        }

        default: {
          console.log("Unhandled Event", event);
          break;
        }
      }
    });

    connection.on("error", (error) => {
      console.error("Deepgram connection error", error);
    });

    connection.on("close", () => {
      if (this.sttClient === connection) {
        this.sttClient = null;
        this.deepgramListenReady = false;
      }
    });

    try {
      connection.connect();
      await connection.waitForOpen();
    } catch (error) {
      if (this.sttClient === connection) {
        this.sttClient = null;
        this.deepgramListenReady = false;
      }

      connection.close();
      throw error;
    }
  }
}
