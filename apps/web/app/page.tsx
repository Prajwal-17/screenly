import type { Metadata } from "next";
import { Wordmark } from "@/components/wordmark";
import { SignInActions } from "@/components/auth/sign-in-actions";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: { absolute: "Screenly · Technical interviews, practiced out loud" },
  description:
    "Technical interview practice with an AI interviewer that follows your reasoning. Revisit your conversation with feedback grounded in what you said.",
};

export default function Home() {
  return (
    <div className={styles.landing}>
      <a
        href="#main"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0"
      >
        Skip to content
      </a>
      <main id="main" tabIndex={-1} className={styles.screen}>
        <section className={styles.intro} aria-label="About Screenly">
          <header>
            <Wordmark className={styles.brand} />
          </header>
          <div className={styles.copy}>
            <h1 className="type-landing-title">
              Technical interviews.
              <br />
              <span className="text-primary">Practiced out loud.</span>
            </h1>
            <p className="text-ink-secondary">
              An AI interviewer that follows your reasoning. Practice for your
              engineering role, then revisit the conversation with feedback
              grounded in what you said.
            </p>
          </div>
        </section>
        <aside className={styles.authSide} aria-labelledby="entry-title">
          <div className={styles.auth}>
            <h2 id="entry-title" className="type-page-title">
              Get started
            </h2>
            <p className="mt-3 mb-7 type-ui text-muted-foreground">
              Sign in to your practice workspace.
            </p>
            <SignInActions />
          </div>
        </aside>
      </main>
    </div>
  );
}
