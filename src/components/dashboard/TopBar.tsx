"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RiMenuLine, RiSearchLine, RiUserLine, RiLogoutBoxLine, RiArrowDownSLine } from "@remixicon/react";
import { useDashboard } from "./DashboardContext";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { Dropdown, DropdownDivider, DropdownPopover, DropdownTrigger } from "@/components/base/dropdown/dropdown";
import { Kbd } from "@/components/base/kbd/kbd";
import { cx } from "@/utils/cx";

export function TopBar() {
  const { user, openCommandPalette, toggleMobileMenu } = useDashboard();
  const router = useRouter();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = user.name?.trim() || user.email;
  const initials = (user.name?.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("") || user.email.slice(0, 1)).toUpperCase();
  const handleSignOut = async () => {
    setSigningOut(true); setError(null);
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!response.ok) throw new Error();
      router.replace("/login"); router.refresh();
    } catch { setError("Sign-out failed. Please retry."); setSigningOut(false); }
  };
  return <header className="sticky top-0 z-30 flex min-h-16 w-full items-center justify-between gap-4 border-b border-separator-border bg-background-primary-default/85 px-4 py-2 backdrop-blur-md sm:px-6 lg:px-8">
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Button variant="ghost" iconOnly leadingIcon={RiMenuLine} className="min-h-11 min-w-11 lg:hidden" onClick={toggleMobileMenu} aria-label="Open sidebar menu" />
      <Button variant="secondary" className="min-h-11 min-w-0 sm:w-80 sm:justify-start" leadingIcon={RiSearchLine} onClick={openCommandPalette}>
        <span className="inline-flex items-center gap-2.5">
          <span>Search opportunities</span>
          <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
        </span>
      </Button>
    </div>
    <Dropdown isOpen={profileDropdownOpen} onOpenChange={setProfileDropdownOpen}>
      <DropdownTrigger className="flex min-h-11 min-w-11 items-center gap-2 rounded-xl px-2 text-start outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring" aria-label="User profile menu">
        <Avatar size="md" color="blue" initials={initials} aria-hidden="true" />
        <span className="hidden max-w-40 truncate text-body-medium text-text-primary md:block">{name}</span>
        <RiArrowDownSLine aria-hidden="true" className={cx("size-4 text-foreground-icon-secondary motion-safe:transition-transform", profileDropdownOpen && "rotate-180")} />
      </DropdownTrigger>
      <DropdownPopover aria-label="User profile menu" placement="bottom end" offset={8}>
        <div className="max-w-72 px-3 py-2"><p className="truncate text-body-medium text-text-primary">{name}</p><p dir="ltr" className="mt-1 truncate text-body-2-regular text-text-secondary">{user.email}</p></div>
        <DropdownDivider />
        <ButtonLink href="/dashboard/resume" variant="ghost" leadingIcon={RiUserLine} className="min-h-11 w-full justify-start" onClick={() => setProfileDropdownOpen(false)}>Master profile</ButtonLink>
        <Button variant="ghost" leadingIcon={RiLogoutBoxLine} className="min-h-11 w-full justify-start" disabled={signingOut} onClick={handleSignOut}>{signingOut ? "Signing out…" : "Sign out"}</Button>
        {error && <p role="alert" className="max-w-64 px-3 py-2 text-body-2-regular text-text-error-primary">{error}</p>}
      </DropdownPopover>
    </Dropdown>
  </header>;
}
