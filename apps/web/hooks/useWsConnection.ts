import { session } from "@/lib/interview-session";
import { useEffect, useRef } from "react";

const useWSConnection = (sessionId: string | null) => {
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!sessionId || connectedRef.current) return;
    connectedRef.current = true;

    const webSocketURL = `ws://localhost:8787/api/sessions/${sessionId}/ws`;
    session.setSessionId(sessionId);
    session.connect(webSocketURL);

    return () => {
      connectedRef.current = false;
    };
  }, [sessionId]);
};

export default useWSConnection;
