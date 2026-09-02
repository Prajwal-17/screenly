"use client";

import { Card, CardContent } from "@/components/ui/card";
import { session } from "@/lib/interview-session";
import { useEffect, useState } from "react";

export function TranscriptStream() {
  const [transcripts, setTranscripts] = useState(session.getTranscripts());

  useEffect(() => {
    return session.subscribeTranscripts(() => {
      setTranscripts(session.getTranscripts());
    });
  }, []);

  return (
    <Card className="w-full max-w-2xl bg-background/70 backdrop-blur-sm">
      <CardContent className="p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Transcript
        </p>
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {transcripts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Start speaking to see the transcript.
            </p>
          ) : (
            transcripts.map((item) => (
              <p key={item.turnIndex} className="text-sm text-foreground">
                {item.transcript}
              </p>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
