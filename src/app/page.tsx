import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { Audience } from "@/components/Audience";
import { Testimonials } from "@/components/Testimonials";
import { Comparison } from "@/components/Comparison";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Navigation />
      
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <Features />
        <Audience />
        <Testimonials />
        <Comparison />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
