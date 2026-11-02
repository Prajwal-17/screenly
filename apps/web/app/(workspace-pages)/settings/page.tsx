"use client";
import { useEffect, useState } from "react";
import { Workspace } from "@/components/workspace";
import { InlineAlert } from "@/components/common";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  appearanceSelectionEnabled,
  useAppearance,
  type Appearance,
} from "@/components/appearance";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FeaturePreview } from "@/components/feature-preview";
import {
  playbackRates,
  preferredPlaybackRate,
  savePlaybackRate,
} from "@/lib/audio/playback-rates";
export default function Settings() {
  const { data: session } = authClient.useSession();
  const [rate, setRate] = useState<number>(1);
  const [preferenceError, setPreferenceError] = useState(false);
  useEffect(() => {
    setRate(preferredPlaybackRate());
  }, []);
  return (
    <Workspace>
      <div className="max-w-3xl">
        <h2 className="type-page-title">Preferences</h2>
        <p className="mt-2 mb-8 type-ui text-muted-foreground">
          Playback and your account.
        </p>
        {appearanceSelectionEnabled && <AppearanceSettings />}
        <section
          className="grid gap-6 border-b py-7 lg:grid-cols-[200px_minmax(0,1fr)]"
          aria-labelledby="audio-title"
        >
          <div>
            <h2 id="audio-title" className="type-section-title">
              Audio and conversation
            </h2>
            <p className="mt-2 type-caption text-muted-foreground">
              Set a comfortable pace.
            </p>
          </div>
          <div>
            <Label htmlFor="playback-rate">Interviewer playback speed</Label>
            <Select
              value={String(rate)}
              onValueChange={(value) => {
                const next = Number(value);
                setRate(next);
                setPreferenceError(!savePlaybackRate(next));
              }}
            >
              <SelectTrigger id="playback-rate" className="mt-2 min-w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {playbackRates.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}×
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {preferenceError && (
              <InlineAlert className="mt-3">
                This browser could not save your playback preference.
              </InlineAlert>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Pause, replay, microphone and speaker controls are available
              during an interview.
            </p>
          </div>
        </section>
        <section
          className="grid gap-6 border-b py-7 lg:grid-cols-[200px_minmax(0,1fr)]"
          aria-labelledby="account-title"
        >
          <h2 id="account-title" className="type-section-title">
            Account
          </h2>
          <div>
            <p className="type-ui break-all">{session?.user.email}</p>
            <p className="mt-2 type-caption text-muted-foreground">
              Manage your practice context in My profile.
            </p>
          </div>
        </section>
        <div className="flex justify-end pt-5">
          <FeaturePreview feature="reminders" />
        </div>
      </div>
    </Workspace>
  );
}

// Retained for internal use when appearance selection is enabled again.
function AppearanceSettings() {
  const { appearance, setAppearance, saveError } = useAppearance();
  return (
    <section
      className="grid gap-6 border-y py-7 lg:grid-cols-[200px_minmax(0,1fr)]"
      aria-labelledby="appearance-title"
    >
      <div>
        <h3 id="appearance-title" className="type-section-title">
          Appearance
        </h3>
        <p className="mt-2 type-caption text-muted-foreground">
          Choose how Screenly looks on this browser.
        </p>
      </div>
      <div>
        <RadioGroup
          aria-label="Appearance"
          value={appearance}
          onValueChange={(value) => setAppearance(value as Appearance)}
          className="grid-cols-3 gap-2"
        >
          {(
            [
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <RadioGroupItem key={value} value={value} variant="row">
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </RadioGroupItem>
          ))}
        </RadioGroup>
        {saveError && (
          <InlineAlert className="mt-3">
            This browser could not save your appearance preference.
          </InlineAlert>
        )}
      </div>
    </section>
  );
}
