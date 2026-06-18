import { create } from "zustand";

type DownloadStore = {
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  downloadAudio: boolean;
  setDownloadAudio: (value: boolean) => void;
};

export const useDownloadStore = create<DownloadStore>((set) => ({
  isRecording: false,
  setIsRecording: (value) =>
    set(() => ({
      isRecording: value,
    })),

  downloadAudio: false,
  setDownloadAudio: (value) =>
    set(() => ({
      downloadAudio: value,
    })),
}));
