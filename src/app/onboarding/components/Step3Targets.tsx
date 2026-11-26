"use client";

import { useState } from "react";
import { RiArrowLeftLine, RiArrowRightLine, RiCheckLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Dropdown, DropdownPopover, DropdownTrigger } from "@/components/base/dropdown/dropdown";
import { ScrollFade, useScrollFade } from "@/components/foundations/scroll-fade/scroll-fade";
import { cx } from "@/utils/cx";
import { useRoleSuggestions } from "@/features/onboarding/useRoleSuggestions";
import { RoleCatalogSearch } from "./RoleCatalogSearch";
import { step3TargetsSchema, type Step3TargetsInput, type WorkArrangement, type SeniorityLevel } from "@/lib/validations/onboarding";
import type { ResumeParsedData } from "@/lib/validations/resume";
import { normalizeRoleTitle, parseRoleChoices } from "@/services/matching/roleText";
import type { RoleSuggestion } from "@/lib/validations/roleCatalog";

function RoleReasons({ suggestions }: { suggestions: RoleSuggestion[] }) {
  const fade = useScrollFade();
  return <><h3 className="px-2 py-2 text-body-medium">Why these roles?</h3><div className="relative min-h-0"><ul className="max-h-64 space-y-3 overflow-y-auto px-2 pb-2" onScroll={fade.onScroll} tabIndex={0} aria-label="Role suggestion reasons">{suggestions.map((role) => <li key={role.title}><p className="text-body-2-medium">{role.title}</p><p className="mt-1 text-body-2-regular text-text-secondary">{role.reason}</p>{Boolean(role.missingSkills?.length) && <p className="mt-1 text-caption-1-regular text-text-tertiary">Role requirements to review: {role.missingSkills!.join(", ")}</p>}</li>)}</ul><ScrollFade progress={fade.progress} /></div></>;
}

interface Step3TargetsProps {
  initialData?: Partial<Step3TargetsInput>;
  parsedResume?: ResumeParsedData;
  verifiedSkills?: string[];
  onBack: () => void;
  onComplete: (data: Step3TargetsInput) => void;
}
const tiers: { id: SeniorityLevel; label: string }[] = [
  { id: "ENTRY", label: "Entry" }, { id: "MID", label: "Mid-level" }, { id: "SENIOR", label: "Senior" },
  { id: "LEAD", label: "Lead / Staff" }, { id: "EXECUTIVE", label: "Executive" },
];
const arrangements: { id: WorkArrangement; label: string }[] = [
  { id: "REMOTE", label: "Remote" }, { id: "HYBRID", label: "Hybrid" }, { id: "ONSITE", label: "On-site" },
];
const split = (value: string) => [...new Set(value.split(",").map((s) => s.trim()).filter(Boolean))];

