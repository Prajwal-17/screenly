// Some gateways replay the entire completed response as more stream deltas.
// Hold only a possible verbatim replay of a long, completed reply; release a
// partial match immediately if it differs or when the stream ends.
export class ResponseTextFilter {
  private emitted = "";
  private pending = "";
  private replay = "";
  private disabled = false;

  push(text: string): string {
    if (this.disabled) return text;
    let output = "";
    for (const char of text) {
      if (this.disabled) {
        output += char;
        continue;
      }
      if (this.replay) {
        if (char === this.replay[this.pending.length]) {
          this.pending += char;
          if (this.pending.length === this.replay.length)
            this.pending = this.replay = "";
          continue;
        }
        output += this.pending;
        this.emitted += this.pending;
        this.pending = this.replay = "";
      }
      if (
        this.emitted.length >= 80 &&
        /[.!?]/.test(this.emitted.at(-1) ?? "") &&
        char === this.emitted[0]
      ) {
        this.replay = this.emitted;
        this.pending = char;
        continue;
      }
      output += char;
      this.emitted += char;
      if (this.emitted.length > 12_000) {
        // Stop tracking long output rather than maintaining an unbounded copy.
        this.disabled = true;
        this.emitted = "";
      }
    }
    return output;
  }

  finish(): string {
    const pending = this.pending;
    this.pending = this.replay = "";
    this.emitted += pending;
    return pending;
  }
}
