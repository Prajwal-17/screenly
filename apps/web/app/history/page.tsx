"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Workspace } from "@/components/workspace";
import {
  PageTitle,
  InterviewRows,
  Loading,
  ErrorState,
  InlineAlert,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";
export default function History() {
  const { data: session } = authClient.useSession();
  const [search, setSearch] = useState("");
  const client = useQueryClient();
  const remove = useMutation({
    mutationFn: api.remove,
    onSuccess: () => client.invalidateQueries({ queryKey: ["interviews"] }),
  });
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
      <PageTitle
        title="History"
        action={
          <Button asChild>
            <Link href="/interviews/new">
              <Plus />
              New interview
            </Link>
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {query.data
            ? `${query.data.length} interview${query.data.length === 1 ? "" : "s"}`
            : ""}
        </span>
        <div className="relative w-full max-w-[290px]">
          <Label htmlFor="history-search" className="sr-only">
            Search interviews
          </Label>
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <Input
            id="history-search"
            className="pl-9"
            placeholder="Search role or topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : search && !items.length ? (
        <Card>
          <CardContent className="py-6 text-center">
            <h3>No interviews match</h3>
            <p className="mt-3 text-muted-foreground">
              Try another role or topic.
            </p>
          </CardContent>
        </Card>
      ) : (
        <InterviewRows
          interviews={items}
          deleting={remove.isPending}
          onDelete={(interview) => remove.mutate(interview.id)}
        />
      )}
      {remove.error && (
        <InlineAlert className="mt-5">{remove.error.message}</InlineAlert>
      )}
    </Workspace>
  );
}
