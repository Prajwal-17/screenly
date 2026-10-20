// Cleanup can run on stop, navigation, and React effect teardown for the same context.
const closingContexts = new WeakMap<AudioContext, Promise<void>>();
export function closeAudioContext(
  context: AudioContext | null | undefined,
): Promise<void> {
  if (!context || context.state === "closed") return Promise.resolve();
  const existing = closingContexts.get(context);
  if (existing) return existing;
  const closing = Promise.resolve()
    .then(async () => {
      if (context.state !== "closed") await context.close();
    })
    .catch((error) => {
      // Another owner may have closed the context between checking and closing.
      if (context.state !== "closed") throw error;
    });
  closingContexts.set(context, closing);
  return closing;
}
