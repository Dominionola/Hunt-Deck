import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Candidate Setup | Hunt Deck",
  description: "Calibrate your master career profile, verified skills, and vector fit scores with Hunt Deck.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF7F0] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(45,95,138,0.06),rgba(250,247,240,0))] font-sans text-[#16213A] selection:bg-[#2D5F8A]/15 selection:text-[#16213A]">
      <header className="sticky top-0 z-40 border-b border-[#E5E1D8]/80 bg-white/85 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold tracking-tight text-[#16213A] hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16213A] text-xs font-bold text-white shadow-2xs">
                HD
              </span>
              <span className="text-base font-bold">Hunt Deck</span>
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-[#E5E1D8]" aria-hidden="true" />
            <span className="hidden sm:inline-flex items-center rounded-full bg-[#FAF7F0] px-2.5 py-0.5 text-[11px] font-medium text-[#5B6478] border border-[#E5E1D8]">
              Candidate Setup
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-[#5B6478] hover:text-[#16213A] transition-colors py-1 px-2.5 rounded-lg hover:bg-black/5"
            >
              Exit to Dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
