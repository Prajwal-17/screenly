import { build } from "bun";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../public/audio/", import.meta.url);
await mkdir(output, { recursive: true });
const result = await build({
  entrypoints: [
    fileURLToPath(
      new URL("../lib/audio/playback-processor.ts", import.meta.url),
    ),
  ],
  outdir: fileURLToPath(output),
  target: "browser",
  format: "esm",
  minify: true,
  banner:
    "/*! Uses unmodified @soundtouchjs/core (MPL-2.0). License: /audio/soundtouch-LICENSE.txt; source: https://github.com/cutterbl/SoundTouchJS/tree/master/packages/core */",
});
if (!result.success)
  throw new AggregateError(result.logs, "Audio worklet build failed");
await copyFile(
  fileURLToPath(
    new URL("../node_modules/@soundtouchjs/core/LICENSE", import.meta.url),
  ),
  fileURLToPath(new URL("soundtouch-LICENSE.txt", output)),
);
console.log("Built pitch-preserving speech worklet.");

const vadOutput = new URL("../public/vad/", import.meta.url);
await mkdir(vadOutput, { recursive: true });
const vad = await build({
  entrypoints: [
    fileURLToPath(new URL("../lib/audio/vad-worker.ts", import.meta.url)),
  ],
  outdir: fileURLToPath(vadOutput),
  target: "browser",
  format: "esm",
  minify: true,
  banner:
    "/*! Silero VAD (MIT), vad-web (ISC), ONNX Runtime (MIT). See /vad/LICENSE.txt. */",
});
if (!vad.success)
  throw new AggregateError(vad.logs, "Speech detection build failed");
for (const name of [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
])
  await copyFile(
    new URL(`../node_modules/onnxruntime-web/dist/${name}`, import.meta.url),
    new URL(name, vadOutput),
  );
await copyFile(
  new URL(
    "../node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx",
    import.meta.url,
  ),
  new URL("silero_vad_v5.onnx", vadOutput),
);
const notices = await readFile(
  new URL("../lib/audio/vad-LICENSE.txt", import.meta.url),
  "utf8",
);
const runtimeLicense = await readFile(
  new URL("../lib/audio/onnxruntime-LICENSE.txt", import.meta.url),
  "utf8",
);
await writeFile(
  new URL("LICENSE.txt", vadOutput),
  `${notices}\n\nONNX Runtime\n${runtimeLicense}`,
);
console.log("Built local ONNX speech detector.");
