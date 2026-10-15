import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/workspace";
export default function Home() {
  return (
    <div className="landing">
      <nav className="landing-nav" aria-label="Main navigation">
        <Brand />
        <Link href="/auth/sign-in" className="button ghost">
          Sign in <ArrowRight size={16} />
        </Link>
      </nav>
      <main className="landing-hero">
        <section className="landing-copy">
          <span className="eyebrow">Technical interview practice</span>
          <h1>
            Good answers
            <br />
            take <em>practice.</em>
          </h1>
          <p>
            Practice technical interviews with questions that follow your
            thinking and feedback grounded in your answers.
          </p>
          <Link href="/interviews/new" className="button">
            Start practicing <ArrowRight size={17} />
          </Link>
        </section>
        <section className="preview" aria-label="Example interview">
          <div className="between">
            <span className="eyebrow">Frontend · React</span>
            <span className="tag">Example</span>
          </div>
          <div className="preview-question">
            <span className="eyebrow accent">Interviewer</span>
            <h2>When would you reach for server-side rendering?</h2>
          </div>
          <div className="preview-answer">
            <span className="eyebrow">Candidate</span>
            <p>
              I’d start with what the page needs: discoverability, fresh data,
              and how quickly users need to interact.
            </p>
          </div>
          <div className="preview-followup">
            <span className="eyebrow accent">Follow-up</span>
            <p>
              How would you handle a page with both static content and
              personalized data?
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
