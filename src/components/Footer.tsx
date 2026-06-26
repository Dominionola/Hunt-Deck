import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[var(--color-bg-dark)] border-t border-[var(--color-border)]/50 py-16">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
        
        <Link href="/" className="font-display font-bold text-3xl tracking-wider text-text-primary mb-8">
          HUNT DECK
        </Link>

        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-12">
          <Link href="#how-it-works" className="text-text-secondary hover:text-text-primary transition-colors text-[15px] font-medium">
            How it works
          </Link>
          <Link href="#features" className="text-text-secondary hover:text-text-primary transition-colors text-[15px] font-medium">
            Features
          </Link>
          <Link href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors text-[15px] font-medium">
            Pricing
          </Link>
          <Link href="/privacy" className="text-text-secondary hover:text-text-primary transition-colors text-[15px] font-medium">
            Privacy
          </Link>
          <Link href="/terms" className="text-text-secondary hover:text-text-primary transition-colors text-[15px] font-medium">
            Terms
          </Link>
        </nav>

        <div className="text-text-secondary/50 text-[13px] text-center">
          &copy; {new Date().getFullYear()} Hunt Deck. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
