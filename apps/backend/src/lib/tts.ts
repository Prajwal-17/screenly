export class TextToSpeech {
  private readonly apiKey: string;
  private readonly url = "https://api.x.ai/v1/tts";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async speak(text: string) {
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          voice_id: "rex",
          language: "en",
          output_format: {
            codec: "mp3",
            sample_rate: 24000,
            bit_rate: 128000,
          },
          optimize_streaming_latency: 1,
        }),
      });

      if (!response.ok)
        throw new Error(
          `TTS error ${response.status}: ${await response.text()}`,
        );

      const audioBuffer = await response.arrayBuffer();
      return audioBuffer;
    } catch (error) {
      console.log(error);
    }
  }
}
