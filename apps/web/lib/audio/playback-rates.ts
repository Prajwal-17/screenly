export const playbackRates = [1, 1.25, 1.5, 2] as const;
const preferenceKey = "screenly-playback-rate";

export function preferredPlaybackRate() {
  try {
    const saved = Number(localStorage.getItem(preferenceKey));
    return playbackRates.includes(saved as (typeof playbackRates)[number])
      ? saved
      : 1;
  } catch {
    return 1;
  }
}

export function savePlaybackRate(rate: number) {
  try {
    localStorage.setItem(preferenceKey, String(rate));
    return true;
  } catch {
    return false;
  }
}
