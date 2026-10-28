"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { useUserProfile } from "@/lib/profile";
import { ProfileSummary } from "@/components/profile-summary";
import { Workspace } from "@/components/workspace";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { authClient } from "@/lib/auth-client";

export function WorkspacePreview({
  section,
}: {
  section: "settings" | "help";
}) {
  const { data: session } = authClient.useSession();
  const profile = useUserProfile();
  return (
    <Workspace>
      {section === "settings" && (
        <div className="max-w-3xl">
          <section className="border-y py-6">
            <h2 className="text-base">Your account</h2>
            <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Name</dt>
                <dd className="mt-1.5">
                  {profile.data?.details.name || session?.user.name}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="mt-1.5 break-all">{session?.user.email}</dd>
              </div>
            </dl>
          </section>
          <ProfileSummary />
          <section className="border-b py-6">
            <h2 className="text-base">Workspace preferences</h2>
            <div className="mt-5 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium">Interview focus</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Navigation is available as a drawer during a live interview.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                <Check className="size-3.5" />
                On
              </span>
            </div>
          </section>
          <section className="flex items-start justify-between gap-5 border-b py-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base">Team workspaces</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
            </div>
            <SlidersHorizontal
              className="mt-1 size-5 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
            />
          </section>
        </div>
      )}

      {section === "help" && (
        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="border-y">
            {[
              [
                "How do I start an interview?",
                "Choose New interview, select your role, topics, and duration, then continue to the audio check. Allow microphone access and start when you are ready. The clock starts with the first technical question.",
              ],
              [
                "Can I interrupt the interviewer?",
                "Yes. Start speaking to interrupt the interviewer. You can mute your microphone at any time.",
              ],
              [
                "Where can I find the conversation?",
                "Open Transcript from the interview's top bar to read along. Finished sessions, saved conversations, and feedback are available in Interviews.",
              ],
              [
                "What if my connection drops?",
                "Your saved conversation is retained. Reconnect, check your microphone, and resume within the interview's original time budget.",
              ],
              [
                "Where is navigation during an interview?",
                "Use the navigation button during a live interview to open the workspace drawer. On other pages, the full sidebar stays visible.",
              ],
              [
                "Which keyboard shortcuts are available?",
                "Ctrl or Command + K opens workspace search. During a live interview, Ctrl or Command + B opens navigation, M toggles mute, R replays the question, T toggles the transcript, and Space pauses or resumes the interview and its timer. Shortcuts leave typing alone; interview shortcuts also leave open menus and dialogs alone.",
              ],
              [
                "What if microphone access is denied?",
                "Allow microphone access in your browser’s site settings, then check the microphone again. Use Test sound to check your speakers. If transcription fails during an interview, choose Retry microphone. Retry speech handles interviewer playback failures separately.",
              ],
            ].map(([title, description]) => (
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
            For microphone access, use localhost or a secure HTTPS connection.
          </p>
        </div>
      )}
    </Workspace>
  );
}
