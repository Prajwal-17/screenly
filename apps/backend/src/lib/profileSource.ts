import { lookup } from "node:dns/promises";
// Use the real package: Bun’s undici shim does not implement dispatcher controls.
import { Agent, ProxyAgent, fetch as safeFetch } from "undici/index.js";
import ipaddr from "ipaddr.js";
import { parseHTML } from "linkedom";
import { unzipSync } from "fflate";
import { extractText, getDocumentProxy } from "unpdf";

export class ImportError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 415 | 422 | 429 | 503 = 422,
  ) {
    super(message);
  }
}
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_SOURCE_BYTES = 1024 * 1024;
export const MAX_SOURCE_CHARS = 30000;
export function normalizeSourceURL(value: string) {
  try {
    if (
      /^[a-z][a-z0-9+.-]*:/i.test(value.trim()) &&
      !/^https:\/\//i.test(value.trim())
    )
      throw new Error();
    const url = new URL(
      /^https?:\/\//i.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`,
    );
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      throw new Error();
    url.hash = "";
    return url;
  } catch {
    throw new ImportError(
      "Use a public https:// profile or portfolio link.",
      400,
    );
  }
}
export function publicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
export async function assertPublicURL(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !host.includes(".") ||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)
  )
    throw new ImportError("Use a public profile or portfolio link.", 400);
  const addresses = await new Promise<import("node:dns").LookupAddress[]>(
    (resolve) => {
      const timer = setTimeout(() => resolve([]), 5000);
      lookup(host, { all: true }).then(
        (entries) => {
          clearTimeout(timer);
          resolve(entries);
        },
        () => {
          clearTimeout(timer);
          resolve([]);
        },
      );
    },
  );
  if (
    !addresses.length ||
    addresses.some((entry) => !publicAddress(entry.address))
  )
    throw new ImportError(
      "That link could not be reached as a public website. Try a resume or paste your profile text.",
    );
  return addresses;
}
export async function readBounded(
  response: Response | Awaited<ReturnType<typeof safeFetch>>,
  limit = MAX_SOURCE_BYTES,
) {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > limit) {
    await response.body?.cancel();
    throw new ImportError(
      "That page is too large. Upload a resume or paste the relevant text.",
      413,
    );
  }
  const reader = response.body?.getReader();
  if (!reader) return "";
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit)
        throw new ImportError(
          "That page is too large. Upload a resume or paste the relevant text.",
          413,
        );
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
export async function fetchPublic(
  url: URL,
  signal: AbortSignal,
  hops = 0,
): Promise<{ text: string; type: string }> {
  const addresses = await assertPublicURL(url);
  const address =
    addresses.find((entry) => entry.family === 4)?.address ??
    addresses[0]!.address;
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const target = new URL(url);
  target.hostname = address.includes(":") ? `[${address}]` : address;
  const dispatcher = proxy
    ? new ProxyAgent({ uri: proxy, requestTls: { servername: url.hostname } })
    : new Agent({ connect: { servername: url.hostname } });
  let response: Awaited<ReturnType<typeof safeFetch>>;
  try {
    // Pin the verified destination at socket/CONNECT time; retain TLS identity and Host.
    const incoming = await safeFetch(target, {
      dispatcher,
      signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
      redirect: "manual",
      headers: {
        Host: url.hostname,
        Accept: "text/html,application/json,text/plain",
        "Accept-Encoding": "identity",
        "User-Agent": "Screenly-Profile-Import/1.0",
      },
    });
    response = incoming;
    // close() waits for the response body before releasing its sockets.
    void dispatcher.close().catch(() => {});
  } catch {
    void dispatcher.destroy().catch(() => {});
    throw new ImportError(
      "That website could not be reached. Try a resume or paste your profile text.",
    );
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location || hops >= 3)
      throw new ImportError(
        "That link redirects too many times. Use the final public profile URL.",
      );
    return fetchPublic(new URL(location, url), signal, hops + 1);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new ImportError(
      "That profile isn’t publicly readable. Upload a resume or paste your profile text instead.",
    );
  }
  const type = response.headers.get("content-type") ?? "";
  if (!/text\/(html|plain)|application\/json/.test(type)) {
    await response.body?.cancel();
    throw new ImportError(
      "Use a public profile page, or upload the resume file instead.",
    );
  }
  return { text: await readBounded(response), type };
}
export async function profileLinkSource(
  value: string,
  signal: AbortSignal,
  fetcher = fetchPublic,
) {
  const url = normalizeSourceURL(value);
  if (["github.com", "www.github.com"].includes(url.hostname)) {
    const username = url.pathname.split("/").filter(Boolean)[0];
    if (!username || !/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(username))
      throw new ImportError(
        "Use a GitHub profile link such as github.com/your-name.",
        400,
      );
    const [person, repositories] = await Promise.all([
      fetcher(new URL(`https://api.github.com/users/${username}`), signal),
      fetcher(
        new URL(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=8`,
        ),
        signal,
      ),
    ]);
    const profile = JSON.parse(person.text);
    const repos = JSON.parse(repositories.text);
    const text = JSON.stringify({
      name: profile.name,
      bio: profile.bio,
      location: profile.location,
      website: profile.blog,
      githubUrl: `https://github.com/${username}`,
      repositories: Array.isArray(repos)
        ? repos
            .filter((repo) => !repo.fork)
            .map((repo) => ({
              name: repo.name,
              description: repo.description,
              language: repo.language,
              topics: repo.topics,
            }))
        : [],
    });
    return {
      text: text.slice(0, MAX_SOURCE_CHARS),
      source: "GitHub profile",
      link: { githubUrl: `https://github.com/${username}` },
    };
  }
  const page = await fetcher(url, signal);
  const document = parseHTML(
    page.type.includes("text/plain") ? `<html><body></body></html>` : page.text,
  ).document;
  const description =
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute("content") ?? "";
  for (const element of document.querySelectorAll(
    "script,style,noscript,nav,footer,header,form,iframe,svg",
  ))
    element.remove();
  const text =
    `${document.title}\n${description}\n${page.type.includes("text/plain") ? page.text : (document.body?.textContent ?? "")}`
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_SOURCE_CHARS);
  const linkedin = /(^|\.)linkedin\.com$/.test(url.hostname);
  if (
    text.length < 100 ||
    /authwall|sign in to (view|see)|join linkedin|security verification/i.test(
      text.slice(0, 3000),
    )
  )
    throw new ImportError(
      "That profile isn’t publicly readable. Upload a resume or paste your profile text instead.",
    );
  return {
    text,
    source: linkedin ? "LinkedIn profile" : "Portfolio",
    link: linkedin
      ? { linkedinUrl: url.toString() }
      : { portfolioUrl: url.toString() },
  };
}
export async function resumeSource(file: File) {
  if (!file.size || file.size > MAX_RESUME_BYTES)
    throw new ImportError("Choose a nonempty resume up to 5 MB.", 413);
  const ext = file.name.split(".").at(-1)?.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    let text = "";
    if (ext === "txt") {
      if (bytes.includes(0))
        throw new ImportError(
          "Choose a plain-text resume, PDF, or DOCX file.",
          415,
        );
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } else if (ext === "pdf") {
      if (!new TextDecoder().decode(bytes.slice(0, 8)).startsWith("%PDF-"))
        throw new ImportError("That file does not appear to be a PDF.", 415);
      const pdf = await getDocumentProxy(bytes, {
        disableFontFace: true,
        useSystemFonts: false,
      });
      try {
        if (pdf.numPages > 20)
          throw new ImportError("Use a resume with 20 pages or fewer.", 413);
        text = (await extractText(pdf, { mergePages: true })).text;
      } finally {
        await pdf.loadingTask.destroy();
      }
    } else if (ext === "docx") {
      const entries = unzipSync(bytes, {
        filter: (entry) =>
          entry.name === "word/document.xml" &&
          entry.originalSize <= 2 * 1024 * 1024,
      });
      const xml = entries["word/document.xml"];
      if (!xml)
        throw new ImportError(
          "That DOCX could not be read. Try a PDF or text resume.",
        );
      text = new TextDecoder()
        .decode(xml)
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    } else throw new ImportError("Upload a PDF, DOCX, or TXT resume.", 415);
    text = text
      .replaceAll(String.fromCharCode(0), "")
      .trim()
      .slice(0, MAX_SOURCE_CHARS);
    if (text.length < 40)
      throw new ImportError(
        "There isn’t enough readable text. For a scanned PDF, paste the resume text or enter your details manually.",
      );
    return { text, source: "Resume", link: {} };
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError(
      "That resume could not be read. Try an unprotected PDF, DOCX, or TXT file.",
    );
  }
}
