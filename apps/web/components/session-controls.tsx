"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { session } from "@/lib/interview-session";
import { useDownloadStore } from "@/store/downloadStore";
import { Mic, Square } from "lucide-react";

export function SessionControls() {
  const isRecording = useDownloadStore((s) => s.isRecording);
  const downloadAudio = useDownloadStore((s) => s.downloadAudio);
  const setDownloadAudio = useDownloadStore((s) => s.setDownloadAudio);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-center gap-4 w-full">
        <Button
          size="lg"
          className="flex-1 gap-2 h-11"
          onClick={() => {
            session.startRecording();
          }}
          disabled={isRecording}
        >
          <Mic className="h-4 w-4" />
          Start Recording
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="flex-1 gap-2 h-11"
          onClick={() => {
            session.stopRecording();
          }}
          disabled={!isRecording}
        >
          <Square className="h-4 w-4" />
          Stop Recording
        </Button>
      </div>

      <div className="flex items-center gap-2 select-none self-start px-1">
        <input
          id="download-audio"
          type="checkbox"
          checked={downloadAudio}
          onChange={(e) => {
            setDownloadAudio(e.target.checked);
          }}
          className="h-4 w-4 rounded border-border bg-background text-foreground focus:ring-ring cursor-pointer accent-foreground"
        />
        <label
          htmlFor="download-audio"
          className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          Download audio
        </label>
      </div>

      <Card className="w-full bg-background/70 backdrop-blur-sm">
        <CardContent className="py-4 text-center space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Session Status
          </p>
          <p className="text-sm font-medium text-foreground">
            {isRecording ? (
              <span className="flex items-center justify-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                Listening...
              </span>
            ) : (
              "Waiting to start..."
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
