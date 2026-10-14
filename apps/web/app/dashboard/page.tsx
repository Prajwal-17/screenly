"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, AudioLines, Clock, TrendingUp } from "lucide-react";
import { Workspace } from "@/components/workspace";
import {
  PageTitle,
  Reveal,
  InterviewRows,
  Loading,
  ErrorState,
} from "@/components/common";
import { authClient } from "@/lib/auth-client";
import { api, elapsed } from "@/lib/api";
export default function Dashboard() {
  const { data: session } = authClient.useSession();
  const query = useQuery({
    queryKey: ["interviews"],
    queryFn: api.list,
    enabled: !!session,
  });
  const items = query.data ?? [];
  const completed = items.filter((i) => i.status === "completed");
  const scores = completed.flatMap((i) =>
    i.feedback?.overallScore != null ? [i.feedback.overallScore] : [],
  );
  const average = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;
  return (
    <Workspace>
      <Reveal>
        <PageTitle
          eyebrow="Your practice space"
          title={`Make room for your next level${session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}.`}
          description="A little preparation today. A more confident conversation tomorrow."
          action={
            <Link className="button" href="/interviews/new">
              <Plus size={16} />
              New interview
            </Link>
          }
        />
        <div className="grid-3">
          <div className="surface metric">
            <div className="metric-label">
              Completed interviews
              <AudioLines size={16} />
            </div>
            <div className="metric-value">{completed.length}</div>
            <small>Every conversation counts</small>
          </div>
          <div className="surface metric">
            <div className="metric-label">
              Minutes practiced
              <Clock size={16} />
            </div>
            <div className="metric-value">
              {Math.round(items.reduce((sum, i) => sum + elapsed(i), 0) / 60)}
            </div>
            <small>Time invested in yourself</small>
          </div>
          <div className="surface metric">
            <div className="metric-label">
              Average score
              <TrendingUp size={16} />
            </div>
            <div className="metric-value accent">
              {average ?? "—"}
              {average !== null && (
                <span style={{ fontSize: 15, color: "var(--subtle)" }}>
                  /10
                </span>
              )}
            </div>
            <small>
              {scores.length
                ? "Across scored interviews"
                : "Available after your first report"}
            </small>
          </div>
        </div>
        <div className="surface feature-banner" style={{ marginTop: 24 }}>
          <div>
            <div className="eyebrow accent">
              The next step is a conversation
            </div>
            <h2>
              Practice the parts
              <br />
              you want to get better at.
            </h2>
            <p>
              Choose a focus. Think out loud. Get questions that meet you where
              you are.
            </p>
            <Link className="button" href="/interviews/new">
              Find your focus <ArrowRight size={16} />
            </Link>
          </div>
          <div className="banner-art" aria-hidden="true">
            {[32, 58, 96, 145, 180, 128, 72, 110, 155, 88, 47].map((h, i) => (
              <i key={i} style={{ height: h }} />
            ))}
          </div>
        </div>
        <div className="between section-row">
          <h2 style={{ fontSize: 20 }}>Recent conversations</h2>
          <Link href="/history" className="text-link">
            View history <ArrowRight size={14} />
          </Link>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState
            message={query.error.message}
            retry={() => void query.refetch()}
          />
        ) : (
          <InterviewRows interviews={items.slice(0, 5)} />
        )}
      </Reveal>
    </Workspace>
  );
}
