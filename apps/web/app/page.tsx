import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/workspace";
import { Eyebrow } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
export default function Home() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 md:px-10 xl:px-16">
      <nav
        className="flex h-24 items-center justify-between border-b"
        aria-label="Main navigation"
      >
        <Brand />
        <Button asChild variant="outline">
          <Link href="/auth/sign-in">
            Sign in <ArrowRight />
          </Link>
        </Button>
      </nav>
      <main className="grid min-h-[calc(100dvh-6rem)] items-center gap-10 py-16 md:grid-cols-[1.15fr_1fr] xl:gap-20">
        <section>
          <Eyebrow>Technical interview practice</Eyebrow>
          <h1 className="my-6 text-4xl leading-[1.2] tracking-[-0.015em] sm:text-[44px]">
            Good answers take{" "}
            <em className="font-medium text-primary not-italic">practice.</em>
          </h1>
          <p className="mb-8 max-w-[420px] text-base leading-[1.7] text-muted-foreground">
            Practice technical interviews with questions that follow your
            thinking and feedback grounded in your answers.
          </p>
          <Button asChild size="lg">
            <Link href="/interviews/new">
              Start practicing <ArrowRight />
            </Link>
          </Button>
        </section>
        <Card className="gap-0 py-8" aria-label="Example interview">
          <CardContent className="px-8">
            <div className="flex items-center justify-between gap-4">
              <Eyebrow>Frontend · React</Eyebrow>
              <Badge variant="outline">Example</Badge>
            </div>
            <div className="pt-10 pb-8">
              <Eyebrow className="text-primary">Interviewer</Eyebrow>
              <h2 className="mt-3 text-2xl leading-[1.4] lg:text-[28px]">
                When would you reach for server-side rendering?
              </h2>
            </div>
            <div className="rounded-md bg-muted p-6">
              <Eyebrow>Candidate</Eyebrow>
              <p className="mt-3 leading-[1.7]">
                I’d start with what the page needs: discoverability, fresh data,
                and how quickly users need to interact.
              </p>
            </div>
            <div className="pt-7">
              <Eyebrow className="text-primary">Follow-up</Eyebrow>
              <p className="mt-3 leading-[1.7]">
                How would you handle a page with both static content and
                personalized data?
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
