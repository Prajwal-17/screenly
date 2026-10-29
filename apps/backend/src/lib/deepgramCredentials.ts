import { z } from "zod";
import type { Config } from "../config";
import { DeepgramConnectionError } from "./deepgramSocket";

const STORAGE_KEY = "deepgramCredential";
const KEY_TTL_MS = 60 * 60 * 1000;
const RETRY_MS = 60 * 1000;
const responseSchema = z.object({
  api_key_id: z.string().min(1),
  key: z.string().min(1),
});
type Credential = {
  projectId: string;
  id: string;
  key?: string;
  expiresAt: number;
};
type State = {
  closed: boolean;
  credential?: Credential;
  retryAt?: number;
};
type Storage = {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
};
export type CredentialRequest = (
  url: URL,
  options: RequestInit,
) => Promise<Response>;

// One instance per InterviewRoom. Secrets live only in its private storage;
// they never enter the interview record, transcript, or browser protocol.
export class DeepgramCredentials {
  private pending: Promise<unknown> = Promise.resolve();
  constructor(
    private config: Config,
    private storage: Storage,
    private changed: () => Promise<void>,
    // Workers' native fetch rejects a class instance as its receiver. Keep the
    // global call inside a wrapper instead of storing fetch as an object method.
    private request: CredentialRequest = (url, options) => fetch(url, options),
    private now: () => number = Date.now,
  ) {}

  private run<T>(work: () => Promise<T>): Promise<T> {
    // STT, TTS, finish, and alarm callbacks can overlap across external I/O.
    const task = this.pending.then(async () => {
      try {
        return await work();
      } finally {
        await this.changed();
      }
    });
    this.pending = task.catch(() => {});
    return task;
  }

  private async call(projectId: string, keyId?: string, body?: object) {
    if (!this.config.DEEPGRAM_API_KEY)
      throw new DeepgramConnectionError("MISSING_KEY");
    const url = new URL(this.config.DEEPGRAM_WS_URL);
    url.protocol = url.protocol === "wss:" ? "https:" : "http:";
    url.pathname = `/v1/projects/${encodeURIComponent(projectId)}/keys${keyId ? `/${encodeURIComponent(keyId)}` : ""}`;
    url.search = "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await this.request(url, {
        method: keyId ? "DELETE" : "POST",
        headers: {
          Authorization: `Token ${this.config.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: "manual",
        signal: controller.signal,
      });
      if (!response.ok && !(keyId && response.status === 404)) {
        await response.body?.cancel();
        throw new DeepgramConnectionError("KEY_MANAGEMENT");
      }
      if (keyId) {
        await response.body?.cancel();
        return;
      }
      return responseSchema.parse(await response.json());
    } catch {
      // Provider bodies and fetch errors can include credentials. Never expose
      // or log them; callers only receive this fixed diagnostic.
      throw new DeepgramConnectionError("KEY_MANAGEMENT");
    } finally {
      clearTimeout(timer);
    }
  }

  private async revoke(state: State): Promise<boolean> {
    const credential = state.credential;
    if (!credential) return true;
    // Persist the non-usable state before external I/O, retaining the key ID
    // for retries after an object restart or a Deepgram outage.
    delete credential.key;
    state.retryAt = this.now() + RETRY_MS;
    await this.storage.put(STORAGE_KEY, state);
    try {
      await this.call(credential.projectId, credential.id);
    } catch {
      // After provider-enforced expiry the key cannot authorize new requests.
      // Do not keep retrying forever if the management credential was removed.
      if (credential.expiresAt > this.now()) {
        console.warn(
          JSON.stringify({ event: "deepgram_key_revocation_pending" }),
        );
        return false;
      }
    }
    delete state.credential;
    delete state.retryAt;
    await this.storage.put(STORAGE_KEY, state);
    return true;
  }

  get(interviewId: string): Promise<string> {
    return this.run(async () => {
      const state = (await this.storage.get<State>(STORAGE_KEY)) ?? {
        closed: false,
      };
      if (state.closed) throw new DeepgramConnectionError("SESSION_CLOSED");
      if (
        state.credential?.key &&
        state.credential.expiresAt > this.now() + 30000
      )
        return state.credential.key;
      if (!(await this.revoke(state)))
        throw new DeepgramConnectionError("KEY_MANAGEMENT");
      const projectId = this.config.DEEPGRAM_PROJECT_ID;
      if (!projectId) throw new DeepgramConnectionError("MISSING_PROJECT");
      const expiresAt = this.now() + KEY_TTL_MS;
      const created = await this.call(projectId, undefined, {
        comment: `Screenly interview ${interviewId}`,
        scopes: ["usage:write"],
        expiration_date: new Date(expiresAt).toISOString(),
      });
      if (!created) throw new DeepgramConnectionError("KEY_MANAGEMENT");
      state.credential = {
        projectId,
        id: created.api_key_id,
        key: created.key,
        expiresAt,
      };
      await this.storage.put(STORAGE_KEY, state);
      return created.key;
    });
  }

  close(): Promise<void> {
    return this.run(async () => {
      const state = (await this.storage.get<State>(STORAGE_KEY)) ?? {
        closed: true,
      };
      state.closed = true;
      await this.storage.put(STORAGE_KEY, state);
      await this.revoke(state);
    });
  }

  alarm(): Promise<void> {
    return this.run(async () => {
      const state = await this.storage.get<State>(STORAGE_KEY);
      const at = await this.nextAlarm();
      if (state?.credential && at != null && at <= this.now())
        await this.revoke(state);
    });
  }

  async nextAlarm(): Promise<number | null> {
    const state = await this.storage.get<State>(STORAGE_KEY);
    return state?.credential
      ? (state.retryAt ?? state.credential.expiresAt)
      : null;
  }
}
