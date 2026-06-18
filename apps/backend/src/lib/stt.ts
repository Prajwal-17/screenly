type GrokVoiceSttWord = {
  text: string;
  start: number;
  end: number;
};

export type GrokVoiceSttResult = {
  text: string;
  language: string;
  duration: number;
  words: GrokVoiceSttWord[];
};

export class SpeechToText {
  private readonly apiKey: string; // xAi or Deepgram
  private readonly url = "https://api.x.ai/v1/stt";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audio: ArrayBuffer) {
    try {
      if (!this.apiKey) {
        throw new Error("API Key does not exists");
      }

      const formData = new FormData();
      formData.append("format", "true");
      formData.append("language", "en");
      const audioBlob = new Blob([audio], {
        type: "audio/webm",
      });
      formData.append("file", audioBlob, "audio.webm");

      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error(`STT error ${response.status}`);

      const result: GrokVoiceSttResult = await response.json();

      return {
        text: result.text,
        duration: result.duration,
      };
    } catch (error) {
      console.log(error);
    }
  }
}
