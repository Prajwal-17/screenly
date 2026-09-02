import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import type { WSContext, WSMessageReceive } from "hono/ws";
import { LLMService } from "./llmService";
import { STTService } from "./sttService";
import { TTSService } from "./ttsService";

export class InterviewSession {
  private readonly sessionWs: WSContext;
  sessionId: string | null = null;
  messages: Map<
    string,
    { role: "system" | "developer" | "user" | "assistant"; content: string }[]
  > = new Map();

  private readonly sttService: STTService;
  private readonly llmService: LLMService;
  private readonly ttsService: TTSService;

  constructor(ws: WSContext, sessionId: string | null) {
    this.sessionWs = ws;
    this.sessionId = sessionId;
    this.sttService = new STTService((event) => {
      this.handleTurnInfo(event);
    });
    this.llmService = new LLMService((text) => {
      this.handleLLMCompletion(text);
    });
    this.ttsService = new TTSService((audio) => {
      this.sendAudioToClient(audio);
    });
  }

  async handleMessage(event: MessageEvent<WSMessageReceive>) {
    if (typeof event.data === "string") {
      console.log(`[Audio WS] Control message: ${event.data}`);
      return;
    }

    const audioData =
      event.data instanceof Blob
        ? new Uint8Array(await event.data.arrayBuffer())
        : new Uint8Array(event.data);

    await this.sttService.sendAudio(audioData);
  }

  private handleTurnInfo(event: ListenV2TurnInfo) {
    this.sessionWs.send(
      JSON.stringify({
        type: "turnInfo",
        turnIndex: event.turn_index,
        transcript: event.transcript,
        sequenceId: event.sequence_id,
      }),
    );

    if (event.event === "EndOfTurn") {
      void this.streamReplyToTTS(event.transcript).catch((error) => {
        console.error("Interview response pipeline failed", error);
      });
    }
  }

  private handleLLMCompletion(text: string) {
    const session = this.messages.get(this.sessionId!);
    session?.push({
      type: "assistant",
      content: text,
    });
  }

  private async streamReplyToTTS(transcript: string) {
    const session = this.messages.get(this.sessionId!);
    session?.push({
      role: "user",
      content: transcript,
    });
    await this.ttsService.connect();

    const messages = this.messages.get(this.sessionId!);
    for await (const textChunk of this.llmService.generateReply(messages)) {
      if (textChunk) {
        await this.ttsService.sendText(textChunk);
      }
    }

    await this.ttsService.flush();
  }

  private sendAudioToClient(audio: Uint8Array<ArrayBuffer>) {
    if (this.sessionWs.readyState === 1) {
      this.sessionWs.send(audio);
    }
  }

  close() {
    this.sttService.close();
    this.ttsService.close();
    this.sessionWs.close();
  }
}
