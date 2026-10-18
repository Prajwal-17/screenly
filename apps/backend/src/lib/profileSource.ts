import { resolve4, resolve6 } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { DOMParser, parseHTML } from "linkedom";
import { unzipSync } from "fflate";
import { extractLinks, extractText, getDocumentProxy } from "unpdf";
import { profileURLIssue } from "@repo/shared";
import WordExtractor from "word-extractor";

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
  const issue = profileURLIssue(value);
  if (issue) throw new ImportError(issue, 400);
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
    (ipaddr.isValid(host) && !publicAddress(host)) ||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)
  )
    throw new ImportError("Use a public profile or portfolio link.", 400);
  const addresses = await Promise.race([
    Promise.allSettled([resolve4(host), resolve6(host)]).then((results) =>
      results.flatMap((result, index) =>
        result.status === "fulfilled"
          ? result.value.map((address) => ({
              address,
              family: index === 0 ? 4 : 6,
            }))
          : [],
      ),
    ),
    new Promise<{ address: string; family: number }[]>((resolve) =>
      setTimeout(() => resolve([]), 5000),
    ),
  ]);
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
  response: Pick<Response, "headers" | "body">,
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
export async function requestPublicURL(
  url: URL,
  signal: AbortSignal,
  fetcher: (input: URL, init?: RequestInit) => Promise<Response> = fetch,
) {
  // Keep the public hostname in the URL for correct TLS/SNI and HTTP routing.
  // Native Workers fetch uses public egress; no VPC or private service binding is used.
  return fetcher(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    redirect: "manual",
    headers: {
      Accept: "text/html,application/json,text/plain",
      "User-Agent": "Screenly-Profile-Import/1.0",
    },
  });
}
export async function fetchPublic(
  url: URL,
  signal: AbortSignal,
  hops = 0,
): Promise<{ text: string; type: string }> {
  const issue = profileURLIssue(url.toString());
  if (issue && url.hostname !== "api.github.com")
    throw new ImportError(issue, 400);
  await assertPublicURL(url);
  let response: Response;
  try {
    response = await requestPublicURL(url, signal);
  } catch {
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
  if (
    !linkedin &&
    !/\b(engineer|developer|designer|portfolio|projects?|experience|skills?|education|about me|software|researcher|consultant|architect|resume|curriculum|currículo)\b/i.test(
      text,
    )
  )
    throw new ImportError(
      "That page doesn’t look like a personal portfolio. Use your own profile, upload a resume, or paste your background.",
      400,
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
    let links: string[] = [];
    if (ext === "txt") {
      if (bytes.includes(0))
        throw new ImportError(
          "Choose a plain-text resume, PDF, or DOCX file.",
          415,
        );
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(
        bytes,
      );
    } else if (ext === "pdf") {
      if (!new TextDecoder().decode(bytes.slice(0, 8)).startsWith("%PDF-"))
        throw new ImportError("That file does not appear to be a PDF.", 415);
      const pdf = await getDocumentProxy(bytes, {
        disableFontFace: true,
        useSystemFonts: true,
        useWorkerFetch: false,
      });
      try {
        if (pdf.numPages > 20)
          throw new ImportError("Use a resume with 20 pages or fewer.", 413);
        text = (await extractText(pdf, { mergePages: true })).text;
        links = (await extractLinks(pdf)).links;
      } finally {
        await pdf.loadingTask.destroy();
      }
    } else if (ext === "doc") {
      if (
        Buffer.from(bytes.subarray(0, 8)).toString("hex") !== "d0cf11e0a1b11ae1"
      )
        throw new ImportError(
          "That file isn’t a Word document. Export it as DOCX or PDF and try again.",
          415,
        );
      text = (await new WordExtractor().extract(Buffer.from(bytes))).getBody();
    } else if (ext === "docx") {
      const entries = unzipSync(bytes, {
        filter: (entry) =>
          ["word/document.xml", "word/_rels/document.xml.rels"].includes(
            entry.name,
          ) && entry.originalSize <= 2 * 1024 * 1024,
      });
      const xml = entries["word/document.xml"];
      if (!xml)
        throw new ImportError(
          "That DOCX could not be read. Try a PDF or text resume.",
        );
      // Decode XML entities and join paragraphs/tabs without splitting words at run boundaries.
      const raw = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false })
        .decode(xml)
        .replace(/<w:(?:tab|br|cr)\b[^>]*\/>/g, " ")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]*>/g, "");
      text =
        parseHTML(
          `<html><body><div>${raw.replaceAll("<", "&lt;")}</div></body></html>`,
        ).document.querySelector("div")?.textContent ?? "";
      const relationships = entries["word/_rels/document.xml.rels"];
      if (relationships) {
        const document = new DOMParser().parseFromString(
          new TextDecoder().decode(relationships),
          "text/xml",
        );
        links = [...document.querySelectorAll("Relationship")]
          .filter((node) => node.getAttribute("Type")?.endsWith("/hyperlink"))
          .map((node) => node.getAttribute("Target") ?? "");
      }
    } else
      throw new ImportError("Upload a PDF, DOCX, DOC, or TXT resume.", 415);
    text = text
      .replaceAll(String.fromCharCode(0), "")
      .trim()
      .slice(0, MAX_SOURCE_CHARS);
    if (text.length < 40)
      throw new ImportError(
        "There isn’t enough readable text. For a scanned PDF, paste the resume text or enter your details manually.",
      );
    const urls = [...new Set(links)]
      .filter((value) => {
        try {
          const url = new URL(value);
          return (
            value.length <= 2048 &&
            url.protocol === "https:" &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      })
      .slice(0, 20);
    if (urls.length)
      text = `Linked URLs:\n${urls.join("\n")}\n\n${text}`.slice(
        0,
        MAX_SOURCE_CHARS,
      );
    return { text, source: `${ext?.toUpperCase()} resume`, link: {} };
  } catch (error) {
    if (error instanceof ImportError) throw error;
    if (error instanceof Error && /password|encrypt/i.test(error.message))
      throw new ImportError(
        "This resume is password-protected. Upload an unlocked copy or paste its text.",
        422,
      );
    throw new ImportError(
      "That resume could not be read. Try an unprotected PDF, DOCX, or TXT file.",
    );
  }
}
