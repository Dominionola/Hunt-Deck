"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { ComboBox, ComboBoxItem } from "@/components/base/combobox/combobox";
import { searchRoleCatalog } from "@/features/onboarding/roleCatalogClient";
import type { RoleSearchItem } from "@/lib/validations/roleCatalog";
import { normalizeRoleTitle } from "@/services/matching/roleText";

type Result = { status: "idle" | "loading" } | { status: "error" } | { status: "ready"; items: RoleSearchItem[] };
export function RoleCatalogSearch({ selected, selectedIds = [], onAdd }: { selected: string[]; selectedIds?: string[]; onAdd: (title: string) => void }) {
  const [query, setQuery] = useState(""); const [revision, setRevision] = useState(0);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; result: Result } | null>(null);
  const term = query.trim(); const key = `${revision}:${term}`;
  const result: Result = term.length < 2 || term.length > 120 || term.includes(";") ? { status: "idle" } : loaded?.key === key ? loaded.result : { status: "loading" };
  useEffect(() => {
    if (term.length < 2 || term.length > 120 || term.includes(";")) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void searchRoleCatalog(term, controller.signal).then((data) => {
        if (!controller.signal.aborted) setLoaded({ key, result: { status: "ready", items: data.items } });
      }).catch(() => { if (!controller.signal.aborted) setLoaded({ key, result: { status: "error" } }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term, key]);
  const items = result.status === "ready" ? result.items : [];
  const keys = new Set(selected.map(normalizeRoleTitle));
  const canAdd = term.length >= 2 && term.length <= 120 && !term.includes(";") && !keys.has(normalizeRoleTitle(term));
  const options: RoleSearchItem[] = canAdd ? [...items, { id: "custom-title", title: term, isco: "" }] : items;
  return <div className="space-y-2">
    <ComboBox<RoleSearchItem> key={selectionRevision} autoFocus={selectionRevision > 0} label="Add a role" placeholder="Search titles or abbreviations, e.g. SWE" items={options} inputValue={query}
      onInputChange={setQuery} value={null} onChange={(id) => { const item = options.find((row) => row.id === id); if (item) { onAdd(item.title); setQuery(""); setSelectionRevision((value) => value + 1); } }}
      allowsCustomValue disabledKeys={items.filter((row) => selectedIds.includes(row.id) || keys.has(normalizeRoleTitle(row.title))).map((row) => row.id)}
      className="[&_[role=group]]:min-h-11" popoverClassName="[&_[role=option]]:min-h-11"
      emptyMessage={result.status === "loading" ? "Searching occupations…" : result.status === "error" ? "Search unavailable" : term.length < 2 ? "Type at least two characters" : "No matching occupation. You can add a custom title."}>
      {(item) => <ComboBoxItem id={item.id} textValue={item.title}><span className="min-w-0 whitespace-normal break-words"><span className="block text-body-medium">{item.id === "custom-title" ? `Use custom title: ${item.title}` : item.title}</span>{item.matchedAlias && <span className="block text-caption-1-regular text-text-secondary">Also known as {item.matchedAlias}</span>}</span></ComboBoxItem>}
    </ComboBox>
    {result.status === "loading" && <p role="status" className="text-caption-1-regular text-text-secondary">Searching occupations…</p>}
    {result.status === "error" && <div role="alert" className="flex flex-wrap items-center gap-2"><p className="text-body-2-regular text-text-secondary">Role search is unavailable.</p><Button variant="ghost" size="small" className="min-h-11" onClick={() => setRevision((value) => value + 1)}>Retry search</Button></div>}
    {term.length > 120 || term.includes(";") ? <p role="alert" className="text-body-2-regular text-text-error-primary">Add one title at a time, up to 120 characters.</p> : null}
  </div>;
}
