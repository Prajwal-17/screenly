"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Workspace } from "@/components/workspace";
import {
  PageTitle,
  Reveal,
  InterviewRows,
  Loading,
  ErrorState,
} from "@/components/common";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";
export default function History() {
  const { data: session } = authClient.useSession();
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["interviews"],
    queryFn: api.list,
    enabled: !!session,
  });
  const items = (query.data ?? []).filter((i) =>
    `${i.role} ${i.level} ${i.topics.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <Workspace>
      <Reveal>
        <PageTitle
          eyebrow="Your journey"
          title="Every conversation, kept."
          description="Revisit your answers, reconnect with your feedback, and see how far you’ve come."
          action={
            <Link className="button" href="/interviews/new">
              <Plus size={16} />
              New interview
            </Link>
          }
        />
        <div className="between" style={{ marginBottom: 22 }}>
          <span style={{ color: "var(--subtle)", fontSize: 12 }}>
            {query.data?.length ?? 0} interviews in your practice history
          </span>
          <label className="row" style={{ maxWidth: 290 }}>
            <Search size={16} color="var(--subtle)" />
            <input
              aria-label="Search interviews"
              className="input"
              placeholder="Search role or topic…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState
            message={query.error.message}
            retry={() => void query.refetch()}
          />
        ) : search && !items.length ? (
          <div className="surface empty">
            <h3>No conversations match</h3>
            <p style={{ marginTop: 12 }}>Try another role or topic.</p>
          </div>
        ) : (
          <InterviewRows interviews={items} />
        )}
      </Reveal>
    </Workspace>
  );
}
