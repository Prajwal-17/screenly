import { Workspace } from "@/components/workspace";
import { PracticeMemory } from "@/components/practice-memory";
export default function Page() {
  return (
    <Workspace>
      <div className="max-w-3xl">
        <PracticeMemory />
      </div>
    </Workspace>
  );
}
