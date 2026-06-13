"use client";

import { useEffect, useRef } from "react";

export default function Home() {
  const wsRef = useRef<WebSocket | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bufferRef = useRef<ArrayBuffer[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log("stopped recording");

        const blob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });

        // Download locally
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = `sample${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        // Send as ArrayBuffer over WebSocket
        const arrayBuffer = await blob.arrayBuffer();
        wsRef.current?.send(arrayBuffer);

        // Clean up
        chunksRef.current = [];
        bufferRef.current = [];
      };

      recorderRef.current = recorder;
      recorder.start(250); // collect data every 250ms so chunks are ready by stop
    } catch (error) {
      console.log(error);
    }
  };

  const stopRecording = async () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
    }
  };

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8787/ws");

    ws.onopen = () => {
      console.log("Connected");
    };

    ws.onmessage = (event) => {
      const blob = new Blob([event.data], {
        type: "audio/mpeg",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style.display = "none";
      a.href = url;
      a.download = `speech-${Date.now()}.mp3`;
      a.click();

      URL.revokeObjectURL(url);
    };

    ws.onclose = () => {
      console.log("Disconnected");
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div>
      <h1>AI Interviewer</h1>
      <button onClick={startRecording}>Start</button> <br />
      <button
        onClick={() => {
          stopRecording();
        }}
      >
        Stop
      </button>
    </div>
  );
}
