import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Audience } from "@/components/Audience";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { FeatureSpotlight } from "@/components/FeatureSpotlight";
import { Testimonials } from "@/components/Testimonials";
import { Comparison } from "@/components/Comparison";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="landing-page min-h-screen bg-white">
      {/* Section 1 — Nav (sticky, overlaid on hero) */}
      <Navigation />

      <main className="overflow-x-clip">
        {/* Section 2 — Hero with trust strip + stats inside photo */}
        <Hero />

        {/* Section 3 — Who this is for */}
        <Audience />

        {/* Section 4 — How it works (4 steps + UI snippets) */}
        <HowItWorks />

        {/* Section 5 — Feature bento grid */}
        <Features />

        {/* Section 6 — Split feature spotlight (3 alternating rows) */}
        <FeatureSpotlight />

        {/* Section 7 — Testimonials */}
        <Testimonials />

        {/* Section 8 — Comparison table */}
        <Comparison />

        {/* Section 9 — FAQ accordion */}
        <FAQ />

        {/* Section 10 — Final CTA (photo background) */}
        <FinalCTA />
      </main>

      {/* Section 11 — Footer */}
      <Footer />
    </div>
  );
}
