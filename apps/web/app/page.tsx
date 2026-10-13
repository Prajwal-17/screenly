import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  AudioLines,
  ScanLine,
  Check,
} from "lucide-react";
import { Brand } from "@/components/workspace";
import { Wave } from "@/components/common";
export default function Home() {
  return (
    <div className="landing">
      <nav className="landing-nav" aria-label="Main navigation">
        <Brand />
        <div className="landing-nav-links">
          <a href="#how-it-works">How it works</a>
          <Link href="/auth/sign-in">Sign in</Link>
          <Link href="/interviews/new" className="button">
            Start practicing <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>
      <main>
        <section className="landing-hero">
          <div>
            <span className="tag green">
              <Sparkles size={12} />A better way to prepare
            </span>
            <h1>
              Find your voice.
              <br />
              Find your
              <br />
              <em>next level.</em>
            </h1>
            <p>
              Technical interviews are a conversation. Practice with an AI that
              listens, asks better questions, and helps you see what comes next.
            </p>
            <Link
              href="/interviews/new"
              className="button"
              style={{ padding: "14px 23px" }}
            >
              Start your first interview <ArrowRight size={17} />
            </Link>
            <div className="landing-meta">
              <span className="row" style={{ gap: 5 }}>
                <Check size={12} />
                Your pace, your topics
              </span>
              <span className="row" style={{ gap: 5 }}>
                <Check size={12} />
                Clear, actionable feedback
              </span>
            </div>
          </div>
          <div
            className="surface preview"
            aria-label="Illustrative interview preview"
          >
            <div className="between">
              <span className="eyebrow">Inside a conversation</span>
              <span className="tag">Preview</span>
            </div>
            <div className="voice-orb">
              <Wave />
            </div>
            <div className="eyebrow accent" style={{ textAlign: "center" }}>
              One thoughtful question at a time
            </div>
            <div className="preview-question">
              “You mentioned caching. How would you handle data that changes
              frequently?”
            </div>
            <div className="preview-answer">
              <div className="eyebrow">Example candidate answer</div>
              <p>
                “I’d start with the freshness requirements, then choose between
                time-based expiry and event-driven invalidation…”
              </p>
            </div>
            <div
              className="between"
              style={{ marginTop: 20, fontSize: 11, color: "var(--subtle)" }}
            >
              <span className="row">
                <span className="dot" />
                Questions that follow your thinking
              </span>
              <AudioLines size={17} />
            </div>
          </div>
        </section>
        <section id="how-it-works" className="landing-features">
          <div className="landing-feature">
            <AudioLines size={23} />
            <h3>A real back-and-forth</h3>
            <p>
              Speak naturally. The interviewer listens, follows your answers,
              and explores the ideas that matter.
            </p>
          </div>
          <div className="landing-feature">
            <ScanLine size={23} />
            <h3>Practice with intention</h3>
            <p>
              Choose your role, experience level, and focus areas. Make every
              session relevant to your next opportunity.
            </p>
          </div>
          <div className="landing-feature">
            <Sparkles size={23} />
            <h3>Know your next step</h3>
            <p>
              Get specific feedback grounded in your answers, then return to
              your history as you keep improving.
            </p>
          </div>
        </section>
        <section className="landing-bottom">
          <div className="eyebrow accent" style={{ marginBottom: 15 }}>
            Progress starts with practice
          </div>
          <h2>Your next interview can feel different.</h2>
          <p>Give yourself a little space to get better.</p>
          <Link href="/interviews/new" className="button">
            Let’s have a conversation <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="footer">
        <span>Forma — thoughtful interview practice.</span>
        <span>Built for learning. Made for your next step.</span>
      </footer>
    </div>
  );
}
