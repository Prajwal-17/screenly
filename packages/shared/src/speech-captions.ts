// Flux supplies phrase duration, not word timestamps. Distribute words within
// each real audio phrase; advance only with samples the browser has played.
export class SpeechCaptions {
  private phrases: { text: string; offset: number; duration: number }[] = [];
  add(text: string, offset: number, duration: number) {
    if (duration > 0) this.phrases.push({ text, offset, duration });
  }
  at(played: number) {
    let caption = "";
    for (const phrase of this.phrases) {
      const elapsed = played - phrase.offset;
      if (elapsed <= 0) break;
      if (elapsed >= phrase.duration) {
        caption += phrase.text;
        continue;
      }
      const words = phrase.text.match(/\S+\s*/g) ?? [];
      const weights = words.map(
        (word) =>
          Math.min(10, Math.max(3, word.trim().length)) +
          (/[,.!?;:]\s*$/.test(word) ? 2 : 0),
      );
      const position =
        (elapsed / phrase.duration) * weights.reduce((a, b) => a + b, 0);
      let start = 0;
      caption += phrase.text.match(/^\s*/)?.[0] ?? "";
      for (let i = 0; i < words.length && start < position; i++) {
        caption += words[i];
        start += weights[i]!;
      }
      break;
    }
    return caption.trim();
  }
}
