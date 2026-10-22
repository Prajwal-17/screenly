import * as ort from "onnxruntime-web/wasm";
import { Silero } from "@ricky0123/vad-web/dist/models/silero";
import type { Model } from "@ricky0123/vad-web/dist/models/common";
import { SpeechGate } from "./speech-gate";

type Input =
  | { type: "init" }
  | { type: "reset"; epoch: number }
  | { type: "frame"; epoch: number; frame: Float32Array };
let model: Model;
let epoch = 0;
let chain = Promise.resolve();
let failed = false;
const pending = new Int16Array(1280);
let pendingLength = 0;
function flush() {
  if (!pendingLength) return;
  const samples = pending.slice(0, pendingLength);
  self.postMessage(
    { type: "audio", epoch, samples },
    { transfer: [samples.buffer] },
  );
  pendingLength = 0;
}
const gate = new SpeechGate(
  (frame) => {
    for (const value of frame) {
      const sample = Math.max(-1, Math.min(1, value));
      pending[pendingLength++] = sample < 0 ? sample * 32768 : sample * 32767;
      if (pendingLength === pending.length) flush();
    }
  },
  () => {
    flush();
    self.postMessage({ type: "speech-end", epoch });
  },
);
self.onmessage = ({ data }: MessageEvent<Input>) => {
  chain = chain
    .then(async () => {
      if (failed) return;
      if (data.type === "init") {
        // Already in a dedicated worker: avoid proxy/blob workers and COOP/COEP
        // requirements. Runtime, WASM and weights are all served by this app.
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.proxy = false;
        ort.env.wasm.wasmPaths = new URL("./", self.location.href).href;
        model = await Silero.new(ort, async () => {
          const response = await fetch(
            new URL("silero_vad_v5.onnx", self.location.href),
          );
          if (!response.ok) throw new Error("Could not load speech detection.");
          return response.arrayBuffer();
        });
        self.postMessage({ type: "ready" });
      } else if (data.type === "reset") {
        gate.reset();
        pendingLength = 0;
        model.reset_state();
        epoch = data.epoch;
      } else {
        if (data.epoch !== epoch) return;
        const result = await model.process(data.frame);
        gate.process(data.frame, result.isSpeech);
        self.postMessage({ type: "processed", epoch });
      }
    })
    .catch(() => {
      failed = true;
      self.postMessage({ type: "error" });
    });
};
