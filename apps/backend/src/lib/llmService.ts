import OpenAI from "openai";
import { env } from "../config";

export class LLMService {
  readonly baseUrl = "http://localhost:20128/v1";
  client: OpenAI;

  constructor(private readonly onComplete: (text: string) => void) {
    this.client = new OpenAI({
      apiKey: env.OMNIROUTE_API_KEY,
      baseURL: "http://localhost:20128/v1",
    });
  }

  async *generateReply(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
  ): AsyncGenerator<string> {
    const response = this.client.chat.completions.stream({
      model: "cx/gpt-5.6-luna-high",
      messages: [...messages],
      stream: true,
    });

    for await (const chunk of response) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        yield text;
      }
    }

    const finalText = await response.finalContent();
    if (finalText) {
      this.onComplete(finalText);
    }
  }
}
