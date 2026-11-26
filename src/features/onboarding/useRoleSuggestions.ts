"use client";
import { useEffect, useState } from "react";
import type { ResumeParsedData } from "@/lib/validations/resume";
import type { RoleSuggestion } from "@/lib/validations/roleCatalog";
import { loadRoleSuggestions, reviewedRoleProfile } from "./roleCatalogClient";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; suggestions: RoleSuggestion[] };
export function useRoleSuggestions(resume: ResumeParsedData | undefined, skills: string[]) {
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; state: State } | null>(null);
  let profileJson = "";
  try { profileJson = JSON.stringify(reviewedRoleProfile(resume, skills)); } catch { /* Report a fixed message below; never expose validation values. */ }
  const key = `${revision}:${profileJson}`;
  useEffect(() => {
    if (!profileJson) return;
    const controller = new AbortController();
    void loadRoleSuggestions(JSON.parse(profileJson), controller.signal).then((data) => {
      if (!controller.signal.aborted) setLoaded({ key, state: { status: "ready", suggestions: data.suggestions } });
    }).catch((error) => { if (!controller.signal.aborted) setLoaded({ key, state: { status: "error", message: error instanceof Error ? error.message : "Role suggestions could not be loaded. Please retry." } }); });
    return () => controller.abort();
  }, [profileJson, key]);
  const state: State = !profileJson ? { status: "error", message: "Some profile details could not be used for suggestions. You can still search or add roles." }
    : loaded?.key === key ? loaded.state : { status: "loading" };
  return { state, retry: () => setRevision((value) => value + 1) };
}
