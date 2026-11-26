"use client";

import { useState } from "react";
import { RiAddLine, RiCloseLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Chip } from "@/components/base/badges/chip";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
} from "@/components/base/drawer/drawer";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/base/segmented-control/segmented-control";
import type { ProfilePreferencesInput } from "@/lib/validations/profile";

type PreferencesDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: ProfilePreferencesInput;
  onSaved: (updated: ProfilePreferencesInput) => void;
};

const QUICK_LOCATIONS = ["Remote", "United States", "Europe", "United Kingdom"];

function PreferencesDrawerForm({
  preferences,
  onSaved,
  close,
}: {
  preferences: ProfilePreferencesInput;
  onSaved: (updated: ProfilePreferencesInput) => void;
  close: () => void;
}) {
  const [draft, setDraft] = useState<ProfilePreferencesInput>(preferences);
  const [locationInput, setLocationInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [salaryInput, setSalaryInput] = useState(
    preferences.minSalary !== null ? String(preferences.minSalary) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLocation = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    setDraft((prev) => ({
      ...prev,
      preferredLocations: prev.preferredLocations.includes(clean)
        ? prev.preferredLocations
        : [...prev.preferredLocations, clean].slice(0, 10),
    }));
    setLocationInput("");
  };

  const removeLocation = (target: string) => {
    setDraft((prev) => ({
      ...prev,
      preferredLocations: prev.preferredLocations.filter((loc) => loc !== target),
    }));
  };

  const addTitle = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    setDraft((prev) => ({
      ...prev,
      targetTitles: prev.targetTitles.includes(clean)
        ? prev.targetTitles
        : [...prev.targetTitles, clean].slice(0, 10),
    }));
    setTitleInput("");
  };

  const removeTitle = (target: string) => {
    setDraft((prev) => ({
      ...prev,
      targetTitles: prev.targetTitles.filter((title) => title !== target),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const trimmedSalary = salaryInput.trim();
    let parsedSalary: number | null = null;
    if (trimmedSalary !== "") {
      const numeric = Number(trimmedSalary);
      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 2_000_000) {
        setError("Enter a whole number salary between 0 and 2,000,000, or leave blank.");
        setSaving(false);
        return;
      }
      parsedSalary = numeric;
    }

    const payload: ProfilePreferencesInput = {
      ...draft,
      minSalary: parsedSalary,
    };

    try {
      const response = await fetch("/api/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const errData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errData?.error ?? "Could not save preferences.");
      }
      const data = (await response.json()) as { preferences: ProfilePreferencesInput };
      onSaved(data.preferences);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DrawerHeader
        title="Job preferences"
        description="Customize location, arrangement, and target roles for your ranked feed."
      />
      <DrawerBody className="space-y-6">
        <div>
          <p className="text-body-2-medium text-text-primary">Work arrangement</p>
          <SegmentedControl
            aria-label="Work arrangement preference"
            selectedKeys={[draft.remotePreference]}
            onSelectionChange={(keys) => {
              const selected = [...keys][0] as ProfilePreferencesInput["remotePreference"] | undefined;
              if (selected) {
                setDraft((prev) => ({ ...prev, remotePreference: selected }));
              }
            }}
            className="mt-2 w-full"
          >
            <SegmentedControlItem id="ANY" className="min-h-9 flex-1">Any</SegmentedControlItem>
            <SegmentedControlItem id="REMOTE_ONLY" className="min-h-9 flex-1">Remote</SegmentedControlItem>
            <SegmentedControlItem id="HYBRID" className="min-h-9 flex-1">Hybrid</SegmentedControlItem>
            <SegmentedControlItem id="ONSITE" className="min-h-9 flex-1">On-site</SegmentedControlItem>
          </SegmentedControl>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-body-2-medium text-text-primary">Preferred locations</p>
            {draft.preferredLocations.length > 0 && (
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, preferredLocations: [] }))}
                className="text-caption-1-semibold text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
              >
                Clear all (Anywhere)
              </button>
            )}
          </div>
          <p className="mt-1 text-caption-1-regular text-text-secondary">
            Leave empty to match all remote or global listings.
          </p>
          <div className="mt-2 flex items-end gap-2">
            <Input
              label="Add location"
              placeholder="e.g. Remote, London, Lagos"
              value={locationInput}
              onChange={setLocationInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLocation(locationInput);
                }
              }}
              fieldClassName="min-h-11"
            />
            <Button
              type="button"
              variant="secondary"
              leadingIcon={RiAddLine}
              className="min-h-11"
              onClick={() => addLocation(locationInput)}
            >
              Add
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_LOCATIONS.filter((loc) => !draft.preferredLocations.includes(loc)).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => addLocation(loc)}
                className="rounded-full border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-1-regular text-text-secondary transition-colors hover:text-text-primary"
              >
                + {loc}
              </button>
            ))}
          </div>
          {draft.preferredLocations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.preferredLocations.map((loc) => (
                <Chip key={loc} variant="caption" color="soft" className="gap-1.5 pe-1.5">
                  <span>{loc}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${loc}`}
                    onClick={() => removeLocation(loc)}
                    className="inline-flex size-5 items-center justify-center rounded-full hover:bg-background-tertiary-default"
                  >
                    <RiCloseLine className="size-3.5" />
                  </button>
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-body-2-medium text-text-primary">Target roles</p>
          <p className="mt-1 text-caption-1-regular text-text-secondary">
            Matching titles receive a +5% boost in Resume similarity ranking.
          </p>
          <div className="mt-2 flex items-end gap-2">
            <Input
              label="Add target title"
              placeholder="e.g. Frontend Engineer"
              value={titleInput}
              onChange={setTitleInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTitle(titleInput);
                }
              }}
              fieldClassName="min-h-11"
            />
            <Button
              type="button"
              variant="secondary"
              leadingIcon={RiAddLine}
              className="min-h-11"
              onClick={() => addTitle(titleInput)}
            >
              Add
            </Button>
          </div>
          {draft.targetTitles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.targetTitles.map((title) => (
                <Chip key={title} variant="caption" color="soft" className="gap-1.5 pe-1.5">
                  <span>{title}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${title}`}
                    onClick={() => removeTitle(title)}
                    className="inline-flex size-5 items-center justify-center rounded-full hover:bg-background-tertiary-default"
                  >
                    <RiCloseLine className="size-3.5" />
                  </button>
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div>
          <Input
            label="Minimum annual salary (USD)"
            placeholder="Leave blank for any"
            inputMode="numeric"
            value={salaryInput}
            onChange={setSalaryInput}
            fieldClassName="min-h-11"
          />
        </div>

        {error && (
          <p role="alert" className="text-body-2-regular text-text-error-primary">
            {error}
          </p>
        )}
      </DrawerBody>
      <DrawerFooter>
        <Button variant="secondary" className="min-h-11" onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          className="min-h-11"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save & Apply"}
        </Button>
      </DrawerFooter>
    </>
  );
}

export function PreferencesDrawer({
  isOpen,
  onOpenChange,
  preferences,
  onSaved,
}: PreferencesDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="end"
      size="md"
      overlayClassName="fixed inset-0 h-dvh z-50"
    >
      {({ close }) =>
        isOpen ? (
          <PreferencesDrawerForm
            key={JSON.stringify(preferences)}
            preferences={preferences}
            onSaved={onSaved}
            close={close}
          />
        ) : null
      }
    </Drawer>
  );
}
