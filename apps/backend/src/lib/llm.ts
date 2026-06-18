import { Message } from "./interview-session-do";

export class LLM {
  private readonly apiKey: string;
  private readonly url = "https://openrouter.ai/api/v1/chat/completions";

  constructor(apiKey: string) {
    this.apiKey = apiKey; // Text Model - Deepseek v4, gemini, chatgpt
  }

  async generate(messages: Message[]) {
    try {
      const options = {
        method: "POST",
        headers: {
          "X-OpenRouter-Metadata": "enabled",
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-v4-flash",
          messages,
        }),
      };

      const response = await fetch(this.url, options);
      const llmResponse: { choices: { message: { content: string } }[] } =
        await response.json();

      return {
        role: "assistant",
        content: llmResponse.choices[0].message.content,
      };
    } catch (error) {
      console.error(error);
    }
  }
}
