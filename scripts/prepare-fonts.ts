import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

// Obtain each developer's own copy from Fontshare; the FFL permits self-hosting,
// but does not permit redistributing the font binaries through a repository.
const directory = new URL("../apps/web/app/fonts/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const [family, file] of [
  ["general-sans", "GeneralSans-Variable.woff2"],
  ["switzer", "Switzer-Variable.woff2"],
]) {
  const target = new URL(file!, directory);
  if (existsSync(target)) continue;
  const css = await fetch(
    `https://api.fontshare.com/v2/css?f[]=${family}@variable&display=swap`,
  );
  if (!css.ok) throw new Error(`Could not download ${family}: ${css.status}`);
  const faces = (await css.text()).match(/@font-face\s*\{[^}]+\}/g) ?? [];
  const variable = faces.find(
    (face) =>
      /font-weight:\s*\d+\s+\d+/.test(face) &&
      /font-style:\s*normal/.test(face),
  );
  const url = variable?.match(/url\(['"]?(\/\/[^)'"\s]+\.woff2)/)?.[1];
  if (!url) throw new Error(`No variable WOFF2 found for ${family}`);
  const response = await fetch(`https:${url}`);
  if (!response.ok)
    throw new Error(`Could not download ${family}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== "wOF2")
    throw new Error(`Invalid WOFF2 response for ${family}`);
  await writeFile(target, bytes);
}
