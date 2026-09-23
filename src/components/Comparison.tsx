"use client";

import { Check, X } from "@phosphor-icons/react";
import { useGsapReveal } from "@/hooks/useGsapReveal";

const features = [
  { name: "Job matching by resume fit", huntDeck: true, diy: false, generic: false },
  { name: "Tailored resume per job", huntDeck: true, diy: false, generic: false },
  { name: "ATS-optimised output", huntDeck: true, diy: false, generic: false },
  { name: "Role-specific interview prep", huntDeck: true, diy: false, generic: false },
  { name: "Application tracker", huntDeck: true, diy: false, generic: false },
  { name: "All in one place", huntDeck: true, diy: false, generic: false },
];

export function Comparison() {
  const headerRef = useGsapReveal<HTMLDivElement>({
    preset: "fade-up",
    single: true,
    duration: 0.65,
    start: "top 88%",
  });

  const tableRef = useGsapReveal<HTMLDivElement>({
    preset: "scale-up",
    single: true,
    duration: 0.7,
    start: "top 85%",
  });

  return (
    <section className="py-24 sm:py-32 bg-[#FAF7F0] border-b border-[#E5E1D8]/60">
      <div className="max-w-[900px] mx-auto px-6">
        <div ref={headerRef} className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2D5F8A] inline-block px-3 py-1 rounded-full bg-white border border-[#E5E1D8] mb-4">
            Why Hunt Deck
          </span>
          <h2
            className="text-3xl sm:text-5xl font-bold text-[#16213A] leading-[1.12] tracking-[-0.02em]"
            style={{ textWrap: "balance" }}
          >
            A smarter alternative to <span className="font-serif italic font-normal text-[#2D5F8A]">doing it yourself</span>
          </h2>
        </div>

        <div
          ref={tableRef}
          className="overflow-x-auto rounded-2xl border border-[#E5E1D8] shadow-xl shadow-[#16213A]/5 bg-white"
        >
          <table className="w-full text-left border-collapse min-w-[560px]" aria-label="Hunt Deck comparison with DIY spreadsheets and generic AI">
            <thead>
              <tr className="border-b border-[#E5E1D8] bg-[#FAF7F0]/40">
                <th scope="col" className="p-6 w-2/5 text-sm font-bold text-[#16213A]">Key Capabilities</th>
                <th scope="col" className="p-6 text-center bg-[#16213A] text-white">
                  <div className="flex flex-col items-center">
                    <span className="text-base font-bold">Hunt Deck</span>
                    <span className="text-xs text-white/80 font-semibold uppercase tracking-wider mt-0.5">All-in-One Engine</span>
                  </div>
                </th>
                <th scope="col" className="p-6 text-center">
                  <span className="text-sm font-bold text-[#5B6478]">DIY / Spreadsheets</span>
                </th>
                <th scope="col" className="p-6 text-center">
                  <span className="text-sm font-bold text-[#5B6478]">Generic AI Tools</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
                <tr
                  key={i}
                  className="group border-b border-[#E5E1D8] last:border-0 hover:bg-[#FAF7F0]/60 transition-colors"
                >
                  <td className="p-6 text-sm font-bold text-[#16213A] group-hover:text-[#2D5F8A] transition-colors">
                    {feature.name}
                  </td>

                  {/* Hunt Deck Column (Highlighted) */}
                  <td className="p-6 text-center bg-[#16213A]/5 border-x border-[#16213A]/10 group-hover:bg-[#16213A]/8 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-[#16213A] text-white flex items-center justify-center mx-auto shadow-xs transition-transform duration-300 group-hover:scale-110" aria-label="Included in Hunt Deck">
                      <Check size={16} weight="bold" />
                      <span className="sr-only">Included</span>
                    </div>
                  </td>

                  {/* DIY */}
                  <td className="p-6 text-center text-[#5B6478]">
                    <div className="w-7 h-7 rounded-full bg-[#FAF7F0] border border-[#D5D0C5] text-[#5B6478] flex items-center justify-center mx-auto" aria-label="Not included in DIY / Spreadsheets">
                      <X size={15} weight="bold" />
                      <span className="sr-only">Not included</span>
                    </div>
                  </td>

                  {/* Generic AI */}
                  <td className="p-6 text-center text-[#5B6478]">
                    <div className="w-7 h-7 rounded-full bg-[#FAF7F0] border border-[#D5D0C5] text-[#5B6478] flex items-center justify-center mx-auto" aria-label="Not included in Generic AI Tools">
                      <X size={15} weight="bold" />
                      <span className="sr-only">Not included</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
