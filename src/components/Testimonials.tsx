import { Star } from "@phosphor-icons/react/dist/ssr";

export function Testimonials() {
  const testimonials = [
    {
      name: "Tobi A.",
      role: "Software Engineer",
      location: "Abuja",
      quote: "Hunt Deck tailored my resume perfectly for a Senior Frontend role. I got the interview the next day. It completely removed the anxiety of rewriting my CV.",
      highlight: false,
    },
    {
      name: "Sarah M.",
      role: "Product Manager",
      location: "London",
      quote: "The interview prep is uncanny. It asked me three behavioral questions that actually came up in my final round. Worth every penny.",
      highlight: true, // One card uses lime-green accent background
    },
    {
      name: "David K.",
      role: "Marketing Director",
      location: "Remote",
      quote: "I was pivoting industries and struggling to position myself. The tailored cover letters bridged the gap flawlessly. Saved me hours.",
      highlight: false,
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-[var(--color-bg-secondary)] border-y border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="font-display font-semibold text-4xl sm:text-5xl text-text-primary mb-6">
            Real job seekers. Real results.
          </h2>
          {/* WARNING BANNER FOR LAUNCH */}
          <div className="inline-block bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-medium px-4 py-2 rounded-md">
            Warning: Placeholder testimonials. Replace with real user quotes before launch.
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className={`p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                testimonial.highlight 
                  ? "bg-accent border-accent text-bg-dark shadow-[0_10px_30px_rgba(180,236,91,0.15)]" 
                  : "bg-surface border-border text-text-primary hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
              }`}
            >
              <div className="flex items-center gap-1 mb-6 text-yellow-400">
                <Star weight="fill" size={18} />
                <Star weight="fill" size={18} />
                <Star weight="fill" size={18} />
                <Star weight="fill" size={18} />
                <Star weight="fill" size={18} />
              </div>
              
              <p className={`text-[17px] leading-[1.6] mb-8 font-medium ${testimonial.highlight ? "text-bg-dark" : "text-text-primary"}`}>
                &quot;{testimonial.quote}&quot;
              </p>
              
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${testimonial.highlight ? "bg-bg-dark/10" : "bg-bg-primary"}`}>
                  {testimonial.name[0]}
                </div>
                <div>
                  <p className="font-bold text-[15px]">{testimonial.name}</p>
                  <p className={`text-[13px] font-medium ${testimonial.highlight ? "text-bg-dark/70" : "text-text-secondary"}`}>
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