export function Step3Targets({ initialData, parsedResume, verifiedSkills = [], onBack, onComplete }: Step3TargetsProps) {
  const [titles, setTitles] = useState(initialData?.targetTitles?.join("; ") ?? "");
  const [locations, setLocations] = useState(initialData?.preferredLocations?.join(", ") ?? "");
  const [workArrangement, setWorkArrangement] = useState<WorkArrangement | undefined>(initialData?.workArrangement);
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel | undefined>(initialData?.seniorityLevel);
  const [salary, setSalary] = useState(String(initialData?.minSalary ?? 0));
  const [error, setError] = useState<string | null>(null);
  const { state: roleState, retry: retrySuggestions } = useRoleSuggestions(parsedResume, verifiedSkills);
  const [expanded, setExpanded] = useState(false);
  const allSuggestions = roleState.status === "ready" ? roleState.suggestions : [];
  const suggestions = (["aligned", "transferable"] as const).flatMap((kind) => allSuggestions.filter((role) => role.kind === kind).slice(0, expanded ? 20 : 3));
  const selected = parseRoleChoices(titles);
  const selectedKeys = new Set(selected.map(normalizeRoleTitle));
  const visibleKeys = new Set(suggestions.map((role) => normalizeRoleTitle(role.title)));
  const otherSelected = selected.filter((title) => !visibleKeys.has(normalizeRoleTitle(title)));
  function addRole(title: string) {
    if (selectedKeys.has(normalizeRoleTitle(title))) return;
    if (selected.length >= 20) { setError("Choose up to 20 roles. Remove one before adding another."); return; }
    setTitles([...selected, title].join("; ")); setError(null);
  }
  function toggleRole(title: string) {
    const key = normalizeRoleTitle(title);
    if (!selectedKeys.has(key) && selected.length >= 20) { setError("Choose up to 20 roles. Remove one before adding another."); return; }
    setTitles((selectedKeys.has(key) ? selected.filter((item) => normalizeRoleTitle(item) !== key) : [...selected, title]).join("; "));
    setError(null);
  }
  function next() {
    const parsed = step3TargetsSchema.safeParse({ targetTitles: selected, preferredLocations: split(locations),
      workArrangement, seniorityLevel, minSalary: salary.trim() ? Number(salary) : 0 });
    if (!parsed.success) { setError("Add a target title, choose a work arrangement and seniority, and enter a valid non-negative salary."); return; }
    setError(null); onComplete(parsed.data);
  }
  return <div className="space-y-6 text-text-primary">
    <div className="text-center"><h1 className="text-title-1-medium">Where would you like to go next?</h1><p className="mt-3 text-body-regular text-text-secondary">Pick roles that interest you, then set your preferences.</p></div>
    <div className="space-y-6 rounded-3xl border border-border-button-default bg-background-primary-default p-6 sm:p-8">
      <section aria-labelledby="suggested-roles-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="suggested-roles-heading" className="text-headline-medium">Target roles <span role="status" className="ms-2 text-body-2-regular text-text-tertiary">{selected.length ? selected.length + " selected" : "Choose your roles"}</span></h2>{suggestions.length > 0 && <Dropdown><DropdownTrigger className="min-h-11 rounded-lg px-2 text-body-2-medium text-text-secondary hover:bg-background-secondary-hover">Why suggested?</DropdownTrigger><DropdownPopover aria-label="Why these roles were suggested" placement="bottom end" className="w-80 overflow-visible"><RoleReasons suggestions={suggestions} /></DropdownPopover></Dropdown>}</div>
        {roleState.status === "loading" && <div role="status" className="flex flex-wrap gap-2">{[0,1,2].map((i) => <span key={i} className="h-11 w-28 rounded-full bg-background-secondary-default motion-safe:animate-pulse" aria-hidden="true" />)}<span className="sr-only">Loading role suggestions</span></div>}
        {roleState.status === "error" && <div role="alert" className="flex flex-wrap items-center gap-2"><p className="text-body-2-regular text-text-secondary">{roleState.message}</p><Button variant="ghost" size="small" className="min-h-11" onClick={retrySuggestions}>Retry suggestions</Button></div>}
        {suggestions.length > 0 ? <div className="space-y-3">{(["aligned", "transferable"] as const).map((kind) => {
          const group = suggestions.filter((role) => role.kind === kind);
          if (!group.length) return null;
          return <div key={kind} role="group" aria-label={kind === "aligned" ? "Closely aligned roles" : "Transferable skill roles"} className="space-y-2"><p className="text-caption-1-medium text-text-secondary">{kind === "aligned" ? "Closely aligned" : "Transferable skills"}</p><div className="flex flex-wrap gap-2">{group.map((role) => {
            const isSelected = selectedKeys.has(normalizeRoleTitle(role.title));
            return <Button key={role.title} size="small" variant={isSelected ? "primary" : "secondary"} leadingIcon={isSelected ? RiCheckLine : undefined} aria-pressed={isSelected} aria-label={(isSelected ? "Remove " : "Select ") + role.title} className="h-auto min-h-11 max-w-full whitespace-normal rounded-full px-3 py-2 text-start text-body-2-medium [&>span]:block [&>span]:min-w-0 [&>span]:shrink [&>span]:whitespace-normal [&>span]:break-words" onClick={() => toggleRole(role.title)}>{role.title}</Button>;
          })}</div></div>;
        })}</div> : roleState.status === "ready" ? <div className="flex flex-wrap items-center gap-2"><p className="text-body-2-regular text-text-secondary">Search the catalog below, or review your skills for suggestions.</p><Button variant="ghost" size="small" className="min-h-11" onClick={onBack}>Review skills</Button></div> : null}
        {allSuggestions.length > suggestions.length || expanded ? <Button variant="ghost" size="small" className="min-h-11" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? "Fewer suggestions" : "More suggestions"}</Button> : null}
        <RoleCatalogSearch selected={selected} selectedIds={allSuggestions.filter((role) => selectedKeys.has(normalizeRoleTitle(role.title)) && role.occupationId).map((role) => role.occupationId!)} onAdd={addRole} />
        {otherSelected.length > 0 && <div role="group" aria-label="Other selected roles" className="flex flex-wrap gap-2">{otherSelected.map((title) => <Button key={title} size="small" variant="primary" leadingIcon={RiCheckLine} aria-label={"Remove " + title} className="h-auto min-h-11 max-w-full whitespace-normal rounded-full px-3 py-2 text-start text-body-2-medium [&>span]:block [&>span]:min-w-0 [&>span]:shrink [&>span]:whitespace-normal [&>span]:break-words" onClick={() => toggleRole(title)}>{title}</Button>)}</div>}
        <p className="text-caption-1-regular text-text-tertiary">This service uses the <a href="https://esco.ec.europa.eu/" target="_blank" rel="noopener noreferrer" className="underline focus-visible:ring-2 focus-visible:ring-border-focus-ring">ESCO classification</a> of the European Commission.</p>
      </section>
      <fieldset className="space-y-3"><legend className="text-body-medium">Work arrangement</legend><div className="flex flex-wrap gap-2">{arrangements.map((item) => <Button key={item.id} variant={workArrangement === item.id ? "primary" : "secondary"} aria-pressed={workArrangement === item.id} className="min-h-11" onClick={() => setWorkArrangement(item.id)}>{item.label}</Button>)}</div></fieldset>
      <Input label="Preferred locations (optional)" value={locations} onChange={setLocations} placeholder="e.g. Lagos, London" hint="Separate locations with commas. Leave blank if you have no location preference." fieldClassName="min-h-11" />
      <fieldset className="space-y-3"><legend className="text-body-medium">Target seniority</legend><div className="flex flex-wrap gap-2">{tiers.map((tier) => <Button key={tier.id} variant={seniorityLevel === tier.id ? "primary" : "secondary"} aria-pressed={seniorityLevel === tier.id} className="min-h-11" onClick={() => setSeniorityLevel(tier.id)}>{tier.label}</Button>)}</div></fieldset>
      <Input label="Minimum annual salary (USD)" value={salary} onChange={setSalary} inputMode="numeric" hint="Use 0 for no minimum. Listings without salary information are not a confirmed salary match." fieldClassName="min-h-11" />
      {error && <p role="alert" className="text-body-regular text-text-error-primary">{error}</p>}
      <div className={cx("flex flex-wrap justify-between gap-3 border-t border-separator-border pt-5")}><Button variant="secondary" leadingIcon={RiArrowLeftLine} className="min-h-11" onClick={onBack}>Back</Button><Button trailingIcon={RiArrowRightLine} className="min-h-11" onClick={next}>Preview opportunities</Button></div>
    </div>
  </div>;
}
