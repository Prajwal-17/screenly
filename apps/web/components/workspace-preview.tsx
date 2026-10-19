"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { useUserProfile } from "@/lib/profile";
import { ProfileSummary } from "@/components/profile-summary";
import { Workspace } from "@/components/workspace";
import { PageIntro } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { authClient } from "@/lib/auth-client";
import { useUIStore } from "@/store/uiStore";

const intros = {
  settings: "A workspace that feels like yours.",
  help: "A few things to help you get settled.",
};
export function WorkspacePreview({
  section,
}: {
  section: keyof typeof intros;
}) {
  const { data: session } = authClient.useSession();
  const profile = useUserProfile();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  return (
    <Workspace>
      <PageIntro description={intros[section]} />

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
            <label className="mt-5 flex cursor-pointer items-center justify-between gap-6">
              <span>
                <span className="block text-sm font-medium">
                  Keep sidebar collapsed
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Use the compact icon rail by default on this device.
                </span>
              </span>
              <Checkbox
                checked={sidebarCollapsed}
                onCheckedChange={(value) => setSidebarCollapsed(value === true)}
              />
            </label>
            <div className="mt-6 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium">Interview focus</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The sidebar folds away when your interview starts and restores
                  your preference afterward.
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
                <Badge variant="outline">Preview</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                A shared place to practice together. Coming soon.
              </p>
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
                "Choose New interview, select your role, topics, and duration, then continue to the audio check. Allow microphone access and start when you are ready. The clock starts when the interview begins.",
              ],
              [
                "Can I interrupt the interviewer?",
                "Yes. Speak when you are ready, or use Interrupt. You can mute your microphone at any time.",
              ],
              [
                "Where can I find the conversation?",
                "Open Transcript from the interview's top bar to read along. Finished sessions, saved conversations, and feedback are available in History.",
              ],
              [
                "What if my connection drops?",
                "Your saved conversation is retained. Reconnect, check your microphone, and resume within the interview's original time budget.",
              ],
              [
                "How do I collapse the sidebar?",
                "Use the panel button beside the page title. Your preference is remembered on this device. During a live interview, the sidebar automatically becomes a compact icon rail.",
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
