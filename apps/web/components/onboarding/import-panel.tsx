"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, FileText, Link2, Loader2, X } from "lucide-react";
import {
  profileURLIssue,
  type ProfileImport,
  type ProfileImportStage,
} from "@repo/shared";
import { api } from "@/lib/api";
import { profileApi, ProfileImportFailure } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { InlineAlert } from "@/components/common";
import { cn } from "@/lib/utils";

const stages = [
  { id: "uploading", label: "Receiving your source" },
  { id: "extracting", label: "Extracting readable text" },
  { id: "analyzing", label: "Organizing your profile with AI" },
];
export function ImportPanel({
  onResult,
  onBusy,
  ready = true,
  compact = false,
}: {
  onResult: (result: ProfileImport) => void;
  onBusy: (busy: boolean) => void;
  ready?: boolean;
  compact?: boolean;
}) {
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
  });
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [sourceTab, setSourceTab] = useState("resume");
  const [urlError, setUrlError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ProfileImportStage>("uploading");
  const [filename, setFilename] = useState("");
  const [extracted, setExtracted] = useState("");
  const [showText, setShowText] = useState(false);
  const [dragging, setDragging] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const last = useRef<File | { url?: string; text?: string } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  function cancel() {
    const current = abort.current;
    abort.current = null;
    current?.abort();
    setBusy(false);
    onBusy(false);
  }
  async function start(input: File | { url?: string; text?: string }) {
    if (abort.current || !ready) return;
    if (!(input instanceof File) && input.url) {
      const issue = profileURLIssue(input.url);
      if (issue) {
        setUrlError(issue);
        return;
      }
    }
    if (
      input instanceof File &&
      (!/\.(pdf|docx?|txt)$/i.test(input.name) ||
        !input.size ||
        input.size > 5 * 1024 * 1024)
    ) {
      setError("Choose a PDF, DOCX, DOC, or TXT resume up to 5 MB.");
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    last.current = input;
    setBusy(true);
    onBusy(true);
    setError("");
    setUrlError("");
    setExtracted("");
    setStage("uploading");
    setFilename(input instanceof File ? input.name : "Your profile");
    try {
      const result = await profileApi.import(
        input,
        AbortSignal.any([controller.signal, AbortSignal.timeout(100000)]),
        (next) => {
          if (mounted.current && abort.current === controller) setStage(next);
        },
      );
      if (
        mounted.current &&
        abort.current === controller &&
        !controller.signal.aborted
      ) {
        setBusy(false);
        onBusy(false);
        onResult(result);
      }
    } catch (cause) {
      if (
        mounted.current &&
        abort.current === controller &&
        !controller.signal.aborted
      ) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Import failed. Retry or enter your details manually.",
        );
        if (cause instanceof ProfileImportFailure)
          setExtracted(cause.extractedText);
      }
    } finally {
      if (mounted.current && abort.current === controller) {
        abort.current = null;
        setBusy(false);
        onBusy(false);
      }
    }
  }
  const available = ready && !!capabilities.data?.llm;
  if (busy)
    return (
      <div className="py-4" aria-busy="true">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
            <FileText className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{filename}</p>
          </div>
        </div>
        <ol className="space-y-6" aria-label="Import progress">
          {stages.map((item, index) => {
            const current = stages.findIndex((x) => x.id === stage);
            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 text-sm ${index > current ? "text-muted-foreground" : "text-foreground"}`}
              >
                {index < current ? (
                  <Check className="size-5 text-link" aria-hidden="true" />
                ) : index === current ? (
                  <Loader2
                    className="size-5 animate-spin motion-reduce:animate-none text-link"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="size-5 rounded-full border" />
                )}
                <span role={index === current ? "status" : undefined}>
                  {item.label}
                  {index === current ? "…" : ""}
                </span>
              </li>
            );
          })}
        </ol>

        <Button variant="ghost" className="-ml-3 mt-3" onClick={cancel}>
          <X aria-hidden="true" />
          Cancel import
        </Button>
      </div>
    );
  return (
    <div className="space-y-5">
      {error && (
        <div className="space-y-2">
          <InlineAlert>{error}</InlineAlert>
          <div className="flex flex-wrap gap-2">
            {last.current && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void start(last.current!)}
              >
                Retry analysis
              </Button>
            )}
            {extracted && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowText(true)}
              >
                View extracted text
              </Button>
            )}
          </div>
        </div>
      )}
      {capabilities.isError ? (
        <InlineAlert
          action={
            <Button
              variant="outline"
              size="sm"
              loading={capabilities.isFetching}
              loadingLabel="Checking availability…"
              onClick={() => void capabilities.refetch()}
            >
              Retry
            </Button>
          }
        >
          Could not check AI availability. You can still enter your details
          manually.
        </InlineAlert>
      ) : capabilities.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Checking import availability…
        </p>
      ) : ready && !available ? (
        <p role="status" className="text-sm text-muted-foreground">
          AI import is unavailable. You can enter your details manually.
        </p>
      ) : null}
      <Tabs value={sourceTab} onValueChange={setSourceTab}>
        <TabsList className={compact ? "mb-2" : "w-full"}>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="link">Profile link</TabsTrigger>
          <TabsTrigger value="text">Paste text</TabsTrigger>
        </TabsList>
        <TabsContent value="resume">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (available && event.dataTransfer.files[0])
                void start(event.dataTransfer.files[0]);
            }}
            className={dragging ? "rounded-lg bg-accent" : ""}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              aria-label="Upload resume"
              className="sr-only"
              tabIndex={-1}
              disabled={!available}
              onChange={(event) => {
                if (event.target.files?.[0]) void start(event.target.files[0]);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="default"
              className="min-h-14 w-full justify-start gap-3 px-4 text-base"
              disabled={!available}
              onClick={() => fileInput.current?.click()}
            >
              <FileText className="size-4" aria-hidden="true" />
              Import resume
              <ArrowRight className="ml-auto size-4" aria-hidden="true" />
            </Button>
            <p className="mt-2 type-caption text-muted-foreground">
              PDF, DOCX, DOC or TXT · Up to 5 MB
            </p>
          </div>
        </TabsContent>
        <TabsContent value="link">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void start({ url });
            }}
            className="space-y-4 py-2"
          >
            <Label htmlFor="source-url">Your profile or portfolio URL</Label>
            <Input
              id="source-url"
              placeholder="https://your-portfolio.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError("");
              }}
              onBlur={() => {
                if (url.trim()) setUrlError(profileURLIssue(url) ?? "");
              }}
              maxLength={2048}
              aria-invalid={!!urlError}
              aria-describedby={
                urlError ? "source-url-error" : "source-url-hint"
              }
            />
            {urlError ? (
              <p
                id="source-url-error"
                role="alert"
                className="text-sm text-destructive-text"
              >
                {urlError}
              </p>
            ) : (
              <p id="source-url-hint" className="text-xs text-muted-foreground">
                Personal websites, GitHub profiles, or public LinkedIn profiles.
                Login-only pages need a resume instead.
              </p>
            )}
            <Button
              type="submit"
              variant="secondary"
              disabled={!available || !url.trim()}
            >
              Analyze profile
              <Link2 aria-hidden="true" />
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="text">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void start({ text });
            }}
            className="space-y-4"
          >
            <Label htmlFor="source-text">Resume or profile text</Label>
            <Textarea
              id="source-text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={30000}
              placeholder="Paste your background, skills, and projects…"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                40–30,000 characters
              </p>
              <Button
                type="submit"
                variant="secondary"
                disabled={!available || text.trim().length < 40}
              >
                Analyze text
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Your source is sent to the configured AI provider. The original file or
        text isn’t stored.
      </p>
      <Dialog
        open={showText}
        onOpenChange={setShowText}
        title="Extracted resume text"
        description="Text extracted from your source. This isn’t stored."
        className={cn("profile-surface max-w-[720px]")}
      >
        <pre className="whitespace-pre-wrap break-words px-5 pb-5 font-sans text-sm leading-relaxed">
          {extracted}
        </pre>
      </Dialog>
    </div>
  );
}
