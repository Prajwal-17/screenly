// Keep the first spoken words close to the LLM stream, without flushing partial
// words or waiting for the complete question. Each phrase is one Flux TTS turn.
export function speechPhrase(text: string, final = false): string | null {
  // Keep a tiny greeting with the following phrase rather than introducing a
  // synthesis boundary after only one or two words.
  const sentence = [...text.matchAll(/[.!?]["')\]]?(?=\s|$)/g)].find(
    (match) =>
      (text.slice(0, match.index! + match[0].length).match(/\S+/g)?.length ??
        0) >= 3,
  );
  const words = [...text.matchAll(/\S+\s+/g)];
  const tenth = words[9];
  const sentenceEnd = sentence
    ? sentence.index! + sentence[0].length
    : Infinity;
  const wordEnd = tenth ? tenth.index! + tenth[0].length : Infinity;
  const end = Math.min(sentenceEnd, wordEnd);
  return Number.isFinite(end)
    ? text.slice(0, end)
    : final && text.trim()
      ? text
      : null;
}
