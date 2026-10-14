"use client";
import {
  Loader2,
  ArrowRight,
  AudioLines,
  AlertCircle,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import type { Interview } from "@repo/shared";
import { formatDate, interviewLink } from "@/lib/api";
export function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {children}
    </motion.div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Loading({
  label = "Loading your interviews…",
}: {
  label?: string;
}) {
  return (
    <div className="loading" role="status">
      <Loader2 size={19} className="spin" />
      {label}
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="surface empty">
      <div className="empty-icon">
        <AlertCircle size={24} />
      </div>
      <h3>Something needs another try</h3>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState() {
  return (
    <div className="empty">
      <div className="empty-icon">
        <AudioLines size={24} />
      </div>
      <h3>Your first conversation is waiting</h3>
      <p>
        Pick a role and a few topics. We’ll take it one thoughtful question at a
        time.
      </p>
      <Link className="button" href="/interviews/new">
        Start an interview <ArrowRight size={16} />
      </Link>
    </div>
  );
}
export function InterviewRows({
  interviews,
  onDelete,
}: {
  interviews: Interview[];
  onDelete?: (interview: Interview) => void;
}) {
  return (
    <div className="surface" style={{ overflow: "hidden" }}>
      {interviews.length ? (
        interviews.map((item) => (
          <div
            key={item.id}
            className={onDelete ? "interview-row" : "contents"}
          >
            <Link
              className={`table-row ${onDelete ? "with-delete" : ""}`}
              href={interviewLink(item)}
            >
              <div>
                <div className="table-name">{item.role} interview</div>
                <div className="table-topic">
                  {item.topics.slice(0, 3).join(" · ")}
                </div>
              </div>
              <div className="table-level">
                <span className="tag">{item.level}</span>
              </div>
              <div
                className="table-date"
                style={{ fontSize: 11, color: "var(--subtle)" }}
              >
                {formatDate(item.createdAt)}
              </div>
              <div>
                <span
                  className={`tag ${item.status === "completed" ? "green" : "amber"}`}
                >
                  {item.status === "completed"
                    ? item.feedback?.overallScore != null
                      ? `${item.feedback.overallScore}/10`
                      : "Completed"
                    : item.status === "active"
                      ? "Resume"
                      : "Ready"}
                </span>
              </div>
              {!onDelete && <ArrowRight size={15} color="var(--subtle)" />}
            </Link>
            {onDelete && (
              <button
                className="icon-button row-delete"
                aria-label={`Delete ${item.role} interview`}
                onClick={() => onDelete(item)}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
export function Wave({ active = false }: { active?: boolean }) {
  return (
    <div className={`wave ${active ? "active" : ""}`} aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}
