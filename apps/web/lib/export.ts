import type { InterviewDetail } from "@repo/shared";
export function exportTranscript(interview: InterviewDetail) {
  const text = [
    `Screenly · ${interview.role} interview`,
    `${interview.level} · ${interview.topics.join(", ")}`,
    "",
    ...interview.messages.flatMap((m) => [
      `${m.role === "assistant" ? "Screenly" : "You"}${m.status === "interrupted" ? " (interrupted)" : ""}:`,
      m.content,
      "",
    ]),
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `screenly-interview-${interview.id}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
