import { Star } from "@phosphor-icons/react/dist/ssr";

export function Testimonials() {
  const testimonials = [
    {
      name: "Tobi A.",
      role: "Software Engineer",
      location: "Abuja",
      initial: "T",
      quote: "Hunt Deck tailored my resume perfectly for a Senior Frontend role. I got the interview the next day. It completely removed the anxiety of rewriting my CV.",
      highlight: false,
    },
    {
      name: "Sarah M.",
      role: "Product Manager",
      location: "London",
      initial: "S",
      quote: "The interview prep is uncanny. It asked me three behavioral questions that actually came up in my final round. Worth every penny.",
      highlight: true,
    },
    {
      name: "David K.",
      role: "Marketing Director",
      location: "Remote",
      initial: "D",
      quote: "I was pivoting industries and struggling to position myself. The tailored cover letters bridged the gap flawlessly. Saved me hours.",
      highlight: false,
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-[var(--color-bg-secondary)] border-y border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16 sm:mb-20">
          <span className="font-sans font-medium text-[12px] tracking-[0.12em] uppercase text-[var(--color-accent)] mb-4 block">
            Testimonials
          </span>
          <h2 className="font-display font-semibold text-4xl sm:text-5xl text-white mb-4" style={{ textWrap: "balance" }}>
            Real job seekers. Real results.
          </h2>
          {/* NOTE: Replace with real user quotes before launch — not shown to users in prod */}
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className={`p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                testimonial.highlight 
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] shadow-[0_10px_30px_rgba(180,236,91,0.2)]" 
                  : "bg-[var(--color-surface)] border-[var(--color-border)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] hover:border-[var(--color-border)]"
              }`}
            >
              {/* Stars */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, si) => (
                  <Star key={si} weight="fill" size={16} className={testimonial.highlight ? "text-[var(--color-bg-dark)]" : "text-yellow-400"} />
                ))}
              </div>
              
              {/* Quote */}
              <p className={`text-[17px] leading-[1.7] mb-8 ${testimonial.highlight ? "text-[var(--color-bg-dark)] font-medium" : "text-white"}`}>
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] ${
                  testimonial.highlight 
                    ? "bg-[var(--color-bg-dark)]/15 text-[var(--color-bg-dark)]" 
                    : "bg-[var(--color-bg-primary)] text-[var(--color-accent)]"
                }`}>
                  {testimonial.initial}
                </div>
                <div>
                  <p className={`font-semibold text-[15px] ${testimonial.highlight ? "text-[var(--color-bg-dark)]" : "text-white"}`}>
                    {testimonial.name}
                  </p>
                  <p className={`text-[14px] font-medium ${testimonial.highlight ? "text-[var(--color-bg-dark)]/70" : "text-[#90A5B4]"}`}>
                    {testimonial.role} &middot; {testimonial.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
