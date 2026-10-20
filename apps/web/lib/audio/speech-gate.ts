// Silero v5 consumes 32 ms frames at 16 kHz. Keep the onset locally until
// speech is confirmed, then stream immediately instead of buffering an answer.
export const VAD_FRAME_SAMPLES = 512;
const PRE_ROLL_FRAMES = 8; // 256 ms, including the confirmation window.
const START_FRAMES = 3; // Reject isolated clicks without delaying whole turns.
const TAIL_FRAMES = 12; // Preserve word endings and let Flux detect natural stops.
const END_FRAMES = 20; // Finalize after 640 ms, retaining short thinking pauses.

export class SpeechGate {
  private recent: { index: number; frame: Float32Array }[] = [];
  private index = 0;
  private sentThrough = -1;
  private positive = 0;
  private silent = 0;
  private speaking = false;
  constructor(
    private audio: (frame: Float32Array) => void,
    private end: () => void,
    private start: () => void = () => {},
  ) {}
  process(frame: Float32Array, probability: number) {
    const index = this.index++;
    this.recent.push({ index, frame });
    if (this.recent.length > PRE_ROLL_FRAMES) this.recent.shift();
    this.positive = probability >= 0.5 ? this.positive + 1 : 0;
    if (!this.speaking && this.positive >= START_FRAMES) {
      this.speaking = true;
      this.silent = 0;
      this.start();
    }
    if (!this.speaking) return;
    if (probability >= 0.35) {
      this.silent = 0;
      // Also restore the onset after a short internal pause. Never send the
      // same frame twice when this overlaps audio already uploaded.
      for (const item of this.recent) this.emit(item.index, item.frame);
    } else {
      this.silent++;
      if (this.silent <= TAIL_FRAMES) this.emit(index, frame);
      if (this.silent >= END_FRAMES) {
        this.speaking = false;
        this.positive = 0;
        this.end();
      }
    }
  }
  private emit(index: number, frame: Float32Array) {
    if (index <= this.sentThrough) return;
    this.sentThrough = index;
    this.audio(frame);
  }
  reset() {
    const hadSpeech = this.speaking;
    this.recent = [];
    this.index = 0;
    this.sentThrough = -1;
    this.positive = this.silent = 0;
    this.speaking = false;
    if (hadSpeech) this.end();
  }
}
