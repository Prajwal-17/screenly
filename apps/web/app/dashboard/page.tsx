"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { roles } from "@repo/shared";
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
const focusTopics = {
  Frontend: "JavaScript · React",
  Backend: "APIs · Databases",
  "Full-stack": "System design · APIs",
};
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
          title="Overview"
          action={
            <Link className="button" href="/interviews/new">
              <Plus size={16} />
              New interview
            </Link>
          }
        />
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState
            message={query.error.message}
            retry={() => void query.refetch()}
          />
        ) : (
          <>
            <div className="grid-3" aria-label="Practice statistics">
              <div className="surface metric">
                <div className="metric-label">Completed interviews</div>
                <div className="metric-value">{completed.length}</div>
              </div>
              <div className="surface metric">
                <div className="metric-label">Minutes practiced</div>
                <div className="metric-value">
                  {Math.round(
                    items.reduce((sum, i) => sum + elapsed(i), 0) / 60,
                  )}
                </div>
              </div>
              <div className="surface metric">
                <div className="metric-label">Average score</div>
                <div className="metric-value">
                  {average ?? "—"}
                  {average !== null && <span>/ 10</span>}
                </div>
              </div>
            </div>
            <div className="between section-row">
              <h2>Recent interviews</h2>
              <Link href="/history" className="text-link">
                View history <ArrowRight size={14} />
              </Link>
            </div>
            <InterviewRows interviews={items.slice(0, 5)} />
          </>
        )}
        <div className="section-row">
          <h2>Choose a focus</h2>
        </div>
        <div className="focus-grid">
          {roles.map((role) => (
            <Link
              key={role}
              className="focus-link"
              href={`/interviews/new?role=${encodeURIComponent(role)}`}
            >
              <div>
                <strong>{role}</strong>
                <small>{focusTopics[role]}</small>
              </div>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </Reveal>
    </Workspace>
  );
}
