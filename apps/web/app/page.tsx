import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center">
        <Hero />
      </main>
    </div>
  );
}
