import { Workspace } from "@/components/workspace";
import { ProfileSummary } from "@/components/profile-summary";
import { ProfileTheme } from "@/components/profile-theme";

export default function Page() {
  return (
    <ProfileTheme>
      <Workspace>
        <ProfileSummary />
      </Workspace>
    </ProfileTheme>
  );
}
