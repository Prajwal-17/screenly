"use client";

import { AIListeningBackground } from "@/components/ai-listening-background";
import { Navbar } from "@/components/navbar";
import { SessionControls } from "@/components/session-controls";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SessionPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [downloadAudio, setDownloadAudio] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/auth/sign-in");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-2xl flex flex-col items-center justify-center min-h-[420px] isolate">
          <AIListeningBackground active={isRecording} />

          <div className="relative z-10 flex flex-col items-center gap-8 w-full text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Interview Session
              </h1>
              <p className="text-sm text-muted-foreground">
                Prepare your microphone and begin when ready.
              </p>
            </div>

            <SessionControls
              isRecording={isRecording}
              onStart={() => setIsRecording(true)}
              onStop={() => setIsRecording(false)}
              downloadAudio={downloadAudio}
              onDownloadAudioChange={setDownloadAudio}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
