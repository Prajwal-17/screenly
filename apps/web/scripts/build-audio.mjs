import { build } from "bun";
import { copyFile, mkdir } from "node:fs/promises";
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
