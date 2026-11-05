import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Onboarding — Hunt Deck",
  description: "Set up your career profile with Hunt Deck.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF7F0] font-sans text-[#16213A] selection:bg-[#2D5F8A]/10">
      <header className="border-b border-[#E5E1D8] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16213A] text-xs font-bold text-white">HD</span>
            <span>Hunt Deck</span>
          </Link>
          <a href="mailto:support@huntdeck.com" className="text-xs font-medium text-[#5B6478] hover:text-[#16213A]">Need help?</a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
