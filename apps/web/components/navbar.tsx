"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { Brain } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-14 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Brain className="h-6 w-6" />
          <span className="font-bold">AI Interviewer</span>
        </Link>

        <div className="flex items-center space-x-4">
          {!isPending &&
            (session ? (
              <Button variant="outline" onClick={handleSignOut}>
                Log out
              </Button>
            ) : (
              <Button asChild>
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
            ))}
        </div>
      </div>
    </nav>
  );
}
