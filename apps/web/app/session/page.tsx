"use client";

import { AIListeningBackground } from "@/components/ai-listening-background";
import { Navbar } from "@/components/navbar";
import { SessionControls } from "@/components/session-controls";
import { TranscriptStream } from "@/components/transcript-stream";
import useWSConnection from "@/hooks/useWsConnection";
import { authClient } from "@/lib/auth-client";
import { useDownloadStore } from "@/store/downloadStore";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function SessionPage() {
  const router = useRouter();

  const { data: session, isPending } = authClient.useSession();
  const createdRef = useRef(false);

  const isRecording = useDownloadStore((s) => s.isRecording);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    if (!session || sessionId || creatingSession || createdRef.current) return;
    createdRef.current = true;
    setCreatingSession(true);

    const token = session.session.token;

    fetch("http://localhost:8787/api/session", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to create session");
        const data = await res.json();
        setSessionId(data.id);
        setCreatingSession(false);
      })
      .catch((err) => {
        console.error("Failed to create session:", err);
        createdRef.current = false;
        setCreatingSession(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useWSConnection(sessionId);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/auth/sign-in");
    }
  }, [session, isPending, router]);

  if (isPending || creatingSession || !sessionId) {
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
        <div className="relative w-full max-w-2xl flex flex-col items-center justify-center min-h-105 isolate">
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

            <SessionControls />
            <TranscriptStream />
          </div>
        </div>
      </main>
    </div>
  );
}
