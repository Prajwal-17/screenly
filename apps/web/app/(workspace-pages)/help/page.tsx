import { Workspace } from "@/components/workspace";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
const help = [
  [
    "How do I start?",
    "Choose New interview, select a role, and check your microphone. Your saved experience level is required. New sessions last 20 minutes.",
  ],
  [
    "Can I interrupt the interviewer?",
    "Yes. Start speaking to interrupt. You can mute, pause, replay and change audio settings during the conversation.",
  ],
  [
    "Where is my conversation?",
    "The live transcript stays on screen. Completed interviews, reviews and transcript export are in Interviews.",
  ],
  [
    "What if my connection drops?",
    "Your saved conversation remains available. Reconnect and resume within the session's original time budget.",
  ],
  [
    "What if microphone access is denied?",
    "Allow access in your browser's site settings, then check the microphone again. Use Test sound for speakers. The interview offers separate microphone and speech recovery actions.",
  ],
  [
    "Which keyboard shortcuts are available?",
    "During a live interview, M toggles mute, R replays the interviewer, T focuses the transcript, and Space pauses or resumes. Ctrl or Command + B opens navigation. Shortcuts do not run while typing or inside a menu or dialog.",
  ],
];
export default function Help() {
  return (
    <Workspace>
      <div className="max-w-3xl">
        <Accordion type="single" collapsible className="border-y">
          {help.map(([title, description]) => (
            <AccordionItem key={title} value={title!} className="py-3">
              <AccordionTrigger>{title}</AccordionTrigger>
              <AccordionContent>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-6 text-sm text-muted-foreground">
          Microphone access requires localhost or a secure HTTPS connection.
        </p>
      </div>
    </Workspace>
  );
}
