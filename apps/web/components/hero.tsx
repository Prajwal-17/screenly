import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="flex flex-col items-center justify-center text-center pt-32 pb-16 px-4">
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
          Adaptive AI Interview Practice
        </h1>
        <p className="text-xl text-muted-foreground md:px-12">
          Practice realistic technical interviews with personalized feedback,
          long-term progress tracking, and AI-powered evaluations.
        </p>
        <div className="pt-8 flex justify-center">
          <Button asChild size="lg" className="rounded-full px-8 h-12">
            <Link href="/session">
              Start Interview Session <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
