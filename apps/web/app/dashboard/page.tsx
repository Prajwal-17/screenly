"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUp, AudioLines, ChevronDown } from "lucide-react";
import { roles, type InterviewSettings } from "@repo/shared";
import { Workspace } from "@/components/workspace";
import { InterviewRows, Loading, ErrorState } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useUserProfile } from "@/lib/profile";
import { api } from "@/lib/api";

export default function Dashboard() {
  const { data: session } = authClient.useSession();
  const profile = useUserProfile();
  const [selectedRole, setSelectedRole] = useState<
    InterviewSettings["role"] | null
  >(null);
  const role = selectedRole ?? (profile.data?.details.role || "Frontend");
  const query = useQuery({
    queryKey: ["interviews"],
    queryFn: api.list,
    enabled: !!session,
  });
  return (
    <Workspace>
      <div className="mx-auto flex min-h-[calc(100dvh-12rem)] w-full max-w-[720px] flex-col justify-center py-8 sm:py-12">
        <section aria-labelledby="practice-title" className="text-center">
          <h2
            id="practice-title"
            className="text-[30px] leading-tight font-semibold tracking-[-0.035em] sm:text-[40px]"
          >
            Start an interview
          </h2>
          <div className="mt-7 flex min-h-16 items-center gap-3 rounded-full border bg-card py-2 pr-2 pl-5 sm:pl-6">
            <AudioLines
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base"
                  aria-label={`Practice role: ${role}`}
                >
                  <span className="truncate">{role} interview</span>
                  <ChevronDown
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-48">
                <DropdownMenuRadioGroup
                  value={role}
                  onValueChange={(value) => {
                    const match = roles.find((r) => r === value);
                    if (match) setSelectedRole(match);
                  }}
                >
                  {roles.map((r) => (
                    <DropdownMenuRadioItem key={r} value={r}>
                      {r}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              asChild
              size="icon"
              className="rounded-full"
              aria-label={`Configure ${role} interview`}
            >
              <Link href={`/interviews/new?role=${encodeURIComponent(role)}`}>
                <ArrowUp />
              </Link>
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {roles
              .filter((r) => r !== role)
              .map((r) => (
                <Button
                  key={r}
                  variant="outline"
                  size="xs"
                  className="rounded-full border-border font-normal text-muted-foreground"
                  asChild
                >
                  <Link href={`/interviews/new?role=${encodeURIComponent(r)}`}>
                    {r}
                  </Link>
                </Button>
              ))}
            <Button
              asChild
              variant="outline"
              size="xs"
              className="rounded-full border-border font-normal text-muted-foreground"
            >
              <Link href="/interviews/new">Custom setup</Link>
            </Button>
          </div>
        </section>
        <section className="mt-14 sm:mt-16" aria-labelledby="recent-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="recent-title"
              className="text-sm font-normal tracking-normal text-muted-foreground"
            >
              Recent interviews
            </h2>
            <Button
              asChild
              variant="link"
              size="xs"
              className="font-normal text-muted-foreground"
            >
              <Link href="/history">
                View all
                <ArrowRight />
              </Link>
            </Button>
          </div>
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
            <ErrorState
              message={query.error.message}
              retry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          ) : query.data?.length ? (
            <InterviewRows interviews={query.data.slice(0, 3)} compact />
          ) : (
            <p className="border-t py-5 text-sm text-muted-foreground">
              No interviews yet.
            </p>
          )}
        </section>
      </div>
    </Workspace>
  );
}
