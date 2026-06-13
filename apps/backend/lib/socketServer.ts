import { DurableObject } from "cloudflare:workers";
import { Env } from "hono";
import { Bindings } from "../src";

export class SocketServer extends DurableObject<Bindings> {
  sessions: Map<WebSocket, { id: string }>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();

    this.ctx.getWebSockets().forEach((ws) => {
      let attachment = ws.deserializeAttachment();
      console.log("attchment", attachment);
      if (attachment) {
        this.sessions.set(ws, { ...attachment });
      }
    });

    // auto response without using hibernated sockets
    // this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    const id = crypto.randomUUID();

    server.serializeAttachment({ id });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    const formData = new FormData();
    formData.append("format", "true");
    formData.append("language", "en");
    formData.append("keyterm", "Understand The Universe");
    const audioBlob = new Blob([message], { type: "audio/webm" });
    formData.append("file", audioBlob, "audio.webm");

    console.log("api key", this.env.XAI_API_KEY);
    if (!this.env.XAI_API_KEY) {
      return;
    }
    const response = await fetch("https://api.x.ai/v1/stt", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.XAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();
      console.log("err", body);

      throw new Error(`STT error ${response.status} `);
    }

    const data = await response.json();
    console.log(data); // speech to text

    const url = "https://openrouter.ai/api/v1/chat/completions";

    const options = {
      method: "POST",
      headers: {
        "X-OpenRouter-Metadata": "enabled",
        Authorization: `Bearer ${this.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an expert interviewer. Conduct a professional, structured, one-question-at-a-time interview. Maintain a neutral, encouraging tone, listen actively to answers, and probe for details using the STAR method. Do not break character, do not provide evaluations during the session, and adapt your complexity to the candidate's level. Start by asking for the target role.",
          },
          {
            role: "user",
            content: data.text,
          },
        ],
      }),
    };

    let speechText;
    try {
      const brainResponse = await fetch(url, options);
      const brainData = await brainResponse.json();
      speechText = brainData.choices[0].message.content;

      console.log("deep seek response", brainData.choices[0]);
      console.log("deep seek response", brainData.choices[0].message.content);
    } catch (error) {
      console.error(error);
    }

    const ttsReponse = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: speechText,
        voice_id: "rex",
        language: "en",
      }),
    });

    if (!response.ok)
      throw new Error(`TTS error ${response.status}: ${await response.text()}`);

    const audioBuffer = await ttsReponse.arrayBuffer();

    ws.send(audioBuffer);
  }

  // webSocketClose(
  //   ws: WebSocket,
  //   code: number,
  //   reason: string,
  //   wasClean: boolean,
  // ): void | Promise<void> {}
}
